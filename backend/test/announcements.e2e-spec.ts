import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthResponse, AnnouncementResponse, PublicAnnouncementResponse } from './types';

describe('Announcements (e2e)', () => {
  let app: INestApplication;
  let procurementToken: string;
  let managerToken: string;
  let employeeToken: string;

  const tag = Date.now();
  let createdId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();

    const login = async (email: string) =>
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email, password: 'Password123' })
          .expect(201)
      ).body as AuthResponse;

    procurementToken = (await login('procurement@company.com')).access_token;
    managerToken = (await login('manager@company.com')).access_token;
    employeeToken = (await login('employee@company.com')).access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /announcements — PO creates', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ title: `ประกาศ ${tag}`, detail: 'รายละเอียด', icon: 'megaphone' })
      .expect(201);
    const body = res.body as AnnouncementResponse;
    expect(body.title).toBe(`ประกาศ ${tag}`);
    expect(body.isActive).toBe(true);
    expect(body.isPinned).toBe(false);
    createdId = body.id;
  });

  it('POST /announcements — employee → 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ title: 'X', detail: 'Y', icon: 'megaphone' })
      .expect(403);
  });

  it('POST /announcements — manager → 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ title: 'X', detail: 'Y', icon: 'megaphone' })
      .expect(403);
  });

  it('POST /announcements — invalid icon → 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ title: 'X', detail: 'Y', icon: 'rocket' })
      .expect(400);
  });

  it('POST /announcements — empty title → 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ title: '', detail: 'Y', icon: 'megaphone' })
      .expect(400);
  });

  it('GET /announcements/active — PUBLIC (no token) → 200, includes the created active one', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/announcements/active').expect(200);
    const body = res.body as PublicAnnouncementResponse[];
    expect(Array.isArray(body)).toBe(true);
    const found = body.find((a) => a.id === createdId);
    expect(found).toBeDefined();
    // public payload trims server-side fields but now exposes isPinned
    expect(found && 'isActive' in found).toBe(false);
    expect(typeof found?.isPinned).toBe('boolean');
    expect(found?.isPinned).toBe(false); // the created announcement is not pinned
  });

  it('GET /announcements — employee → 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/announcements')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);
  });

  it('GET /announcements — PO → 200 array', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/announcements')
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);
    expect(Array.isArray(res.body as AnnouncementResponse[])).toBe(true);
  });

  it('PATCH /announcements/:id — PO deactivates → drops from public list', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/announcements/${createdId}`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ isActive: false })
      .expect(200);

    const res = await request(app.getHttpServer()).get('/api/v1/announcements/active').expect(200);
    const body = res.body as PublicAnnouncementResponse[];
    expect(body.find((a) => a.id === createdId)).toBeUndefined();
  });

  it('DELETE /announcements/:id — PO → 204', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/announcements/${createdId}`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(204);
  });
});
