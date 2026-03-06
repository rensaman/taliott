import { execSync } from 'child_process';

const CWD = new URL('..', import.meta.url).pathname;

async function waitFor(label, checkFn, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await checkFn();
      console.log(`[e2e] ${label} is ready.`);
      return;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error(`[e2e] ${label} did not become ready within ${timeoutMs}ms`);
}

export default async function globalSetup() {
  console.log('[e2e] Starting postgres and mailpit...');
  execSync('docker compose up -d postgres mailpit', { cwd: CWD, stdio: 'inherit' });

  await Promise.all([
    waitFor('Postgres', () => {
      execSync('docker compose exec -T postgres pg_isready -U postgres', {
        cwd: CWD,
        stdio: 'pipe',
      });
    }),
    waitFor('Mailpit', async () => {
      const res = await fetch('http://localhost:8025/api/v1/messages');
      if (!res.ok) throw new Error('not ready');
    }),
  ]);
}
