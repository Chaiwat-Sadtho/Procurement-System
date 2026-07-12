import Redis from 'ioredis';
import { flushCacheDb } from './flush-cache';

// flushCacheDb ล้าง Redis logical DB ของ e2e (REDIS_DB) — เรียกจาก global-setup คู่กับ
// truncate Postgres เพื่อให้ทุก run เริ่มด้วย cache สะอาด ไม่พึ่ง state ข้าม run.
// ต้องมี Redis จริง (แนวเดียวกับ cache.e2e-spec.ts / auth.rate-limit.e2e-spec.ts).
describe('flushCacheDb (e2e)', () => {
  const clients: Redis[] = [];
  // เปิด ioredis แล้วจดไว้ปิดใน afterEach — ปิดเสมอแม้ assertion throw กลางคัน ไม่งั้น
  // handle ค้าง → "Jest did not exit".
  const open = (db: number): Redis => {
    const client = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      db,
    });
    clients.push(client);
    return client;
  };

  afterEach(async () => {
    await Promise.all(clients.splice(0).map((c) => c.quit()));
  });

  it('ล้าง key ที่ค้างใน logical DB ของ e2e (REDIS_DB)', async () => {
    const redis = open(Number(process.env.REDIS_DB ?? 1));
    // จำลอง entry เก่าที่ค้างจาก run ก่อน (footgun: id ซ้ำ → auth:me:<id> stale)
    await redis.set('auth:me:99999', JSON.stringify({ email: 'stale@old.run' }));
    expect(await redis.exists('auth:me:99999')).toBe(1);

    await flushCacheDb();

    expect(await redis.exists('auth:me:99999')).toBe(0);
  });

  it('degrade เป็น no-op (ไม่ throw ไม่ hang) เมื่อ Redis ต่อไม่ได้', async () => {
    // globalSetup เรียก flushCacheDb เสมอ — ถ้ารัน e2e ตอนไม่มี Redis (graceful-degrade
    // mode เดิม) flush ต้องไม่ค้าง/ไม่ throw ไม่งั้น globalSetup hang ทุก run.
    const prevPort = process.env.REDIS_PORT;
    process.env.REDIS_PORT = '6399'; // ไม่มีอะไร listen → connect refused
    try {
      await expect(flushCacheDb()).resolves.toBeUndefined();
    } finally {
      if (prevPort === undefined) delete process.env.REDIS_PORT;
      else process.env.REDIS_PORT = prevPort;
    }
  }, 8000);
});
