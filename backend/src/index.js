import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import healthRouter from './routes/health.js';
import eventsRouter from './routes/events.js';
import participateRouter from './routes/participate.js';
import geocodeRouter from './routes/geocode.js';
import adminRouter from './routes/admin.js';
import joinRouter from './routes/join.js';
import resendLinkRouter from './routes/resend-link.js';
import feedbackRouter from './routes/feedback.js';
import { startDeadlineWorker } from './lib/deadline-worker.js';
import { sendEmail } from './lib/mailer.js';
import { getPrisma } from './lib/prisma.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);
app.use(cors({
  origin: process.env.APP_BASE_URL ?? 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));
app.use(helmet());
app.use(express.json({ limit: '50kb' }));

// Strict limiter for routes that send email or write to DB with low legitimate frequency
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production',
});

// Limiter for participation writes (availability, location, name — frequent during a session)
const participateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production',
});

// Lenient limiter for typeahead geocode (read-only, user-facing, frequent)
const geocodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production',
});

app.use('/api/health', healthRouter);
app.use('/api/events', eventsRouter);
app.use('/api/participate', participateLimiter, participateRouter);
app.use('/api/geocode', geocodeLimiter, geocodeRouter);
app.use('/api/join', writeLimiter, joinRouter);
app.use('/api/resend-link', writeLimiter, resendLinkRouter);
app.use('/api/feedback', writeLimiter, feedbackRouter);
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
