import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { Trip } from '../../src/trips/entities/trip.entity';
import { User } from '../../src/users/entities/user.entity';
import { bootstrapTestApp, createVerifiedUser } from './e2e-utils';

describe('Trips E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let userId: number;
  let tripId: number | undefined;
  let tripSlug: string | undefined;
  let api: any;

  beforeAll(async () => {
    const bootstrap = await bootstrapTestApp();
    app = bootstrap.app;
    dataSource = bootstrap.dataSource;
    api = request(app.getHttpServer());

    const auth = await createVerifiedUser(app, dataSource);
    accessToken = auth.accessToken;
    userId = auth.userId;
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

  it('POST /trips creates a trip', async () => {
    const response = await api
      .post('/trips')
      .auth(accessToken, { type: 'bearer' })
      .send({
        title: 'E2E Adventure',
        description: 'Trip created by e2e tests',
        destination: 'Paris, France',
        startCity: 'New York, USA',
        startCityLatitude: 40.7128,
        startCityLongitude: -74.006,
        startDate: '2026-07-01',
        endDate: '2026-07-10',
      })
      .expect(201);

    tripId = response.body.id;
    tripSlug = response.body.slug;

    expect(tripId).toBeDefined();
    expect(tripSlug).toBeDefined();
    expect(response.body.title).toBe('E2E Adventure');
  });

  it('GET /trips lists the created trip', async () => {
    const response = await api
      .get('/trips')
      .auth(accessToken, { type: 'bearer' })
      .expect(200);

    const trips = response.body as Array<{ id: number }>;
    expect(trips.some((trip) => trip.id === tripId)).toBe(true);
  });

  it('GET /trips/:slug returns trip with start city destination', async () => {
    const response = await api
      .get(`/trips/${tripSlug}`)
      .auth(accessToken, { type: 'bearer' })
      .expect(200);

    const destinations = response.body.destinations as Array<{ order: number; name: string }>;
    expect(destinations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ order: 0, name: 'New York, USA' }),
      ])
    );
  });

  it('PATCH /trips/:slug updates trip details', async () => {
    const response = await api
      .patch(`/trips/${tripSlug}`)
      .auth(accessToken, { type: 'bearer' })
      .send({
        title: 'E2E Adventure Updated',
        status: 'confirmed',
      })
      .expect(200);

    expect(response.body.title).toBe('E2E Adventure Updated');
    expect(response.body.status).toBe('confirmed');
  });

  it('DELETE /trips/:slug removes the trip', async () => {
    await api
      .delete(`/trips/${tripSlug}`)
      .auth(accessToken, { type: 'bearer' })
      .expect(200);

    await api
      .get(`/trips/${tripSlug}`)
      .auth(accessToken, { type: 'bearer' })
      .expect(404);

    tripId = undefined;
  });
});
