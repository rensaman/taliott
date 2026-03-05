import express from 'express';
import healthRouter from './routes/health.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.use('/api/health', healthRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

export default app;
