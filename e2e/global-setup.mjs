import { execSync } from 'child_process';

export default async function globalSetup() {
  console.log('[e2e] Starting postgres...');
  execSync('docker compose up -d postgres', {
    cwd: new URL('..', import.meta.url).pathname,
    stdio: 'inherit',
  });

  // Wait for postgres to be healthy (up to 30s)
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      execSync(
        'docker compose exec -T postgres pg_isready -U postgres',
        { cwd: new URL('..', import.meta.url).pathname, stdio: 'pipe' }
      );
      console.log('[e2e] Postgres is ready.');
      return;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error('[e2e] Postgres did not become ready within 30s');
}
