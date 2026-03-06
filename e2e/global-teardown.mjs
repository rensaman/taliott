import { execSync } from 'child_process';

const CWD = new URL('..', import.meta.url).pathname;

export default async function globalTeardown() {
  console.log('[e2e] Stopping postgres and mailpit...');
  execSync('docker compose stop postgres mailpit', { cwd: CWD, stdio: 'inherit' });
}
