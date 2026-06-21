import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthResponse, DepartmentResponse, PurchaseRequestResponse } from './types';

interface SpendPoint {
  departmentId: number;
  departmentName: string;
  total: number;
}

describe('Purchase Requests Spend-by-department (e2e)', () => {
  let app: INestApplication;
  let procurementToken: string;
  let empAToken: string;
  let mgrAToken: string;
  let empBToken: string;
  let mgrBToken: string;
  let deptAId: number;
  let deptBId: number;

  const tag = Date.now();
  const fiscalYear = new Date().getFullYear();
  const deptAName = `Spend Dept A ${tag}`;
  const deptBName = `Spend Dept B ${tag}`;
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
        title: 'spend-pr',
        requiredDate: '2025-12-31',
        items: [{ itemName: 'X', quantity: 1, unit: 'unit', estimatedUnitPrice: 1000 }],
      })
      .expect(201);
    return (res.body as PurchaseRequestResponse).id;
  }
  async function approve(prId: number, empToken: string, mgrToken: string): Promise<void> {
    await http()
      .post(`/api/v1/purchase-requests/${prId}/submit`)
      .set('Authorization', `Bearer ${empToken}`)
      .expect(201);
    await http()
      .post(`/api/v1/purchase-requests/${prId}/approve`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .expect(201);
  }

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
    deptAId = await setupDept(deptAName);
    deptBId = await setupDept(deptBName);
    empAToken = await registerEmployee(`spend-empA-${tag}@test.com`, deptAId);
    mgrAToken = await registerManager(`spend-mgrA-${tag}@test.com`, deptAId);
    empBToken = await registerEmployee(`spend-empB-${tag}@test.com`, deptBId);
    mgrBToken = await registerManager(`spend-mgrB-${tag}@test.com`, deptBId);

    // dept A: 2 approved (2000) + 1 draft (must NOT count)
    await approve(await createPr(empAToken), empAToken, mgrAToken);
    await approve(await createPr(empAToken), empAToken, mgrAToken);
    await createPr(empAToken); // draft only
    // dept B: 1 approved (1000)
    await approve(await createPr(empBToken), empBToken, mgrBToken);
  });

  afterAll(async () => {
    await app.close();
  });

  it('PO: sums only approved PRs grouped by department (draft excluded)', async () => {
    const res = await http()
      .get('/api/v1/purchase-requests/spend-by-department')
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);
    const body = res.body as SpendPoint[];
    const a = body.find((r) => r.departmentId === deptAId);
    const b = body.find((r) => r.departmentId === deptBId);
    expect(a).toEqual({ departmentId: deptAId, departmentName: deptAName, total: 2000 });
    expect(b).toEqual({ departmentId: deptBId, departmentName: deptBName, total: 1000 });
  });

  it('non-PO (employee) is forbidden', async () => {
    await http()
      .get('/api/v1/purchase-requests/spend-by-department')
      .set('Authorization', `Bearer ${empAToken}`)
      .expect(403);
  });

  it('non-PO (manager) is forbidden', async () => {
    await http()
      .get('/api/v1/purchase-requests/spend-by-department')
      .set('Authorization', `Bearer ${mgrAToken}`)
      .expect(403);
  });
});
