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
  let deptId: number;

  // Tag per-run so the fresh dept/users don't collide on unique constraints across re-runs.
  // A fresh dept + its own budget per run means no cross-run reservedAmount accumulation.
  const tag = Date.now();
  const fiscalYear = new Date().getFullYear();

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

    // Procurement officer (seed user) is used for procurement-only ops + dept/budget setup.
    const procRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'procurement@company.com', password: 'Password123' })
      .expect(201);
    procurementToken = procRes.body.access_token;

    // Create a fresh department with its own annual budget so that PR approve
    // (which now reserves budget via budgetsService.reserveAmount) succeeds.
    const deptRes = await request(app.getHttpServer())
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ name: `PR E2E Dept ${tag}` })
      .expect(201);
    deptId = deptRes.body.id;

    await request(app.getHttpServer())
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ departmentId: deptId, fiscalYear, totalAmount: 1000000 })
      .expect(201);

    // Register a fresh employee in that dept, then login.
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `pr-e2e-emp-${tag}@test.com`,
        password: 'Password123',
        firstName: 'PR',
        lastName: 'Employee',
        departmentId: deptId,
      })
      .expect(201);
    const empRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `pr-e2e-emp-${tag}@test.com`, password: 'Password123' })
      .expect(201);
    employeeToken = empRes.body.access_token;

    // Register a fresh manager in that dept, PO upgrades role, then login.
    const mgrReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `pr-e2e-mgr-${tag}@test.com`,
        password: 'Password123',
        firstName: 'PR',
        lastName: 'Manager',
        departmentId: deptId,
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${mgrReg.body.user.id}/role`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ role: 'manager' })
      .expect(200);
    const mgrRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `pr-e2e-mgr-${tag}@test.com`, password: 'Password123' })
      .expect(201);
    managerToken = mgrRes.body.access_token;

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

  it('draft PR returns approvedAt/approvedBy/rejectReason = null', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/purchase-requests/${prId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);
    expect(res.body.approvedAt).toBeNull();
    expect(res.body.approvedBy).toBeNull();
    expect(res.body.rejectReason).toBeNull();
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

  // Gap-closer: requesterName must run on real Postgres to prove TypeORM maps
  // requester.firstName -> first_name *inside* CONCAT_WS (a mock-qb unit test cannot).
  // A mapping failure would 500 (column does not exist), so .expect(200) is itself the mapping proof.
  // employee in this suite = firstName 'PR', lastName 'Employee', middle null => CONCAT_WS = 'PR Employee'.
  it('GET /api/v1/purchase-requests?requesterName= — filters by requester full name (CONCAT_WS ILIKE, real DB)', async () => {
    const full = await request(app.getHttpServer())
      .get('/api/v1/purchase-requests')
      .query({ requesterName: 'PR Employee' })
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);
    expect(full.body.meta.total).toBeGreaterThanOrEqual(1);

    const partial = await request(app.getHttpServer())
      .get('/api/v1/purchase-requests')
      .query({ requesterName: 'Employee' })
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);
    expect(partial.body.meta.total).toBeGreaterThanOrEqual(1);

    // negative control: a name nobody has must return 0 — proves the WHERE actually discriminates
    const none = await request(app.getHttpServer())
      .get('/api/v1/purchase-requests')
      .query({ requesterName: 'NoSuchRequesterZZZ' })
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);
    expect(none.body.meta.total).toBe(0);
  });
});
