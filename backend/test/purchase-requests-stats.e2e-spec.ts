import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthResponse, DepartmentResponse, PurchaseRequestResponse } from './types';

describe('Purchase Requests Stats (e2e)', () => {
  let app: INestApplication;
  let procurementToken: string;
  let empAToken: string;
  let mgrAToken: string;
  let empBToken: string;
  let empCToken: string; // no PRs → empty case

  const tag = Date.now();
  const fiscalYear = new Date().getFullYear();
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
      .send({
        email,
        password: 'Password123',
        firstName: 'S',
        lastName: 'T',
        departmentId,
      })
      .expect(201);
    return login(email);
  }

  async function registerManager(email: string, departmentId: number): Promise<string> {
    const reg = await http()
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'Password123',
        firstName: 'M',
        lastName: 'G',
        departmentId,
      })
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
        title: 'stat-pr',
        requiredDate: '2025-12-31',
        items: [
          {
            itemName: 'X',
            quantity: 1,
            unit: 'unit',
            estimatedUnitPrice: 1000,
          },
        ],
      })
      .expect(201);
    return (res.body as PurchaseRequestResponse).id;
  }

  async function getStats(token: string) {
    const res = await http()
      .get('/api/v1/purchase-requests/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body as {
      total: number;
      draft: number;
      submitted: number;
      approved: number;
      rejected: number;
    };
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

    const deptA = await setupDept(`Stats Dept A ${tag}`);
    const deptB = await setupDept(`Stats Dept B ${tag}`);
    empAToken = await registerEmployee(`stats-empA-${tag}@test.com`, deptA);
    mgrAToken = await registerManager(`stats-mgrA-${tag}@test.com`, deptA);
    empBToken = await registerEmployee(`stats-empB-${tag}@test.com`, deptB);
    empCToken = await registerEmployee(`stats-empC-${tag}@test.com`, deptA);

    // emp A (dept A): draft=1, submitted=1, approved=1, rejected=1
    await createPr(empAToken); // stays draft
    const toSubmit = await createPr(empAToken);
    await http()
      .post(`/api/v1/purchase-requests/${toSubmit}/submit`)
      .set('Authorization', `Bearer ${empAToken}`)
      .expect(201);
    const toApprove = await createPr(empAToken);
    await http()
      .post(`/api/v1/purchase-requests/${toApprove}/submit`)
      .set('Authorization', `Bearer ${empAToken}`)
      .expect(201);
    await http()
      .post(`/api/v1/purchase-requests/${toApprove}/approve`)
      .set('Authorization', `Bearer ${mgrAToken}`)
      .expect(201);
    const toReject = await createPr(empAToken);
    await http()
      .post(`/api/v1/purchase-requests/${toReject}/submit`)
      .set('Authorization', `Bearer ${empAToken}`)
      .expect(201);
    await http()
      .post(`/api/v1/purchase-requests/${toReject}/reject`)
      .set('Authorization', `Bearer ${mgrAToken}`)
      .send({ reason: 'no' })
      .expect(201);

    // emp B (dept B): submitted=1 (เพื่อพิสูจน์ manager A ไม่เห็นแผนกอื่น)
    const bPr = await createPr(empBToken);
    await http()
      .post(`/api/v1/purchase-requests/${bPr}/submit`)
      .set('Authorization', `Bearer ${empBToken}`)
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('employee sees only own PR counts', async () => {
    const s = await getStats(empAToken);
    expect(s).toEqual({
      total: 4,
      draft: 1,
      submitted: 1,
      approved: 1,
      rejected: 1,
    });
  });

  it('manager sees whole-department counts, NOT other departments', async () => {
    const s = await getStats(mgrAToken);
    expect(s.total).toBe(4);
    expect(s.submitted).toBe(1);
  });

  it('procurement officer sees all departments', async () => {
    const s = await getStats(procurementToken);
    expect(s.submitted).toBeGreaterThanOrEqual(2);
    expect(s.total).toBeGreaterThanOrEqual(5);
  });

  it('returns all zeros when user has no PRs', async () => {
    const s = await getStats(empCToken);
    expect(s).toEqual({
      total: 0,
      draft: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
    });
  });
});
