import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { Trip } from '../../src/trips/entities/trip.entity';
import { User } from '../../src/users/entities/user.entity';
import { bootstrapTestApp, createVerifiedUser } from './e2e-utils';

describe('Destinations E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let userId: number;
  let tripId: number;
  let tripSlug: string;
  let destinationAId: number;
  let destinationBId: number;
  let api: any;

  beforeAll(async () => {
    const bootstrap = await bootstrapTestApp();
    app = bootstrap.app;
    dataSource = bootstrap.dataSource;
    api = request(app.getHttpServer());

    const auth = await createVerifiedUser(app, dataSource);
    accessToken = auth.accessToken;
    userId = auth.userId;

    const tripResponse = await api
      .post('/trips')
      .auth(accessToken, { type: 'bearer' })
      .send({
        title: 'Destination E2E Trip',
        description: 'Trip used for destination e2e tests',
        destination: 'Japan',
        startCity: 'Tokyo',
        startCityLatitude: 35.6895,
        startCityLongitude: 139.6917,
        startDate: '2026-07-01',
        endDate: '2026-07-20',
      })
      .expect(201);

    tripId = tripResponse.body.id;
    tripSlug = tripResponse.body.slug;
  });

  afterAll(async () => {
    if (tripId) {
      await dataSource.getRepository(Trip).delete({ id: tripId });
    }
    if (userId) {
      await dataSource.getRepository(User).delete({ id: userId });
    }
    await app.close();
  });

  it('POST /trips/:tripId/destinations creates destinations', async () => {
    const destinationA = await api
      .post(`/trips/${tripId}/destinations`)
      .auth(accessToken, { type: 'bearer' })
      .send({
        name: 'Kyoto',
        arrivalDate: '2026-07-05',
        departureDate: '2026-07-08',
        latitude: 35.0116,
        longitude: 135.7681,
      })
      .expect(201);

    destinationAId = destinationA.body.id;

    const destinationB = await api
      .post(`/trips/${tripId}/destinations`)
      .auth(accessToken, { type: 'bearer' })
      .send({
        name: 'Osaka',
        arrivalDate: '2026-07-09',
        departureDate: '2026-07-12',
        latitude: 34.6937,
        longitude: 135.5023,
      })
      .expect(201);

    destinationBId = destinationB.body.id;

    expect(destinationA.body.order).toBe(1);
    expect(destinationB.body.order).toBe(2);
  });

  it('GET /trips/:tripId/destinations lists destinations', async () => {
    const response = await api
      .get(`/trips/${tripId}/destinations`)
      .auth(accessToken, { type: 'bearer' })
      .expect(200);

    const names = (response.body as Array<{ name: string }>).map((destination) => destination.name);
    expect(names).toEqual(expect.arrayContaining(['Tokyo', 'Kyoto', 'Osaka']));
  });

  it('GET /trips/by-slug/:tripSlug/destinations lists destinations', async () => {
    const response = await api
      .get(`/trips/by-slug/${tripSlug}/destinations`)
      .auth(accessToken, { type: 'bearer' })
      .expect(200);

    expect(response.body.some((destination: { name: string }) => destination.name === 'Kyoto')).toBe(true);
  });

  it('PATCH /trips/:tripId/destinations/:id updates a destination', async () => {
    const response = await api
      .patch(`/trips/${tripId}/destinations/${destinationAId}`)
      .auth(accessToken, { type: 'bearer' })
      .send({
        name: 'Kyoto Updated',
        arrivalDate: '2026-07-06',
      })
      .expect(200);

    expect(response.body.name).toBe('Kyoto Updated');
    expect(response.body.arrivalDate).toBe('2026-07-06');
  });

  it('POST /trips/:tripId/destinations/reorder reorders destinations', async () => {
    const response = await api
      .post(`/trips/${tripId}/destinations/reorder`)
      .auth(accessToken, { type: 'bearer' })
      .send({
        sourceId: destinationAId,
        targetId: destinationBId,
      })
      .expect(201);

    const updatedDestinations = response.body as Array<{ id: number; order: number }>;
    const updatedA = updatedDestinations.find((dest) => dest.id === destinationAId);
    const updatedB = updatedDestinations.find((dest) => dest.id === destinationBId);

    expect(updatedA?.order).toBe(2);
    expect(updatedB?.order).toBe(1);
  });

  it('DELETE /trips/:tripId/destinations/:id removes a destination', async () => {
    await api
      .delete(`/trips/${tripId}/destinations/${destinationBId}`)
      .auth(accessToken, { type: 'bearer' })
      .expect(200);

    const response = await api
      .get(`/trips/${tripId}/destinations`)
      .auth(accessToken, { type: 'bearer' })
      .expect(200);

    expect(response.body.some((destination: { id: number }) => destination.id === destinationBId)).toBe(false);
  });
});
