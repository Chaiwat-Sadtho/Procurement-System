import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// พิสูจน์ rate limiting ผ่าน HTTP จริง (ต้องมี Redis live). throttle ถูกปิดใน suite อื่น
// (test:e2e ตั้ง THROTTLE_ENABLED=false) — spec นี้เปิดเองใน beforeAll แล้วคืนค่าใน
// afterAll (jest-e2e maxWorkers:1 = serial → ห้าม leak ไป spec ถัดไป).
describe('Rate limiting (e2e)', () => {
  let app: NestExpressApplication;
  const prevEnabled = process.env.THROTTLE_ENABLED;
  const prevGlobal = process.env.THROTTLE_GLOBAL_LIMIT;

  beforeAll(async () => {
    process.env.THROTTLE_ENABLED = 'true';
    process.env.THROTTLE_GLOBAL_LIMIT = '3'; // global ต่ำ → ทดสอบถูก/เร็ว

    // ล้าง counter เก่า (กัน flaky เมื่อ re-run ภายใน ttl 60s). storage เก็บ key เป็น
    // `{<tracker>:<name>}:hits` / `:blocked` (ขึ้นต้น `{`) → flush ด้วย `{*}:*`.
    const redis = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      db: Number(process.env.REDIS_DB ?? 0),
    });
    const keys = await redis.keys('{*}:*');
    if (keys.length) await redis.del(...keys);
    await redis.quit();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', 1); // e2e สร้าง app เอง — ต้อง set ให้ X-Forwarded-For ทำงาน
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    process.env.THROTTLE_ENABLED = prevEnabled ?? 'false';
    if (prevGlobal === undefined) delete process.env.THROTTLE_GLOBAL_LIMIT;
    else process.env.THROTTLE_GLOBAL_LIMIT = prevGlobal;
  });

  it('429 หลังยิง login เกิน limit (5/60s) จาก IP เดียว + มี Retry-After', async () => {
    const ip = '203.0.113.10';
    const body = { email: 'procurement@company.com', password: 'wrongpass' };
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', ip)
        .send(body)
        .expect(401); // 5 ครั้งแรกถึง controller (รหัสผิด) แต่ถูกนับ
    }
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', ip)
      .send(body)
      .expect(429); // ครั้งที่ 6 ถูก throttle ก่อนถึง controller
    expect(res.headers).toHaveProperty('retry-after');
  });

  it('นับแยกต่อ IP (X-Forwarded-For ต่างกัน ไม่ถูก throttle)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.99') // IP ใหม่ → counter เริ่มใหม่
      .send({ email: 'procurement@company.com', password: 'wrongpass' })
      .expect(401); // ไม่ใช่ 429
  });

  it('global limit คุม non-auth route (health)', async () => {
    const ip = '203.0.113.20';
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('X-Forwarded-For', ip)
        .expect(200);
    }
    await request(app.getHttpServer()).get('/api/v1/health').set('X-Forwarded-For', ip).expect(429);
  });
});
