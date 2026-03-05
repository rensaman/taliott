import { describe, it, expect } from 'vitest';
import { Router } from 'express';
import healthRouter from './health.js';

describe('health router', () => {
  it('exports an Express Router', () => {
    const baseRouter = Router();
    expect(healthRouter.stack).toBeDefined();
    expect(typeof healthRouter).toBe('function');
  });
});
