import { execSync } from 'child_process';

// Repo root (docker-compose.test.yml lives here)
const CWD = new URL('../../..', import.meta.url).pathname;
// backend/ (prisma schema lives here)
const BACKEND_DIR = new URL('../..', import.meta.url).pathname;
const COMPOSE = 'docker compose -f docker-compose.test.yml';
const DB_URL = 'postgresql://postgres:postgres@localhost:5433/taliott_test';

async function waitForPostgres(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      execSync(`${COMPOSE} exec -T postgres-test pg_isready -U postgres`, {
        cwd: CWD,
        stdio: 'pipe',
      });
      return;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error('[integration] postgres-test did not become ready within 30 s');
}

// On macOS, Docker's host-port proxy can lag behind pg_isready (which checks
// inside the container). Retry the migration so a brief proxy-binding delay
// doesn't fail the whole test run.
async function runMigrationsWithRetry(retries = 5, delayMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      execSync('npx prisma migrate deploy', {
        cwd: BACKEND_DIR,
        env: { ...process.env, DATABASE_URL: DB_URL },
        stdio: 'inherit',
      });
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

export async function setup() {
  console.log('[integration] Starting postgres-test container...');
  execSync(`${COMPOSE} up -d`, { cwd: CWD, stdio: 'inherit' });
  await waitForPostgres();
  console.log('[integration] Running migrations...');
  await runMigrationsWithRetry();
  console.log('[integration] Generating Prisma client...');
  execSync('npx prisma generate', { cwd: BACKEND_DIR, stdio: 'inherit' });
  console.log('[integration] postgres-test is ready.');
}

export async function teardown() {
  console.log('[integration] Stopping postgres-test container...');
  execSync(`${COMPOSE} stop`, { cwd: CWD, stdio: 'inherit' });
}
