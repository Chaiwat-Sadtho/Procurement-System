import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuditLogsService } from '../src/audit-logs/audit-logs.service';
import { PrStatus } from '../src/purchase-requests/entities/purchase-request.entity';
import {
  AuthResponse,
  IdResponse,
  PurchaseRequestResponse,
  PurchaseOrderResponse,
  BudgetSummaryResponse,
} from './types';

// ADR-0001: the audit row is written INSIDE the business transaction. If the audit write
// fails, the whole action must roll back. We prove that by overriding AuditLogsService.log
// to throw for one targeted action (`throwOnAction`) and asserting the business state did
// not change. The real log() never runs here, so we assert business state (status / budget)
// rather than audit rows — happy-path audit-row writes stay covered by budget-flow.e2e-spec.
let throwOnAction: string | null = null;

describe('Audit durability — rollback on audit failure (e2e)', () => {
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
    })
      .overrideProvider(AuditLogsService)
      .useValue({
        // The 2nd arg (manager) MUST be present: each of the 7 audit call-sites passes the tx
        // EntityManager so the write joins the action's transaction. A call-site that forgot it would
        // make the success/control paths below throw here and fail — locking in the manager-passing.
        log: jest.fn((params: { action: string }, manager?: unknown): void => {
          if (!manager) {
            throw new Error(
              `audit log() called without a transaction manager for ${params.action}`,
            );
          }
          if (throwOnAction && params.action === throwOnAction) {
            throw new Error(`audit write failed (test) for ${params.action}`);
          }
        }),
        findAll: jest.fn(() => ({
          data: [],
          meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
        })),
      })
      .compile();

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
      .send({ name: `Audit Durability Dept ${tag}` })
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
        email: `emp.audit.${tag}@example.com`,
        password: 'pass1234',
        firstName: 'Emp',
        lastName: 'Audit',
        departmentId: deptId,
      })
      .expect(201);
    const empLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `emp.audit.${tag}@example.com`, password: 'pass1234' });
    employeeToken = (empLogin.body as AuthResponse).access_token;

    const mgrReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `mgr.audit.${tag}@example.com`,
        password: 'pass1234',
        firstName: 'Mgr',
        lastName: 'Audit',
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
      .send({ email: `mgr.audit.${tag}@example.com`, password: 'pass1234' });
    managerToken = (mgrLogin.body as AuthResponse).access_token;

    // vendor (tagged) for the PO.create / GRN.create rollback tests
    const catRes = await request(app.getHttpServer())
      .post('/api/v1/vendor-categories')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ name: `Audit Durability Cat ${tag}` });
    const vendorRes = await request(app.getHttpServer())
      .post('/api/v1/vendors')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        name: `Audit Durability Vendor ${tag}`,
        taxId: `AD${tag}`,
        categoryIds: [(catRes.body as IdResponse).id],
      });
    vendorId = (vendorRes.body as IdResponse).id;
  });

  afterEach(() => {
    throwOnAction = null;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createDraftPr(title: string): Promise<number> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title,
        requiredDate: '2026-12-31',
        items: [
          {
            itemName: 'Laptop',
            quantity: 2,
            unit: 'unit',
            estimatedUnitPrice: 5000,
          },
        ],
      })
      .expect(201);
    return (res.body as IdResponse).id;
  }

  async function getPrStatus(id: number, token: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/purchase-requests/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return (res.body as PurchaseRequestResponse).status;
  }

  async function reserved(): Promise<number> {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/budgets/${budgetId}/summary`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    return Number((res.body as BudgetSummaryResponse).reservedAmount);
  }

  async function used(): Promise<number> {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/budgets/${budgetId}/summary`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    return Number((res.body as BudgetSummaryResponse).usedAmount);
  }

  async function createApprovedPr(title: string): Promise<number> {
    const prId = await createDraftPr(title);
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

  // PATTERN B — submit wraps a NEW transaction around status-save + audit.
  it('rolls back PR.submit when the audit write fails (PR stays DRAFT)', async () => {
    const prId = await createDraftPr(`Audit rollback submit ${tag}`);

    throwOnAction = 'PR_SUBMITTED';
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(500);

    expect(await getPrStatus(prId, employeeToken)).toBe(PrStatus.DRAFT);
  });

  // PATTERN A (keystone) — approve already runs status + budget reserve in a tx; audit joins it.
  it('rolls back PR.approve when the audit write fails (PR stays SUBMITTED, budget NOT reserved)', async () => {
    const prId = await createDraftPr(`Audit rollback approve ${tag}`);
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(201);

    const reservedBefore = await reserved();

    throwOnAction = 'PR_APPROVED';
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(500);

    expect(await getPrStatus(prId, managerToken)).toBe(PrStatus.SUBMITTED);
    expect(await reserved()).toBe(reservedBefore); // reserve rolled back with the action
  });

  // CONTROL — with audit working the same approve commits, proving the throw (not broken
  // wiring) caused the rollback above.
  it('commits PR.approve normally when the audit write succeeds (PR APPROVED, budget reserved)', async () => {
    const prId = await createDraftPr(`Audit commit approve ${tag}`);
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(201);

    const reservedBefore = await reserved();

    throwOnAction = null;
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(201);

    expect(await getPrStatus(prId, managerToken)).toBe(PrStatus.APPROVED);
    expect(await reserved()).toBe(reservedBefore + 10000); // 2 × 5000 PR estimate reserved
  });

  // PATTERN A (PO.create) — audit joins the existing create tx, which also adjusts the reserve by
  // the PO-vs-PR delta. A PO total ≠ PR estimate makes the delta observable; critically, the 23505
  // ConflictException catch must NOT mask a thrown audit error (non-23505 → re-throw → 500 → rollback).
  it('rolls back PO.create when the audit write fails (no PO persisted, reserve delta reverted)', async () => {
    const prId = await createApprovedPr(`Audit rollback PO.create ${tag}`);
    const reservedBefore = await reserved(); // PR reserved 10000

    const poBody = {
      prId,
      vendorId,
      expectedDeliveryDate: '2026-12-15',
      items: [{ itemName: 'Laptop', quantity: 2, unit: 'unit', unitPrice: 6000 }], // 12000 → delta +2000
    };

    throwOnAction = 'PO_CREATED';
    await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${poToken}`)
      .send(poBody)
      .expect(500);

    // the reserve-delta (+2000) rolled back with the failed create
    expect(await reserved()).toBe(reservedBefore);

    // and no orphan active PO was left behind — a fresh create succeeds (would 409 if one persisted)
    throwOnAction = null;
    const ok = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${poToken}`)
      .send(poBody)
      .expect(201);
    expect(Number((ok.body as PurchaseOrderResponse).totalAmount)).toBe(12000);
    expect(await reserved()).toBe(reservedBefore + 2000);
  });

  // PATTERN A (GRN.create) — audit joins the GRN tx that also consumes the budget. A failed audit
  // must roll back the consume and leave the PO un-completed (reserved/used unchanged).
  it('rolls back GRN.create when the audit write fails (PO stays acknowledged, budget not consumed)', async () => {
    const prId = await createApprovedPr(`Audit rollback GRN.create ${tag}`);
    const poRes = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        prId,
        vendorId,
        expectedDeliveryDate: '2026-12-15',
        items: [{ itemName: 'Laptop', quantity: 2, unit: 'unit', unitPrice: 5000 }],
      })
      .expect(201);
    const createdPo = poRes.body as PurchaseOrderResponse;
    const poId = createdPo.id;
    const poItemId = createdPo.items[0].id;

    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/send`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/acknowledge`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(201);

    const reservedBefore = await reserved();
    const usedBefore = await used();

    throwOnAction = 'GRN_CREATED';
    await request(app.getHttpServer())
      .post('/api/v1/goods-receipts')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        poId,
        receivedDate: '2026-11-15',
        items: [{ poItemId, receivedQuantity: 2, condition: 'good' }],
      })
      .expect(500);

    // PO not completed and budget not consumed — the consume rolled back with the GRN
    const po = await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    expect((po.body as PurchaseOrderResponse).status).toBe('acknowledged');
    expect(await reserved()).toBe(reservedBefore);
    expect(await used()).toBe(usedBefore);
  });
});
