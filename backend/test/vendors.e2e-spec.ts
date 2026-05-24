import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// Idempotency note (P3 correction): category name and vendor taxId have UNIQUE
// constraints. We tag both with a per-run value (`tag = Date.now()`) so the suite
// is re-runnable without manual DB cleanup. Duplicate-rejection tests reuse the
// SAME tagged value so they still hit 409 within the same run.

describe('Vendors (e2e)', () => {
  let app: INestApplication;
  let procurementToken: string;
  let managerToken: string;
  let employeeToken: string;

  const tag = Date.now();
  const categoryName = `IT Equipment ${tag}`;
  const taxId = String(tag); // 13 digits, fits the MaxLength(20) constraint

  let categoryId: number;
  let vendorId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();

    const procRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'procurement@company.com', password: 'Password123' })
      .expect(201);
    procurementToken = procRes.body.access_token;

    const mgrRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager@company.com', password: 'Password123' })
      .expect(201);
    managerToken = mgrRes.body.access_token;

    const empRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'employee@company.com', password: 'Password123' })
      .expect(201);
    employeeToken = empRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  // --- Vendor Categories ---

  it('POST /api/v1/vendor-categories — PO creates category', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/vendor-categories')
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ name: categoryName })
      .expect(201);

    expect(res.body.name).toBe(categoryName);
    categoryId = res.body.id;
  });

  it('POST /api/v1/vendor-categories — duplicate name → 409', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/vendor-categories')
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ name: categoryName })
      .expect(409);
  });

  it('GET /api/v1/vendor-categories — employee (authenticated) → 200 array', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/vendor-categories')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/v1/vendor-categories — employee → 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/vendor-categories')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ name: `Forbidden Category ${tag}` })
      .expect(403);
  });

  // --- Vendors CRUD ---

  it('POST /api/v1/vendors — PO creates vendor', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/vendors')
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({
        name: `บริษัท ไอทีซัพพลาย จำกัด ${tag}`,
        taxId,
        email: 'contact@itsupply.co.th',
        phone: '02-123-4567',
        categoryIds: [categoryId],
      })
      .expect(201);

    expect(res.body.name).toBe(`บริษัท ไอทีซัพพลาย จำกัด ${tag}`);
    expect(res.body.isBlacklisted).toBe(false);
    expect(res.body.categories).toHaveLength(1);
    vendorId = res.body.id;
  });

  it('POST /api/v1/vendors — duplicate taxId → 409', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/vendors')
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ name: `Dup Vendor ${tag}`, taxId })
      .expect(409);
  });

  it('POST /api/v1/vendors — employee → 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/vendors')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ name: `Forbidden Vendor ${tag}` })
      .expect(403);
  });

  it('GET /api/v1/vendors — PO → 200, data array, meta page/limit', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/vendors')
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20 });
  });

  it('GET /api/v1/vendors — manager → 200, data array', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/vendors')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/v1/vendors — employee → 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/vendors')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);
  });

  it('GET /api/v1/vendors?isBlacklisted=false — all returned are not blacklisted', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/vendors?isBlacklisted=false')
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    for (const vendor of res.body.data) {
      expect(vendor.isBlacklisted).toBe(false);
    }
  });

  it('GET /api/v1/vendors/:id — returns vendor with categories', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/vendors/${vendorId}`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);

    expect(res.body.id).toBe(vendorId);
    expect(Array.isArray(res.body.categories)).toBe(true);
  });

  it('PATCH /api/v1/vendors/:id — PO updates phone', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/vendors/${vendorId}`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ phone: '02-999-8888' })
      .expect(200);

    expect(res.body.phone).toBe('02-999-8888');
  });

  // --- Blacklist ---

  it('POST /api/v1/vendors/:id/blacklist — PO blacklists', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/vendors/${vendorId}/blacklist`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ reason: 'ส่งสินค้าไม่ตรงสเปค 3 ครั้งติดต่อกัน' })
      .expect(201);

    expect(res.body.isBlacklisted).toBe(true);
    expect(res.body.blacklistReason).toBe('ส่งสินค้าไม่ตรงสเปค 3 ครั้งติดต่อกัน');
  });

  it('POST /api/v1/vendors/:id/blacklist — blacklist again → 400', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/vendors/${vendorId}/blacklist`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ reason: 'ซ้ำ' })
      .expect(400);
  });

  it('DELETE /api/v1/vendors/:id/blacklist — PO removes blacklist', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/vendors/${vendorId}/blacklist`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);

    expect(res.body.isBlacklisted).toBe(false);
    expect(res.body.blacklistReason).toBeNull();
  });

  it('DELETE /api/v1/vendors/:id/blacklist — unblacklist non-blacklisted → 400', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/vendors/${vendorId}/blacklist`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(400);
  });
});
