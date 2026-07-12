import { AppDataSource } from '../src/data-source';
import { seedBaseline } from '../src/database/seed';
import { truncateAllTables } from '../src/common/truncate';
import { flushCacheDb } from './flush-cache';
import { Client } from 'pg';

const TEST_DB = 'procurement_test_db';

export default async function globalSetup(): Promise<void> {
  // (1) Safety guard — refuse to run if DB_NAME is not the test DB (protects dev DB)
  if (process.env.DB_NAME !== TEST_DB) {
    throw new Error(
      `e2e globalSetup refused: DB_NAME='${process.env.DB_NAME}' (expected '${TEST_DB}'). ` +
        `Run via "npm run test:e2e" which sets DB_NAME through cross-env`,
    );
  }

  // (2) Ensure test DB exists — connect to maintenance DB 'postgres'
  const admin = new Client({
    host: process.env.DB_HOST,
    port: +(process.env.DB_PORT ?? '5432'),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [TEST_DB]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE ${TEST_DB}`);
  }
  await admin.end();

  // (3) Initialize app DataSource (now pointing at test DB) + migrate
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();

  // (4) TRUNCATE all tables except migrations, reset identity
  await truncateAllTables(AppDataSource);

  // (5) Re-seed baseline → specs that log in as seed users still pass
  await seedBaseline(AppDataSource);

  await AppDataSource.destroy();

  // (6) Flush the e2e Redis cache (REDIS_DB) alongside the Postgres truncate, so a stale
  //     entry from a previous run — e.g. auth:me:<id> after RESTART IDENTITY reuses an id —
  //     can't HIT and false-fail this run. Best-effort: a no-op when Redis is down,
  //     so e2e still runs in cache-degraded mode without hanging globalSetup.
  await flushCacheDb();
}
