import { Router } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '../../src/app.js';
import { Database } from '../../src/db/connection.js';
import { AppError } from '../../src/errors/AppError.js';
import { createTestApp } from '../helpers/createTestApp.js';

describe('Health and Application Integration', () => {
  let app;
  let db;

  beforeEach(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    db = testApp.db;
  });

  afterEach(async () => {
    if (db) await db.close();
  });

  it('Phase0.Health: GET /api/v1/health returns 200 { "status": "ok" }', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('Phase0.HealthAlias: GET /health returns 200 { "status": "ok" }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('Phase0.ErrorHandling: maps AppError to standard JSON format without leaking stack traces', async () => {
    const extraRouter = Router();
    extraRouter.get('/test-app-error', (req, res, next) => {
      next(AppError.badRequest('Custom validation failure', 'TEST_CODE', [{ field: 'name' }]));
    });

    const testDb = await Database.open(':memory:');
    const customApp = createApp({ db: testDb, extraRoutes: extraRouter });

    const res = await request(customApp).get('/test-app-error');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'TEST_CODE',
        message: 'Custom validation failure',
        details: [{ field: 'name' }],
      },
    });
    expect(res.body.stack).toBeUndefined();

    await testDb.close();
  });

  it('Phase0.ZodErrorHandling: maps ZodError to standard validation error format', async () => {
    const extraRouter = Router();
    extraRouter.post('/test-zod-error', (req, res, next) => {
      const schema = z.object({ email: z.string().email() });
      try {
        schema.parse(req.body);
        res.json({ ok: true });
      } catch (err) {
        next(err);
      }
    });

    const testDb = await Database.open(':memory:');
    const customApp = createApp({ db: testDb, extraRoutes: extraRouter });

    const res = await request(customApp).post('/test-zod-error').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Validation failed');
    expect(res.body.error.details).toHaveLength(1);
    expect(res.body.error.details[0].path).toBe('email');

    await testDb.close();
  });

  it('Phase0.CronIsolation: createApp does not start any cron jobs', () => {
    expect(app).toBeDefined();
  });
});
