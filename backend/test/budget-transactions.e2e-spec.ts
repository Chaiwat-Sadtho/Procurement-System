import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthResponse, IdResponse } from './types';

interface TxnRow {
  prId: number;
  prNumber: string;
  poId: number | null;
  poStatus: string | null;
  amount: number;
  bucket: 'reserved' | 'used';
}

describe('Budget money trail + manager scoping (e2e)', () => {
  let app: INestApplication;
  let poToken: string;
  let employeeToken: string;
  let managerToken: string;

  let deptId: number;
  let budgetId: number;
  let vendorId: number;

  const tag = Date.now();
  const fiscalYear = new Date().getFullYear();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();

    const poRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'procurement@company.com', password: 'Password123' });
    poToken = (poRes.body as AuthResponse).access_token;

    const deptRes = await request(app.getHttpServer())
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ name: `Money Trail Dept ${tag}` })
      .expect(201);
    deptId = (deptRes.body as IdResponse).id;

    const budgetRes = await request(app.getHttpServer())
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ departmentId: deptId, fiscalYear, totalAmount: 500000 })
      .expect(201);
    budgetId = (budgetRes.body as IdResponse).id;

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `emp.trail.${tag}@example.com`,
        password: 'pass1234',
        firstName: 'Emp',
        lastName: 'Trail',
        departmentId: deptId,
      })
      .expect(201);
    const empLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `emp.trail.${tag}@example.com`, password: 'pass1234' });
    employeeToken = (empLogin.body as AuthResponse).access_token;

    const mgrReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `mgr.trail.${tag}@example.com`,
        password: 'pass1234',
        firstName: 'Mgr',
        lastName: 'Trail',
        departmentId: deptId,
      })
      .expect(201);
    const managerUserId = (mgrReg.body as AuthResponse).user.id;
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${managerUserId}/role`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({ role: 'manager' })
      .expect(200);
    const mgrLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `mgr.trail.${tag}@example.com`, password: 'pass1234' });
    managerToken = (mgrLogin.body as AuthResponse).access_token;

    const catRes = await request(app.getHttpServer())
      .post('/api/v1/vendor-categories')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ name: `Trail Cat ${tag}` });
    const vendorRes = await request(app.getHttpServer())
      .post('/api/v1/vendors')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        name: `Trail Vendor ${tag}`,
        taxId: `T${tag}`,
        categoryIds: [(catRes.body as IdResponse).id],
      });
    vendorId = (vendorRes.body as IdResponse).id;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createApprovedPr(title: string, qty: number, price: number): Promise<number> {
    const prRes = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title,
        requiredDate: '2026-12-31',
        items: [{ itemName: 'Item', quantity: qty, unit: 'unit', estimatedUnitPrice: price }],
      })
      .expect(201);
    const prId = (prRes.body as IdResponse).id;
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(201);
    return prId;
  }

  it('lists an approved PR with no PO as a reserved bucket (PR estimate)', async () => {
    const prId = await createApprovedPr(`Trail PR no-PO ${tag}`, 2, 5000);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/budgets/${budgetId}/transactions`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);

    const rows = res.body as TxnRow[];
    const row = rows.find((r) => r.prId === prId);
    expect(row).toBeDefined();
    expect(row!.bucket).toBe('reserved');
    expect(Number(row!.amount)).toBe(10000);
    expect(row!.poId).toBeNull();
  });

  it('flips a PR to used with the PO total after full goods receipt', async () => {
    const prId = await createApprovedPr(`Trail PR with-PO ${tag}`, 1, 8000);

    const poRes = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        prId,
        vendorId,
        expectedDeliveryDate: '2026-12-15',
        items: [{ itemName: 'Item', quantity: 1, unit: 'unit', unitPrice: 8000 }],
      })
      .expect(201);
    const poId = (poRes.body as IdResponse).id;
    const poItemId = (poRes.body as { items: { id: number }[] }).items[0].id;

    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/send`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/acknowledge`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/goods-receipts')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        poId,
        receivedDate: '2026-11-15',
        items: [{ poItemId, receivedQuantity: 1, condition: 'good' }],
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/budgets/${budgetId}/transactions`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);

    const row = (res.body as TxnRow[]).find((r) => r.prId === prId);
    expect(row).toBeDefined();
    expect(row!.bucket).toBe('used');
    expect(Number(row!.amount)).toBe(8000);
    expect(row!.poStatus).toBe('completed');
  });

  it('forbids a manager from another department reading the money trail', async () => {
    const otherDeptRes = await request(app.getHttpServer())
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ name: `Other Dept ${tag}` })
      .expect(201);
    const otherDeptId = (otherDeptRes.body as IdResponse).id;

    const otherMgrReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `mgr.other.${tag}@example.com`,
        password: 'pass1234',
        firstName: 'Other',
        lastName: 'Mgr',
        departmentId: otherDeptId,
      })
      .expect(201);
    const otherMgrId = (otherMgrReg.body as AuthResponse).user.id;
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${otherMgrId}/role`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({ role: 'manager' })
      .expect(200);
    const otherMgrLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `mgr.other.${tag}@example.com`, password: 'pass1234' });
    const otherMgrToken = (otherMgrLogin.body as AuthResponse).access_token;

    await request(app.getHttpServer())
      .get(`/api/v1/budgets/${budgetId}/transactions`)
      .set('Authorization', `Bearer ${otherMgrToken}`)
      .expect(403);
  });

  it('lets the own-department manager read the money trail', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/budgets/${budgetId}/transactions`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
  });

  // review #183 M2: GET /budgets/department/:id เคยเปิดทุก role + ไม่ scope (IDOR)
  it('rejects an employee listing department budgets', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/budgets/department/${deptId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);
  });

  it('forbids a manager listing another department budgets', async () => {
    const scopeDeptRes = await request(app.getHttpServer())
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ name: `Dept Scope ${tag}` })
      .expect(201);
    const scopeDeptId = (scopeDeptRes.body as IdResponse).id;

    await request(app.getHttpServer())
      .get(`/api/v1/budgets/department/${scopeDeptId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(403);
  });

  it('lets the own-department manager list department budgets', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/budgets/department/${deptId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const rows = res.body as Array<{ departmentId: number }>;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((b) => b.departmentId === deptId)).toBe(true);
  });
});
