import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Purchase Requests (e2e)', () => {
  let app: INestApplication;
  let employeeToken: string;
  let managerToken: string;
  let procurementToken: string;
  let otherEmployeeToken: string;
  let prId: number;

  const createPrBody = {
    title: 'ขอซื้อคอมพิวเตอร์',
    requiredDate: '2025-12-31',
    items: [
      { itemName: 'MacBook Pro', quantity: 1, unit: 'unit', estimatedUnitPrice: 70000 },
    ],
  };

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
    employeeToken = empRes.body.access_token;

    const mgrRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager@company.com', password: 'Password123' })
      .expect(201);
    managerToken = mgrRes.body.access_token;

    const procRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'procurement@company.com', password: 'Password123' })
      .expect(201);
    procurementToken = procRes.body.access_token;

    // Register a second employee (default role = employee) to test cross-user access.
    // Unique email per run keeps re-runs from colliding on the unique constraint.
    const otherRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `pr-e2e-emp2-${Date.now()}@test.com`,
        password: 'Password123',
        firstName: 'Other',
        lastName: 'Employee',
      })
      .expect(201);
    otherEmployeeToken = otherRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/purchase-requests — employee creates draft PR', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send(createPrBody)
      .expect(201);

    expect(res.body.status).toBe('draft');
    expect(res.body.prNumber).toMatch(/^PR-\d{4}-\d{4}$/);
    expect(Number(res.body.totalEstimatedAmount)).toBe(70000);
    expect(res.body.items).toHaveLength(1);

    prId = res.body.id;
  });

  it('POST /api/v1/purchase-requests — rejects empty items array', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ ...createPrBody, items: [] })
      .expect(400);
  });

  it('GET /api/v1/purchase-requests — employee sees own PRs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20 });
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/purchase-requests/:id — employee accesses own PR', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/purchase-requests/${prId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(res.body.id).toBe(prId);
    expect(res.body.items).toBeDefined();
  });

  it('PATCH /api/v1/purchase-requests/:id — employee updates draft PR', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/purchase-requests/${prId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'ขอซื้อคอมพิวเตอร์ (แก้ไข)',
        items: [
          { itemName: 'MacBook Pro', quantity: 2, unit: 'unit', estimatedUnitPrice: 70000 },
        ],
      })
      .expect(200);

    expect(res.body.title).toBe('ขอซื้อคอมพิวเตอร์ (แก้ไข)');
    expect(Number(res.body.totalEstimatedAmount)).toBe(140000);
  });

  it('POST /api/v1/purchase-requests/:id/submit — employee submits', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(201);

    expect(res.body.status).toBe('submitted');
  });

  it('POST /api/v1/purchase-requests/:id/submit — cannot submit twice', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(400);
  });

  it('PATCH /api/v1/purchase-requests/:id — cannot edit submitted PR', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/purchase-requests/${prId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ title: 'ห้ามแก้' })
      .expect(400);
  });

  it('POST /api/v1/purchase-requests/:id/approve — manager approves', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(201);

    expect(res.body.status).toBe('approved');
    expect(res.body.approvedBy).toBeDefined();
    expect(res.body.approvedAt).toBeDefined();
  });

  it('DELETE /api/v1/purchase-requests/:id — cannot delete approved PR', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/purchase-requests/${prId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(400);
  });

  it('full reject flow: create → submit → reject', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send(createPrBody)
      .expect(201);
    const rejectPrId: number = createRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${rejectPrId}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${rejectPrId}/reject`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reason: 'งบประมาณไม่เพียงพอ' })
      .expect(201);

    expect(res.body.status).toBe('rejected');
    expect(res.body.rejectReason).toMatch(/งบประมาณไม่เพียงพอ/);
  });

  it('DELETE /api/v1/purchase-requests/:id — employee deletes own fresh draft', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send(createPrBody)
      .expect(201);
    const freshPrId: number = createRes.body.id;

    await request(app.getHttpServer())
      .delete(`/api/v1/purchase-requests/${freshPrId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(204);
  });

  // --- Access control / role-guard boundaries ---

  it('POST /api/v1/purchase-requests — manager cannot create (RolesGuard 403)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${managerToken}`)
      .send(createPrBody)
      .expect(403);
  });

  it('POST /api/v1/purchase-requests/:id/approve — employee cannot approve (RolesGuard 403)', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/approve`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);
  });

  it('GET /api/v1/purchase-requests/:id — another employee cannot access (403)', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/purchase-requests/${prId}`)
      .set('Authorization', `Bearer ${otherEmployeeToken}`)
      .expect(403);
  });

  it('GET /api/v1/purchase-requests — procurement officer sees all PRs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
  });
});
