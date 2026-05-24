import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/register — creates user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'e2e@test.com',
        password: 'Password123',
        firstName: 'John',
        middleName: 'Michael',
        lastName: 'Doe',
      })
      .expect(201);

    expect(res.body).toHaveProperty('access_token');
    expect(res.body.user).toHaveProperty('fullName', 'John Michael Doe');
  });

  it('POST /api/v1/auth/login — returns token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'e2e@test.com', password: 'Password123' })
      .expect(201);

    expect(res.body).toHaveProperty('access_token');
    accessToken = res.body.access_token;
  });

  it('POST /api/v1/auth/login — rejects wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'e2e@test.com', password: 'wrongpassword' })
      .expect(401);
  });

  it('GET /api/v1/auth/me — returns full user (query DB) when authenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('email', 'e2e@test.com');
    expect(res.body).toHaveProperty('fullName', 'John Michael Doe');
    expect(res.body).toHaveProperty('role');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('GET /api/v1/auth/me — rejects unauthenticated', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401);
  });

  it('PATCH /api/v1/auth/me — updates name fields and recomputes fullName', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ middleName: 'Edited' })
      .expect(200);

    expect(res.body).toHaveProperty('fullName', 'John Edited Doe');
    expect(res.body).toHaveProperty('email', 'e2e@test.com');
  });
});
