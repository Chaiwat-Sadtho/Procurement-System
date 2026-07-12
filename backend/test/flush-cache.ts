import Redis from 'ioredis';
import { createConnection } from 'net';

/**
 * เช็คว่าต่อ TCP ถึง host:port ได้ไหม ด้วย socket ที่คุม lifecycle เอง (timer unref + destroy)
 * — ใช้ตัดสินก่อนว่าจะสร้าง ioredis client ไหม. ต้องคุมเอง เพราะถ้าปล่อยให้ ioredis connect
 * พลาดเอง มันจะทิ้ง reconnect timer (~2s, ref'd) ค้าง → jest "did not exit" / process linger.
 */
function isReachable(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const timer = setTimeout(() => finish(false), timeoutMs);
    timer.unref(); // อย่าให้ timer ค้าง event loop
    let settled = false;
    function finish(ok: boolean): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(ok);
    }
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

/**
 * ล้าง Redis logical DB ของ e2e (REDIS_DB) — เรียกจาก global-setup คู่กับ truncate Postgres
 * เพื่อให้ทุก run เริ่มด้วย cache สะอาด ไม่พึ่ง state ข้าม run.
 *
 * ทำไมต้องมี: cache key ไม่มี prefix + Redis อยู่ข้าม run (docker volume) → หลัง
 * TRUNCATE ... RESTART IDENTITY user ที่ register ใหม่ได้ id เดิม แล้ว GET /auth/me HIT
 * `auth:me:<id>` ของ run ก่อน คืน email เก่า = false-fail ที่ขึ้นกับ state ภายนอก ไม่ใช่ DB.
 *
 * ความปลอดภัย: flush เฉพาะ logical DB ที่ระบุ (positive) — REDIS_DB ไม่ตั้ง/เป็น 0 (dev/prod
 * ใช้ db 0) จะ no-op เพื่อไม่ให้ลบ cache จริง.
 *
 * ทนทาน: ถ้า Redis ต่อไม่ได้ จะ degrade เป็น no-op (ไม่ throw ไม่ hang ไม่ทิ้ง handle ค้าง) —
 * globalSetup เรียกเสมอ ถ้ารัน e2e ตอนไม่มี Redis (graceful-degrade mode) ต้องไม่ทำให้ run ค้าง.
 */
export async function flushCacheDb(): Promise<void> {
  const dbRaw = process.env.REDIS_DB;
  const db = Number(dbRaw);
  // guard: flush เฉพาะ logical DB ทดสอบที่เป็นจำนวนเต็มบวก — ห้ามแตะ db 0 (dev/prod)
  if (!dbRaw || !Number.isInteger(db) || db <= 0) return;

  const host = process.env.REDIS_HOST ?? 'localhost';
  const port = Number(process.env.REDIS_PORT ?? 6379);
  // ต่อ Redis ไม่ได้ → degrade no-op (ไม่สร้าง ioredis client บน down-path = ไม่มี timer ค้าง)
  if (!(await isReachable(host, port, 500))) return;

  // ถึงตรงนี้ = probe ผ่าน (Redis up) → auto-connect + default offline queue ให้ flushdb รอ
  // connect (~ms) แล้วรัน; quit ปิด graceful. success path นี้ไม่ทิ้ง handle ค้าง.
  const redis = new Redis({ host, port, db });
  try {
    await redis.flushdb();
  } finally {
    await redis.quit();
  }
}
