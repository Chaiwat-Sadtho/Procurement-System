import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  AuthResponse,
  IdResponse,
  PurchaseOrderResponse,
  GoodsReceiptNoteResponse,
  VendorResponse,
  VendorRatingResponse,
  Paginated,
} from './types';

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
  let poItemId: number;
  let deptId: number;

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
    poToken = (poRes.body as AuthResponse).access_token;

    // Fresh department + annual budget so PR approve (which now reserves budget) succeeds.
    const deptRes = await request(app.getHttpServer())
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ name: `PO E2E Dept ${tag}` })
      .expect(201);
    deptId = (deptRes.body as IdResponse).id;

    await request(app.getHttpServer())
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        departmentId: deptId,
        fiscalYear: new Date().getFullYear(),
        totalAmount: 1000000,
      })
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
    employeeToken = (empRes.body as AuthResponse).access_token;

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
      .patch(`/api/v1/users/${(mgrReg.body as AuthResponse).user.id}/role`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({ role: 'manager' })
      .expect(200);
    const mgrRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `po-e2e-mgr-${tag}@test.com`, password: 'Password123' });
    managerToken = (mgrRes.body as AuthResponse).access_token;

    // Setup: สร้าง vendor category + vendor (tag กัน unique conflict)
    const catRes = await request(app.getHttpServer())
      .post('/api/v1/vendor-categories')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ name: `Office Equipment ${tag}` });

    const vendorRes = await request(app.getHttpServer())
      .post('/api/v1/vendors')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        name: `Test Supplier Co. ${tag}`,
        taxId: String(tag),
        categoryIds: [(catRes.body as IdResponse).id],
      });
    vendorId = (vendorRes.body as IdResponse).id;

    // Setup: สร้าง PR → submit → approve
    const prRes = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'ขอซื้อ Laptop สำหรับ E2E test',
        requiredDate: '2025-12-31',
        items: [
          {
            itemName: 'Laptop A',
            quantity: 2,
            unit: 'unit',
            estimatedUnitPrice: 35000,
          },
        ],
      });
    prId = (prRes.body as IdResponse).id;

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
        items: [{ itemName: 'Laptop A', quantity: 2, unit: 'unit', unitPrice: 35000 }],
      })
      .expect(201);

    const body = res.body as PurchaseOrderResponse;
    expect(body.status).toBe('draft');
    expect(body.poNumber).toMatch(/^PO-\d{4}-\d{4}$/);
    expect(Number(body.totalAmount)).toBe(70000);
    poId = body.id;
    poItemId = body.items[0].id;
  });

  it('PO item returns prItemId = null when no prItemId supplied (nullable FK)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    const body = res.body as PurchaseOrderResponse;
    const adHoc = body.items.find((i) => i.prItemId === null);
    expect(adHoc).toBeDefined();
    expect(adHoc?.prItemId).toBeNull();
  });

  it('POST /api/v1/purchase-orders — rejects PO with non-approved PR', async () => {
    // สร้าง draft PR ใหม่ (ไม่ approve)
    const draftPrRes = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'Draft PR',
        requiredDate: '2025-12-31',
        items: [
          {
            itemName: 'Item',
            quantity: 1,
            unit: 'unit',
            estimatedUnitPrice: 1000,
          },
        ],
      });

    await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        prId: (draftPrRes.body as IdResponse).id,
        vendorId,
        expectedDeliveryDate: '2025-12-15',
        items: [{ itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 1000 }],
      })
      .expect(400);
  });

  it('POST /api/v1/purchase-orders/:id/send — transitions to sent', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/send`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(201);
    expect((res.body as PurchaseOrderResponse).status).toBe('sent');
  });

  it('POST /api/v1/purchase-orders/:id/acknowledge — transitions to acknowledged', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/acknowledge`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(201);
    expect((res.body as PurchaseOrderResponse).status).toBe('acknowledged');
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

    const body = res.body as GoodsReceiptNoteResponse;
    expect(body.grnNumber).toMatch(/^GRN-\d{4}-\d{4}$/);
    expect(body.status).toBe('partial');

    // ตรวจสอบ PO status เปลี่ยนเป็น partially_received
    const poRes = await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${poToken}`);
    expect((poRes.body as PurchaseOrderResponse).status).toBe('partially_received');
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

    expect((res.body as GoodsReceiptNoteResponse).status).toBe('complete');

    // ตรวจสอบ PO auto-completed
    const poRes = await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${poToken}`);
    const po = poRes.body as PurchaseOrderResponse;
    expect(po.status).toBe('completed');
    expect(po.actualDeliveryDate).toBe('2025-11-15');
  });

  // --- Vendor Rating ---

  it('GET /api/v1/purchase-orders/:id/rating — returns empty when not yet rated', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${poId}/rating`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    expect(res.body).toEqual({});
  });

  it('POST /api/v1/purchase-orders/:id/ratings — rates vendor after completion', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/ratings`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({ score: 4, comment: 'ส่งของตรงเวลา' })
      .expect(201);

    const body = res.body as VendorRatingResponse;
    expect(body.score).toBe(4);
    expect(body.vendorId).toBe(vendorId);

    // ตรวจสอบ vendor rating_avg อัพเดท
    const vendorRes = await request(app.getHttpServer())
      .get(`/api/v1/vendors/${vendorId}`)
      .set('Authorization', `Bearer ${poToken}`);
    expect(Number((vendorRes.body as VendorResponse).ratingAvg)).toBe(4);
  });

  it('GET /api/v1/vendors/:id/ratings — returns paginated rating history with PO number', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/vendors/${vendorId}/ratings`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);

    const body = res.body as Paginated<VendorRatingResponse>;
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0]).toHaveProperty('purchaseOrder.poNumber');
    expect(body.data[0]).toHaveProperty('ratedBy.fullName');
    expect(body.meta).toMatchObject({ page: 1, limit: 20 });
  });

  it('POST /api/v1/purchase-orders/:id/ratings — cannot rate twice', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/ratings`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({ score: 5 })
      .expect(409);
  });

  it('GET /api/v1/purchase-orders/:id/rating — returns the rating once rated', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${poId}/rating`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    const body = res.body as VendorRatingResponse;
    expect(body.poId).toBe(poId);
    expect(body.score).toBe(4);
    expect(body.vendorId).toBe(vendorId);
  });

  it('GET /api/v1/purchase-orders/:id/rating — 404 for non-existent PO', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/purchase-orders/999999/rating')
      .set('Authorization', `Bearer ${poToken}`)
      .expect(404);
  });

  it('GET /api/v1/purchase-orders/:id/rating — 403 for employee', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${poId}/rating`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);
  });

  it('GET /api/v1/purchase-orders/:id/rating — manager allowed (200)', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${poId}/rating`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
  });

  // --- H3 (review 2026-07-07): PO/GRN read = MANAGER + PROCUREMENT_OFFICER เท่านั้น ---
  // FE routing กัน employee ออกจากหน้า PO/GRN อยู่แล้ว — BE ต้อง mirror ไม่งั้น employee
  // อ่านข้อมูล PR ของคนอื่น (ที่ PR module ห้ามไว้) ผ่าน PO/GRN endpoints ได้

  it('GET /api/v1/purchase-orders — 403 for employee', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);
  });

  it('GET /api/v1/purchase-orders/:id — 403 for employee', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);
  });

  it('GET /api/v1/purchase-orders/:id/goods-receipts — 403 for employee', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${poId}/goods-receipts`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);
  });

  it('GET /api/v1/goods-receipts — 403 for employee', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/goods-receipts')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);
  });

  it('GET /api/v1/goods-receipts/:id — 403 for employee', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/goods-receipts/1')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);
  });

  it('GET /api/v1/purchase-orders — manager allowed (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
  });

  it('GET /api/v1/goods-receipts — manager allowed (200)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/goods-receipts')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
  });

  // --- Queries ---

  it('GET /api/v1/goods-receipts — lists all GRNs with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/goods-receipts')
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    const body = res.body as Paginated<GoodsReceiptNoteResponse>;
    expect(body.data).toBeInstanceOf(Array);
    expect(body.meta).toHaveProperty('total');
  });

  it('GET /api/v1/purchase-orders/:id/goods-receipts — lists GRNs of specific PO', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${poId}/goods-receipts`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    const grns = res.body as GoodsReceiptNoteResponse[];
    expect(grns).toBeInstanceOf(Array);
    expect(grns.length).toBe(2);
  });

  // --- Cancel flow (separate PO) ---

  it('POST /api/v1/purchase-orders/:id/cancel — can cancel draft PO', async () => {
    // สร้าง PR → approve → สร้าง PO draft → cancel
    const pr2Res = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'PR for cancel test',
        requiredDate: '2025-12-31',
        items: [
          {
            itemName: 'Item',
            quantity: 1,
            unit: 'unit',
            estimatedUnitPrice: 500,
          },
        ],
      });
    const pr2Id = (pr2Res.body as IdResponse).id;
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${pr2Id}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`);
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${pr2Id}/approve`)
      .set('Authorization', `Bearer ${managerToken}`);

    const po2Res = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        prId: pr2Id,
        vendorId,
        expectedDeliveryDate: '2025-12-31',
        items: [{ itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 500 }],
      });

    const cancelRes = await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${(po2Res.body as IdResponse).id}/cancel`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(201);

    expect((cancelRes.body as PurchaseOrderResponse).status).toBe('cancelled');
  });

  // --- P4-2: double-PO guard ---

  it('POST /api/v1/purchase-orders — rejects 2nd PO from a PR that already has an active PO', async () => {
    // prId เดิมมี PO (completed) ผูกอยู่แล้ว → สร้าง PO ซ้ำต้องโดน 409
    await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        prId,
        vendorId,
        expectedDeliveryDate: '2025-12-31',
        items: [{ itemName: 'Dup', quantity: 1, unit: 'unit', unitPrice: 100 }],
      })
      .expect(409);
  });

  // --- F2: PATCH update must enforce the budget gate and keep reserved in sync ---

  const getReservedAnnual = async (): Promise<number> => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/budgets/department/${deptId}`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    const annual = (
      res.body as Array<{
        fiscalYear: number;
        quarter: number | null;
        reservedAmount: string;
      }>
    ).find((b) => b.quarter == null && b.fiscalYear === new Date().getFullYear());
    return Number(annual?.reservedAmount ?? 0);
  };

  const freshDraftPo = async (unitPrice: number): Promise<number> => {
    const prRes = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'PR for PO update test',
        requiredDate: '2025-12-31',
        items: [
          {
            itemName: 'Item',
            quantity: 1,
            unit: 'unit',
            estimatedUnitPrice: unitPrice,
          },
        ],
      });
    const newPrId = (prRes.body as IdResponse).id;
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${newPrId}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`);
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${newPrId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`);
    const poRes = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        prId: newPrId,
        vendorId,
        expectedDeliveryDate: '2025-12-31',
        items: [{ itemName: 'Item', quantity: 1, unit: 'unit', unitPrice }],
      })
      .expect(201);
    return (poRes.body as IdResponse).id;
  };

  it('PATCH /api/v1/purchase-orders/:id — rejects an edit that pushes the PO total over the remaining budget, leaving the PO unchanged', async () => {
    const draftPoId = await freshDraftPo(1000);

    await request(app.getHttpServer())
      .patch(`/api/v1/purchase-orders/${draftPoId}`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        items: [{ itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 2000000 }],
      })
      .expect(400);

    // rollback: items/total untouched after the rejected edit
    const after = await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${draftPoId}`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    const body = after.body as PurchaseOrderResponse;
    expect(Number(body.totalAmount)).toBe(1000);
    expect(body.items).toHaveLength(1);
    expect(Number(body.items[0].unitPrice)).toBe(1000);
  });

  it('PATCH /api/v1/purchase-orders/:id — a within-budget edit adjusts the department reserved amount by the total delta', async () => {
    const draftPoId = await freshDraftPo(1000);
    const before = await getReservedAnnual();

    // raise the PO total from 1000 to 5000 (delta +4000), well within the 1,000,000 budget
    await request(app.getHttpServer())
      .patch(`/api/v1/purchase-orders/${draftPoId}`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        items: [{ itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 5000 }],
      })
      .expect(200);

    const afterReserved = await getReservedAnnual();
    expect(afterReserved - before).toBeCloseTo(4000, 2);
  });

  // --- Slice A filters (placed at end of suite: by here poId is completed, a cancelled PO exists
  //     from the cancel-flow test, draft POs exist from the PATCH tests, and exactly the partial +
  //     complete GRNs were created on poId — so every assertion is exercised against real rows) ---

  it('GET /api/v1/purchase-orders?receivable=true — returns only acknowledged/partially_received', async () => {
    // positive fixture: an acknowledged PO with no GRN yet — stays receivable so the
    // positive assertion below is non-vacuous (poId itself was completed earlier in the suite)
    const ackPoId = await freshDraftPo(500);
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${ackPoId}/send`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${ackPoId}/acknowledge`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/v1/purchase-orders?receivable=true&limit=100')
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);

    const rows = (res.body as Paginated<PurchaseOrderResponse>).data;
    expect(rows).toBeInstanceOf(Array);
    // positive: the acknowledged PO we just created IS returned by the filter
    expect(rows.some((po) => po.id === ackPoId && po.status === 'acknowledged')).toBe(true);
    // every returned row is receivable
    for (const po of rows) {
      expect(['acknowledged', 'partially_received']).toContain(po.status);
    }
    // negative control: none of the non-receivable statuses leak through
    const leaked = rows.filter((po) =>
      ['draft', 'sent', 'completed', 'cancelled'].includes(po.status),
    );
    expect(leaked).toHaveLength(0);

    // negative control #2: an unfiltered fetch DOES contain a completed PO that the filter dropped
    const all = await request(app.getHttpServer())
      .get('/api/v1/purchase-orders?limit=100')
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    const allRows = (all.body as Paginated<PurchaseOrderResponse>).data;
    expect(allRows.some((po) => po.status === 'completed')).toBe(true);
  });

  it('GET /api/v1/goods-receipts?status=partial — returns only partial GRNs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/goods-receipts?status=partial&limit=100')
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);

    const rows = (res.body as Paginated<GoodsReceiptNoteResponse>).data;
    expect(rows).toBeInstanceOf(Array);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    for (const grn of rows) {
      expect(grn.status).toBe('partial');
    }
    // symmetric negative control: complete GRNs must NOT appear in the partial set
    expect(rows.some((grn) => grn.status === 'complete')).toBe(false);
  });

  it('GET /api/v1/goods-receipts?status=complete — returns only complete GRNs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/goods-receipts?status=complete&limit=100')
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);

    const rows = (res.body as Paginated<GoodsReceiptNoteResponse>).data;
    expect(rows).toBeInstanceOf(Array);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    for (const grn of rows) {
      expect(grn.status).toBe('complete');
    }
    // the partial GRN created earlier in this suite must NOT appear in the complete set
    expect(rows.some((grn) => grn.status === 'partial')).toBe(false);
  });
});
