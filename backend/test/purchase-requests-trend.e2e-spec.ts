import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthResponse, DepartmentResponse, PurchaseRequestResponse } from './types';

interface TrendPoint {
  month: string;
  count: number;
}

describe('Purchase Requests Trend (e2e)', () => {
  let app: INestApplication;
  let procurementToken: string;
  let empAToken: string;
  let mgrAToken: string;
  let empBToken: string;

  const tag = Date.now();
  const fiscalYear = new Date().getFullYear();
  const thisMonth = `${fiscalYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const http = () => request(app.getHttpServer());

  async function login(email: string): Promise<string> {
    const res = await http()
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password123' })
      .expect(201);
    return (res.body as AuthResponse).access_token;
  }
  async function setupDept(name: string): Promise<number> {
    const res = await http()
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ name })
      .expect(201);
    const deptId = (res.body as DepartmentResponse).id;
    await http()
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ departmentId: deptId, fiscalYear, totalAmount: 1000000 })
      .expect(201);
    return deptId;
  }
  async function registerEmployee(email: string, departmentId: number): Promise<string> {
    await http()
      .post('/api/v1/auth/register')
      .send({ email, password: 'Password123', firstName: 'S', lastName: 'T', departmentId })
      .expect(201);
    return login(email);
  }
  async function registerManager(email: string, departmentId: number): Promise<string> {
    const reg = await http()
      .post('/api/v1/auth/register')
      .send({ email, password: 'Password123', firstName: 'M', lastName: 'G', departmentId })
      .expect(201);
    await http()
      .patch(`/api/v1/users/${(reg.body as AuthResponse).user.id}/role`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ role: 'manager' })
      .expect(200);
    return login(email);
  }
  async function createPr(token: string): Promise<number> {
    const res = await http()
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'trend-pr',
        requiredDate: '2025-12-31',
        items: [{ itemName: 'X', quantity: 1, unit: 'unit', estimatedUnitPrice: 1000 }],
      })
      .expect(201);
    return (res.body as PurchaseRequestResponse).id;
  }
  async function getTrend(token: string): Promise<TrendPoint[]> {
    const res = await http()
      .get('/api/v1/purchase-requests/trend')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body as TrendPoint[];
  }
  const last = (t: TrendPoint[]) => t[t.length - 1];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();

    procurementToken = await login('procurement@company.com');
    const deptA = await setupDept(`Trend Dept A ${tag}`);
    const deptB = await setupDept(`Trend Dept B ${tag}`);
    empAToken = await registerEmployee(`trend-empA-${tag}@test.com`, deptA);
    mgrAToken = await registerManager(`trend-mgrA-${tag}@test.com`, deptA);
    empBToken = await registerEmployee(`trend-empB-${tag}@test.com`, deptB);

    await createPr(empAToken); // dept A
    await createPr(empAToken); // dept A
    await createPr(empBToken); // dept B
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 12 zero-filled months oldest->newest', async () => {
    const t = await getTrend(empAToken);
    expect(t).toHaveLength(12);
    expect(last(t).month).toBe(thisMonth);
    expect(t[0].count).toBe(0); // 11 months ago = no PRs
  });

  it('employee sees only own PRs (this month = 2)', async () => {
    const t = await getTrend(empAToken);
    expect(last(t).count).toBe(2);
  });

  it('manager sees whole department, not other departments', async () => {
    const t = await getTrend(mgrAToken);
    expect(last(t).count).toBe(2); // dept A = empA's 2; dept B not included
  });

  it('procurement officer sees all departments', async () => {
    const t = await getTrend(procurementToken);
    expect(last(t).count).toBeGreaterThanOrEqual(3); // empA 2 + empB 1 (+ seed)
  });
});
