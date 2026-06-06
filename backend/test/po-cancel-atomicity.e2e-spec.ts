import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { BudgetsService } from '../src/budgets/budgets.service';
import {
  AuthResponse,
  IdResponse,
  BudgetSummaryResponse,
  PurchaseOrderResponse,
} from './types';

// PO.cancel releases the PR's reserved budget INSIDE the cancel transaction. If the release
// fails, the whole cancel must roll back (PO keeps its status, budget stays reserved) instead
// of leaking budget behind a swallowed error. We prove it by spying on releaseReservedAmount
// to throw for one cancel and asserting the business state did not change.
describe('PO.cancel budget release atomicity (e2e)', () => {
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
      .send({ name: `POcancel Atomicity Dept ${tag}` })
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
        email: `emp.pocancel.${tag}@example.com`,
        password: 'pass1234',
        firstName: 'Emp',
        lastName: 'POcancel',
        departmentId: deptId,
      })
      .expect(201);
    const empLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `emp.pocancel.${tag}@example.com`, password: 'pass1234' });
    employeeToken = (empLogin.body as AuthResponse).access_token;

    const mgrReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `mgr.pocancel.${tag}@example.com`,
        password: 'pass1234',
        firstName: 'Mgr',
        lastName: 'POcancel',
        departmentId: deptId,
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${(mgrReg.body as AuthResponse).user.id}/role`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({ role: 'manager' })
      .expect(200);
    const mgrLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `mgr.pocancel.${tag}@example.com`, password: 'pass1234' });
    managerToken = (mgrLogin.body as AuthResponse).access_token;

    const catRes = await request(app.getHttpServer())
      .post('/api/v1/vendor-categories')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ name: `POcancel Atomicity Cat ${tag}` });
    const vendorRes = await request(app.getHttpServer())
      .post('/api/v1/vendors')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ name: `POcancel Atomicity Vendor ${tag}`, taxId: `PC${tag}`, categoryIds: [(catRes.body as IdResponse).id] });
    vendorId = (vendorRes.body as IdResponse).id;
  });

  afterAll(async () => {
    await app.close();
  });

  async function reserved(): Promise<number> {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/budgets/${budgetId}/summary`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    return Number((res.body as BudgetSummaryResponse).reservedAmount);
  }

  async function createApprovedPr(title: string): Promise<number> {
    const draft = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title,
        requiredDate: '2026-12-31',
        items: [{ itemName: 'Laptop', quantity: 2, unit: 'unit', estimatedUnitPrice: 5000 }],
      })
      .expect(201);
    const prId = (draft.body as IdResponse).id;
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

  async function createDraftPo(prId: number): Promise<number> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        prId,
        vendorId,
        expectedDeliveryDate: '2026-12-15',
        items: [{ itemName: 'Laptop', quantity: 2, unit: 'unit', unitPrice: 5000 }], // 10000, delta 0
      })
      .expect(201);
    return (res.body as IdResponse).id;
  }

  // ROLLBACK — release throws → cancel must 500 and leave the PO + reserve untouched.
  it('rolls back PO.cancel when budget release fails (PO stays draft, reserve unchanged)', async () => {
    const prId = await createApprovedPr(`POcancel rollback ${tag}`);
    const poId = await createDraftPo(prId);
    const reservedBefore = await reserved();

    const budgetsService = app.get(BudgetsService);
    const spy = jest
      .spyOn(budgetsService, 'releaseReservedAmount')
      .mockRejectedValueOnce(new Error('release failed (test)'));

    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/cancel`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(500);

    spy.mockRestore();

    const po = await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    expect((po.body as PurchaseOrderResponse).status).toBe('draft'); // status-save rolled back with the failed release
    expect(await reserved()).toBe(reservedBefore); // budget not leaked
  });

  // CONTROL — with release working the same cancel commits, proving the throw (not broken
  // wiring) caused the rollback above.
  it('commits PO.cancel normally when release succeeds (PO cancelled, reserve released)', async () => {
    const prId = await createApprovedPr(`POcancel commit ${tag}`);
    const poId = await createDraftPo(prId);
    const reservedBefore = await reserved();

    const cancelRes = await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/cancel`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(201);
    expect((cancelRes.body as PurchaseOrderResponse).status).toBe('cancelled');

    expect(await reserved()).toBe(reservedBefore - 10000); // PO total released from reserved
  });
});
