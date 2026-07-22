import { AppDataSource } from './data-source';

// Standalone migration runner: the 'migrate' service runs it once before the backend pool boots, so
// instances never race each other.

// pg_isready can pass before Postgres accepts TCP on a cold start → retry the connect (bounded) only.
// A migration error itself is not retried: it fails loudly with exit 1.
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
