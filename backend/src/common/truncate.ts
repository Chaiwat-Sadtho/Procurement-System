import { DataSource } from 'typeorm';

// Wipe every table except migrations and reset identities (shared by e2e global-setup and seed:demo).
// PostgreSQL only — relies on pg_tables and TRUNCATE ... RESTART IDENTITY CASCADE.
export async function truncateAllTables(ds: DataSource): Promise<void> {
  const tables: Array<{ tablename: string }> = await ds.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'migrations'`,
  );
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await ds.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
