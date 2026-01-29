import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { S3Service } from '../../src/s3/s3.service';
import { EmailVerificationToken } from '../../src/users/entities/email-verification-token.entity';
import { User } from '../../src/users/entities/user.entity';
import { getAltchaHmacKey } from '../../src/common/utils/altcha';

type TestAuth = {
  accessToken: string;
  email: string;
  password: string;
  userId: number;
};

export async function bootstrapTestApp(): Promise<{
  app: INestApplication;
  dataSource: DataSource;
}> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(S3Service)
    .useValue({
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    })
    .compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  await app.init();

  return {
    app,
    dataSource: moduleFixture.get(DataSource),
  };
}

export function buildCaptchaToken(): string {
  const algorithm = 'SHA-256';
  const maxNumber = 100000;
  const saltLength = 12;
  const salt = crypto.randomBytes(saltLength).toString('hex');
  const number = Math.floor(Math.random() * maxNumber);
  const challenge = crypto
    .createHash('sha256')
    .update(salt + number)
    .digest('hex');
  const signature = crypto
    .createHmac('sha256', getAltchaHmacKey())
    .update(challenge)
    .digest('hex');
  const payload = {
    algorithm,
    challenge,
    number,
    salt,
    signature,
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export async function createVerifiedUser(app: INestApplication, dataSource: DataSource): Promise<TestAuth> {
  const email = `e2e.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;
  const password = 'StrongP@ssw0rd12';
  const api: any = request(app.getHttpServer());

  await api
    .post('/authentication/sign-up')
    .send({
      email,
      password,
      firstName: 'E2E',
      lastName: 'User',
      captchaToken: buildCaptchaToken(),
    })
    .expect(200);

  const tokenRepo = dataSource.getRepository(EmailVerificationToken);
  const [verification] = await tokenRepo.find({
    where: { user: { email } },
    relations: ['user'],
    order: { createdAt: 'DESC' },
    take: 1,
  });

  if (!verification) {
    throw new Error(`Email verification token not found for ${email}`);
  }

  await api
    .post('/users/verify-email')
    .send({ token: verification.token })
    .expect(201);

  const signInResponse = await api
    .post('/authentication/sign-in')
    .send({
      email,
      password,
      captchaToken: buildCaptchaToken(),
    })
    .expect(200);

  const userRepo = dataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email } });

  if (!user) {
    throw new Error(`User not found after sign-up: ${email}`);
  }

  return {
    accessToken: signInResponse.body.accessToken,
    email,
    password,
    userId: user.id,
  };
}
