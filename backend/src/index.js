import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

import express from 'express';
import healthRouter from './routes/health.js';
import eventsRouter from './routes/events.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/events', eventsRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

export default app;
