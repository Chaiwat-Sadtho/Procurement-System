import { DataSource } from 'typeorm';

// ลบข้อมูลทุกตาราง (ยกเว้น migrations) + reset identity — ใช้ร่วมทั้ง e2e global-setup และ seed:demo
// PostgreSQL เท่านั้น — อาศัย pg_tables + TRUNCATE ... RESTART IDENTITY CASCADE
export async function truncateAllTables(ds: DataSource): Promise<void> {
  const tables: Array<{ tablename: string }> = await ds.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'migrations'`,
  );
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await ds.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
