import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuditLogsService } from '../src/audit-logs/audit-logs.service';
import { PrStatus } from '../src/purchase-requests/entities/purchase-request.entity';

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

  const tag = Date.now();
  const fiscalYear = new Date().getFullYear();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuditLogsService)
      .useValue({
        log: jest.fn(async (params: { action: string }) => {
          if (throwOnAction && params.action === throwOnAction) {
            throw new Error(`audit write failed (test) for ${params.action}`);
          }
          return undefined;
        }),
        findAll: jest.fn(async () => ({
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
    poToken = poRes.body.access_token;

    const deptRes = await request(app.getHttpServer())
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ name: `Audit Durability Dept ${tag}` })
      .expect(201);
    deptId = deptRes.body.id;

    const budgetRes = await request(app.getHttpServer())
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ departmentId: deptId, fiscalYear, totalAmount: 500000 })
      .expect(201);
    budgetId = budgetRes.body.id;

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
    employeeToken = empLogin.body.access_token;

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
      .patch(`/api/v1/users/${mgrReg.body.user.id}/role`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({ role: 'manager' })
      .expect(200);
    const mgrLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `mgr.audit.${tag}@example.com`, password: 'pass1234' });
    managerToken = mgrLogin.body.access_token;
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
        items: [{ itemName: 'Laptop', quantity: 2, unit: 'unit', estimatedUnitPrice: 5000 }],
      })
      .expect(201);
    return res.body.id;
  }

  async function getPrStatus(id: number, token: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/purchase-requests/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body.status;
  }

  async function reserved(): Promise<number> {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/budgets/${budgetId}/summary`)
      .set('Authorization', `Bearer ${poToken}`)
      .expect(200);
    return Number(res.body.reservedAmount);
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
});
