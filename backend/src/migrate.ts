import { AppDataSource } from './data-source';

// Standalone migration runner — รันใน 'migrate' service ครั้งเดียวก่อน backend pool boot
// กัน race เมื่อหลาย instance รัน migrationsRun พร้อมกัน

// postgres healthcheck (pg_isready) อาจผ่านก่อน accept TCP จริงตอน cold start (first-boot init)
// → retry เฉพาะตอน connect แบบ bounded; migration error เอง (หลัง connect ติดแล้ว) ไม่ retry = fail ชัด exit 1
async function initWithRetry(attempts = 5, delayMs = 2000): Promise<void> {
  for (let i = 1; i <= attempts; i++) {
    try {
      await AppDataSource.initialize();
      return;
    } catch (err) {
      if (i === attempts) throw err;
      console.log(`DB connect failed (attempt ${i}/${attempts}), retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function run(): Promise<void> {
  await initWithRetry();
  try {
    const migrations = await AppDataSource.runMigrations();
    console.log(`Ran ${migrations.length} migration(s)`);
  } finally {
    await AppDataSource.destroy();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
