import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.test from repo root before any Prisma client is imported
config({ path: resolve(__dirname, '../../../.env.test'), override: true });
