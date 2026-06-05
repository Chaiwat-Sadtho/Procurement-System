import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Budget } from '../src/budgets/entities/budget.entity';

// Idempotency note: department name, user emails, vendor category name and vendor taxId
// have UNIQUE constraints, so we tag them per-run (`tag = Date.now()`) to keep the suite
// re-runnable without destructive DB cleanup. A fresh department per run also means fresh
// budget rows, so budget assertions are not polluted by previous runs. afterAll only closes
// the app — no table wipes.

// Audit logs and notifications are written fire-and-forget (`void ...log()`) AFTER the
// transaction commits — see purchase-requests.service.approve() / goods-receipts.service —
// so they may not be persisted yet when the HTTP response returns. Poll the read endpoint
// until the expected row appears instead of reading once and racing the async write
// (condition-based waiting; the budget summary reads stay single-shot because budget rows
// are updated inside the awaited transaction and are never eventually-consistent).
async function waitFor<T>(
  condition: () => Promise<T | undefined | null | false>,
  description: string,
  timeoutMs = 5000,
): Promise<T> {
  const startTime = Date.now();
  for (;;) {
    const result = await condition();
    if (result) return result;
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for ${description} after ${timeoutMs}ms`);
    }
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('Budget reserve/consume + audit + notification (e2e)', () => {
  let app: INestApplication;

  let poToken: string;
  let employeeToken: string;
  let managerToken: string;

  let deptId: number;
  let budgetId: number; // annual budget
  let q2BudgetId: number; // quarterly (Q2) budget
  let vendorId: number;

  let prId: number; // PR #1 (annual)
  let poId: number;
  let poItemId: number;

  let q2PrId: number; // PR #2 (Q2)

  const tag = Date.now();
  const fiscalYear = new Date().getFullYear(); // PR approve uses new Date().getFullYear()

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();

    // 1. Login PO (seed user)
    const poRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'procurement@company.com', password: 'Password123' });
    poToken = poRes.body.access_token;

    // 2. PO creates a fresh department
    const deptRes = await request(app.getHttpServer())
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ name: `Budget Test Dept ${tag}` })
      .expect(201);
    deptId = deptRes.body.id;

    // 3. PO creates the annual budget for the dept
    const budgetRes = await request(app.getHttpServer())
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ departmentId: deptId, fiscalYear, totalAmount: 500000 })
      .expect(201);
    budgetId = budgetRes.body.id;

    // 4. Register an employee in that dept, then login
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `emp.budget.${tag}@example.com`,
        password: 'pass1234',
        firstName: 'Emp',
        lastName: 'Budget',
        departmentId: deptId,
      })
      .expect(201);
    const empLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `emp.budget.${tag}@example.com`, password: 'pass1234' });
    employeeToken = empLogin.body.access_token;

    // 5. Register a manager in that dept, PO upgrades role to manager, then login
    const mgrReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `mgr.budget.${tag}@example.com`,
        password: 'pass1234',
        firstName: 'Mgr',
        lastName: 'Budget',
        departmentId: deptId,
      })
      .expect(201);
    const managerUserId = mgrReg.body.user.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${managerUserId}/role`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({ role: 'manager' })
      .expect(200);

    const mgrLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `mgr.budget.${tag}@example.com`, password: 'pass1234' });
    managerToken = mgrLogin.body.access_token;

    // 6. PO creates a vendor category + vendor (tagged) for later PO creation
    const catRes = await request(app.getHttpServer())
      .post('/api/v1/vendor-categories')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ name: `Budget Cat ${tag}` });

    const vendorRes = await request(app.getHttpServer())
      .post('/api/v1/vendors')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ name: `Budget Vendor ${tag}`, taxId: `B${tag}`, categoryIds: [catRes.body.id] });
    vendorId = vendorRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // --- RESERVE: PR approve reserves the annual budget ---

  it('reserves budget when an approved PR commits funds (reservedAmount === PR total 10000)', async () => {
    const prRes = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: `Budget flow PR #1 ${tag}`,
        requiredDate: '2026-12-31',
        items: [{ itemName: 'Laptop', quantity: 2, unit: 'unit', estimatedUnitPrice: 5000 }],
      })
      .expect(201);
    prId = prRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(201);

    const summary = await request(app.getHttpServer())
      .get(`/api/v1/budgets/${budgetId}/summary`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);

    expect(Number(summary.body.reservedAmount)).toBe(10000);
    expect(Number(summary.body.usedAmount)).toBe(0);
    expect(Number(summary.body.totalAmount)).toBe(500000);
    expect(Number(summary.body.remaining)).toBe(490000);
  });

  // --- REVIEW #2: DB-level uniqueness for annual budgets ---

  it('rejects a duplicate annual budget at the DB level (partial unique index)', async () => {
    // deptId already has one annual budget (created in beforeAll). Insert a second one
    // directly via the DataSource to bypass the service findOne check and prove the DB
    // partial unique index itself rejects it — Postgres treats NULL quarters as distinct,
    // so the composite UNIQUE alone would let this through.
    const dataSource = app.get(DataSource);
    await expect(
      dataSource.getRepository(Budget).insert({
        departmentId: deptId,
        fiscalYear,
        quarter: null,
        totalAmount: 99999,
      }),
    ).rejects.toMatchObject({ code: '23505' });
  });

  // --- AUDIT: PR_SUBMITTED + PR_APPROVED logged ---

  it('records audit logs for PR_SUBMITTED and PR_APPROVED', async () => {
    const actions = await waitFor(
      async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/audit-logs?entityType=PurchaseRequest&entityId=${prId}`)
          .set('Authorization', `Bearer ${poToken}`)
          .expect(200);
        const found = res.body.data.map((log: { action: string }) => log.action) as string[];
        return found.includes('PR_SUBMITTED') && found.includes('PR_APPROVED') ? found : undefined;
      },
      'PR_SUBMITTED + PR_APPROVED audit logs',
    );
    expect(actions).toContain('PR_SUBMITTED');
    expect(actions).toContain('PR_APPROVED');
  });

  // --- NOTIFICATION: employee notified of approval ---

  it('sends a pr_approved notification to the employee', async () => {
    const types = await waitFor(
      async () => {
        const res = await request(app.getHttpServer())
          .get('/api/v1/notifications')
          .set('Authorization', `Bearer ${employeeToken}`)
          .expect(200);
        const found = res.body.data.map((n: { type: string }) => n.type) as string[];
        return found.includes('pr_approved') ? found : undefined;
      },
      'pr_approved notification',
    );
    expect(types).toContain('pr_approved');
  });

  // --- CONSUME (Task 7): GRN releases the reserve and records usedAmount ---

  it('PO creates a PO from the approved PR', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        prId,
        vendorId,
        expectedDeliveryDate: '2026-12-15',
        items: [{ itemName: 'Laptop', quantity: 2, unit: 'unit', unitPrice: 5000 }],
      })
      .expect(201);

    expect(Number(res.body.totalAmount)).toBe(10000);
    poId = res.body.id;
    poItemId = res.body.items[0].id;
  });

  it('sends and acknowledges the PO', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/send`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/acknowledge`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(201);
  });

  it('consumes the budget on full goods receipt (reserved back to 0, used === 10000)', async () => {
    const grnRes = await request(app.getHttpServer())
      .post('/api/v1/goods-receipts')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        poId,
        receivedDate: '2026-11-15',
        items: [{ poItemId, receivedQuantity: 2, condition: 'good' }],
      })
      .expect(201);

    expect(grnRes.body.status).toBe('complete');

    // PO auto-completes
    const poRes = await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${poToken}`);
    expect(poRes.body.status).toBe('completed');

    // budgetsService.consumeAmount ran via the GRN transaction:
    // reserved 10000 released, used += 10000
    const summary = await request(app.getHttpServer())
      .get(`/api/v1/budgets/${budgetId}/summary`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);

    expect(Number(summary.body.reservedAmount)).toBe(0);
    expect(Number(summary.body.usedAmount)).toBe(10000);
    expect(Number(summary.body.remaining)).toBe(490000);

    // GRN_CREATED audit log exists for the GRN (fire-and-forget — poll until written)
    const grnActions = await waitFor(
      async () => {
        const audit = await request(app.getHttpServer())
          .get(`/api/v1/audit-logs?entityType=GoodsReceiptNote&entityId=${grnRes.body.id}`)
          .set('Authorization', `Bearer ${poToken}`)
          .expect(200);
        const found = audit.body.data.map((log: { action: string }) => log.action) as string[];
        return found.includes('GRN_CREATED') ? found : undefined;
      },
      'GRN_CREATED audit log',
    );
    expect(grnActions).toContain('GRN_CREATED');
  });

  // --- QUARTERLY RESERVE (P5-3): a Q2 PR reserves the Q2 row, not the annual row ---

  it('reserves the quarterly (Q2) budget without affecting the annual budget', async () => {
    // PO creates a Q2 budget for the same dept
    const q2Res = await request(app.getHttpServer())
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ departmentId: deptId, fiscalYear, quarter: 2, totalAmount: 200000 })
      .expect(201);
    q2BudgetId = q2Res.body.id;

    // employee creates a Q2 PR (3 x 4000 = 12000)
    const prRes = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: `Budget flow Q2 PR ${tag}`,
        requiredDate: '2026-06-30',
        quarter: 2,
        items: [{ itemName: 'Monitor', quantity: 3, unit: 'unit', estimatedUnitPrice: 4000 }],
      })
      .expect(201);
    q2PrId = prRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${q2PrId}/submit`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${q2PrId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(201);

    // Q2 budget gets the reserve
    const q2Summary = await request(app.getHttpServer())
      .get(`/api/v1/budgets/${q2BudgetId}/summary`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    expect(Number(q2Summary.body.reservedAmount)).toBe(12000);

    // Annual budget is unaffected by the Q2 PR (still reserved 0, used 10000)
    const annualSummary = await request(app.getHttpServer())
      .get(`/api/v1/budgets/${budgetId}/summary`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    expect(Number(annualSummary.body.reservedAmount)).toBe(0);
    expect(Number(annualSummary.body.usedAmount)).toBe(10000);
  });
});
