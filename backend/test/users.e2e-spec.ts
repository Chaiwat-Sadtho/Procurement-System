import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthResponse, UserResponse } from './types';

describe('Users / Auth security (e2e)', () => {
  let app: INestApplication;
  let employeeToken: string;
  let procurementToken: string;
  let managerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();

    const empRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'employee@company.com', password: 'Password123' })
      .expect(201);
    employeeToken = (empRes.body as AuthResponse).access_token;

    const procRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'procurement@company.com', password: 'Password123' })
      .expect(201);
    procurementToken = (procRes.body as AuthResponse).access_token;

    const mgrRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager@company.com', password: 'Password123' })
      .expect(201);
    managerToken = (mgrRes.body as AuthResponse).access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/users — non-PO (employee) is forbidden', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);
  });

  it('GET /api/v1/users — PO can list users', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);

    const users = res.body as UserResponse[];
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /api/v1/users — Manager can list users (scoped to same department)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const users = res.body as UserResponse[];
    expect(Array.isArray(users)).toBe(true);
    const deptIds = new Set(users.map((u) => u.departmentId));
    expect(deptIds.size).toBe(1);
  });

  it('POST /api/v1/auth/register — ignores role mass-assignment (defaults to employee)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `mass-assign-${Date.now()}@test.com`,
        password: 'Password123',
        firstName: 'Mass',
        lastName: 'Assign',
        departmentId: 1,
        role: 'procurement_officer',
        isActive: false,
      })
      .expect(201);

    expect((res.body as AuthResponse).user.role).toBe('employee');
  });

  it('PATCH /api/v1/auth/me/password — rejects wrong current password', async () => {
    const email = `pw-${Date.now()}@test.com`;
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'Password123',
        firstName: 'Pw',
        lastName: 'Test',
        departmentId: 1,
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/api/v1/auth/me/password')
      .set('Authorization', `Bearer ${(reg.body as AuthResponse).access_token}`)
      .send({ currentPassword: 'WrongPass123', newPassword: 'NewPass123' })
      .expect(401);
  });

  it('deactivated user can no longer log in', async () => {
    const email = `deactivate-${Date.now()}@test.com`;
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'Password123',
        firstName: 'Deact',
        lastName: 'Me',
        departmentId: 1,
      })
      .expect(201);
    const userId = (reg.body as AuthResponse).user.id;

    // PO deactivates the user
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${userId}/status`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ isActive: false })
      .expect(200);

    // Login now rejected
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password123' })
      .expect(401);
  });

  it('PATCH /api/v1/users/:id/status — PO cannot deactivate themselves', async () => {
    // Find the PO's own id from the list
    const list = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);
    const users = list.body as UserResponse[];
    const po = users.find((u) => u.email === 'procurement@company.com');
    if (!po) throw new Error('seed procurement user not found');

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${po.id}/status`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ isActive: false })
      .expect(403);
  });
});
