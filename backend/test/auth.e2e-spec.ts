import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// Idempotency note (test-isolation fix): register + PATCH /me persist to the real
// DB. We tag the email with a per-run value (`tag = Date.now()`) so the suite is
// re-runnable on a dirty DB volume, and tear the user down in afterAll so the table
// does not accumulate test rows across runs.

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;

  const tag = Date.now();
  const email = `e2e-${tag}@test.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();

    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM users WHERE email = $1', [email]);
    await app.close();
  });

  it('POST /api/v1/auth/register — creates user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'Password123',
        firstName: 'John',
        middleName: 'Michael',
        lastName: 'Doe',
        departmentId: 1,
      })
      .expect(201);

    expect(res.body).toHaveProperty('access_token');
    expect(res.body.user).toHaveProperty('fullName', 'John Michael Doe');
  });

  it('POST /api/v1/auth/register — rejects missing departmentId', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: `nodept-${tag}@test.com`, password: 'Password123' })
      .expect(400);
  });

  it('POST /api/v1/auth/login — returns token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password123' })
      .expect(201);

    expect(res.body).toHaveProperty('access_token');
    accessToken = res.body.access_token;
  });

  it('POST /api/v1/auth/login — rejects wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrongpassword' })
      .expect(401);
  });

  it('GET /api/v1/auth/me — returns full user (query DB) when authenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('email', email);
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
    expect(res.body).toHaveProperty('email', email);
  });
});
