import { AppDataSource } from './data-source';

// Standalone migration runner — รันใน 'migrate' service ครั้งเดียวก่อน backend pool boot
// กัน race เมื่อหลาย instance รัน migrationsRun พร้อมกัน (docs/features/load-balancing/spec.md ข้อ 4.3)
async function run(): Promise<void> {
  await AppDataSource.initialize();
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
