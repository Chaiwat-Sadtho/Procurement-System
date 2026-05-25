import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// Idempotency note: vendor category name + vendor taxId have UNIQUE constraints,
// so we tag them per-run (`tag = Date.now()`) to keep the suite re-runnable
// without manual DB cleanup. PR/PO/GRN running numbers reset per year and PRs are
// created fresh in each run, so they need no tagging.

describe('PurchaseOrders + GRN (e2e)', () => {
  let app: INestApplication;
  let poToken: string;
  let employeeToken: string;
  let managerToken: string;
  let vendorId: number;
  let prId: number;
  let poId: number;
  let grnId: number;
  let poItemId: number;

  const tag = Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();

    // Login procurement officer (seed user) — used for PO/GRN ops (role-based, dept-agnostic)
    // and for the fresh dept/budget/user setup below.
    const poRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'procurement@company.com', password: 'Password123' });
    poToken = poRes.body.access_token;

    // Fresh department + annual budget so PR approve (which now reserves budget) succeeds.
    const deptRes = await request(app.getHttpServer())
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ name: `PO E2E Dept ${tag}` })
      .expect(201);
    const deptId = deptRes.body.id;

    await request(app.getHttpServer())
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ departmentId: deptId, fiscalYear: new Date().getFullYear(), totalAmount: 1000000 })
      .expect(201);

    // Fresh employee in that dept.
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `po-e2e-emp-${tag}@test.com`,
        password: 'Password123',
        firstName: 'PO',
        lastName: 'Employee',
        departmentId: deptId,
      })
      .expect(201);
    const empRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `po-e2e-emp-${tag}@test.com`, password: 'Password123' });
    employeeToken = empRes.body.access_token;

    // Fresh manager in that dept (role upgraded by PO).
    const mgrReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `po-e2e-mgr-${tag}@test.com`,
        password: 'Password123',
        firstName: 'PO',
        lastName: 'Manager',
        departmentId: deptId,
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${mgrReg.body.user.id}/role`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({ role: 'manager' })
      .expect(200);
    const mgrRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `po-e2e-mgr-${tag}@test.com`, password: 'Password123' });
    managerToken = mgrRes.body.access_token;

    // Setup: สร้าง vendor category + vendor (tag กัน unique conflict)
    const catRes = await request(app.getHttpServer())
      .post('/api/v1/vendor-categories')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ name: `Office Equipment ${tag}` });

    const vendorRes = await request(app.getHttpServer())
      .post('/api/v1/vendors')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ name: `Test Supplier Co. ${tag}`, taxId: String(tag), categoryIds: [catRes.body.id] });
    vendorId = vendorRes.body.id;

    // Setup: สร้าง PR → submit → approve
    const prRes = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'ขอซื้อ Laptop สำหรับ E2E test',
        requiredDate: '2025-12-31',
        items: [
          { itemName: 'Laptop A', quantity: 2, unit: 'unit', estimatedUnitPrice: 35000 },
        ],
      });
    prId = prRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`);

    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`);
  });

  afterAll(async () => {
    await app.close();
  });

  // --- PO State Machine ---

  it('POST /api/v1/purchase-orders — PO creates PO from approved PR', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        prId,
        vendorId,
        expectedDeliveryDate: '2025-12-15',
        items: [
          { itemName: 'Laptop A', quantity: 2, unit: 'unit', unitPrice: 35000 },
        ],
      })
      .expect(201);

    expect(res.body.status).toBe('draft');
    expect(res.body.poNumber).toMatch(/^PO-\d{4}-\d{4}$/);
    expect(Number(res.body.totalAmount)).toBe(70000);
    poId = res.body.id;
    poItemId = res.body.items[0].id;
  });

  it('POST /api/v1/purchase-orders — rejects PO with non-approved PR', async () => {
    // สร้าง draft PR ใหม่ (ไม่ approve)
    const draftPrRes = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'Draft PR', requiredDate: '2025-12-31',
        items: [{ itemName: 'Item', quantity: 1, unit: 'unit', estimatedUnitPrice: 1000 }],
      });

    await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ prId: draftPrRes.body.id, vendorId, expectedDeliveryDate: '2025-12-15', items: [{ itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 1000 }] })
      .expect(400);
  });

  it('POST /api/v1/purchase-orders/:id/send — transitions to sent', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/send`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(201);
    expect(res.body.status).toBe('sent');
  });

  it('POST /api/v1/purchase-orders/:id/acknowledge — transitions to acknowledged', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/acknowledge`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(201);
    expect(res.body.status).toBe('acknowledged');
  });

  // --- GRN: Partial Receipt ---

  it('POST /api/v1/goods-receipts — records partial GRN, PO → partially_received', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/goods-receipts')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        poId,
        receivedDate: '2025-11-10',
        items: [{ poItemId, receivedQuantity: 1, condition: 'good' }],
      })
      .expect(201);

    expect(res.body.grnNumber).toMatch(/^GRN-\d{4}-\d{4}$/);
    expect(res.body.status).toBe('partial');
    grnId = res.body.id;

    // ตรวจสอบ PO status เปลี่ยนเป็น partially_received
    const poRes = await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${poToken}`);
    expect(poRes.body.status).toBe('partially_received');
  });

  // --- GRN: Complete Receipt (auto-complete PO) ---

  it('POST /api/v1/goods-receipts — records remaining GRN, PO auto-completes', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/goods-receipts')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        poId,
        receivedDate: '2025-11-15',
        items: [{ poItemId, receivedQuantity: 1, condition: 'good' }],
      })
      .expect(201);

    expect(res.body.status).toBe('complete');

    // ตรวจสอบ PO auto-completed
    const poRes = await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${poToken}`);
    expect(poRes.body.status).toBe('completed');
    expect(poRes.body.actualDeliveryDate).toBe('2025-11-15');
  });

  // --- Vendor Rating ---

  it('POST /api/v1/purchase-orders/:id/ratings — rates vendor after completion', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/ratings`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({ score: 4, comment: 'ส่งของตรงเวลา' })
      .expect(201);

    expect(res.body.score).toBe(4);
    expect(res.body.vendorId).toBe(vendorId);

    // ตรวจสอบ vendor rating_avg อัพเดท
    const vendorRes = await request(app.getHttpServer())
      .get(`/api/v1/vendors/${vendorId}`)
      .set('Authorization', `Bearer ${poToken}`);
    expect(Number(vendorRes.body.ratingAvg)).toBe(4);
  });

  it('GET /api/v1/vendors/:id/ratings — returns paginated rating history with PO number', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/vendors/${vendorId}/ratings`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);

    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('purchaseOrder.poNumber');
    expect(res.body.data[0]).toHaveProperty('ratedBy.fullName');
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20 });
  });

  it('POST /api/v1/purchase-orders/:id/ratings — cannot rate twice', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/ratings`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({ score: 5 })
      .expect(409);
  });

  // --- Queries ---

  it('GET /api/v1/goods-receipts — lists all GRNs with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/goods-receipts')
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta).toHaveProperty('total');
  });

  it('GET /api/v1/purchase-orders/:id/goods-receipts — lists GRNs of specific PO', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${poId}/goods-receipts`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBe(2);
  });

  // --- Cancel flow (separate PO) ---

  it('POST /api/v1/purchase-orders/:id/cancel — can cancel draft PO', async () => {
    // สร้าง PR → approve → สร้าง PO draft → cancel
    const pr2Res = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ title: 'PR for cancel test', requiredDate: '2025-12-31', items: [{ itemName: 'Item', quantity: 1, unit: 'unit', estimatedUnitPrice: 500 }] });
    await request(app.getHttpServer()).post(`/api/v1/purchase-requests/${pr2Res.body.id}/submit`).set('Authorization', `Bearer ${employeeToken}`);
    await request(app.getHttpServer()).post(`/api/v1/purchase-requests/${pr2Res.body.id}/approve`).set('Authorization', `Bearer ${managerToken}`);

    const po2Res = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ prId: pr2Res.body.id, vendorId, expectedDeliveryDate: '2025-12-31', items: [{ itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 500 }] });

    const cancelRes = await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${po2Res.body.id}/cancel`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(201);

    expect(cancelRes.body.status).toBe('cancelled');
  });

  // --- P4-2: double-PO guard ---

  it('POST /api/v1/purchase-orders — rejects 2nd PO from a PR that already has an active PO', async () => {
    // prId เดิมมี PO (completed) ผูกอยู่แล้ว → สร้าง PO ซ้ำต้องโดน 409
    await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ prId, vendorId, expectedDeliveryDate: '2025-12-31', items: [{ itemName: 'Dup', quantity: 1, unit: 'unit', unitPrice: 100 }] })
      .expect(409);
  });
});
