import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

import express from 'express';
import healthRouter from './routes/health.js';
import eventsRouter from './routes/events.js';
import participateRouter from './routes/participate.js';
import geocodeRouter from './routes/geocode.js';
import adminRouter from './routes/admin.js';
import joinRouter from './routes/join.js';
import { startDeadlineWorker } from './lib/deadline-worker.js';
import { sendEmail } from './lib/mailer.js';
import { getPrisma } from './lib/prisma.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/events', eventsRouter);
app.use('/api/participate', participateRouter);
app.use('/api/geocode', geocodeRouter);
app.use('/api/join', joinRouter);
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/admin', adminRouter);
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
  startDeadlineWorker(getPrisma, { sendEmail });
}

export default app;
