import { Router } from 'express';
import { createAuthRouter } from './auth.routes.js';
import { createHealthRouter } from './health.routes.js';

/**
 * Creates versioned API router mounted at /api/v1
 * @param {Object} deps
 * @returns {Router}
 */
export function createApiRouter(deps) {
  const router = Router();

  // Health check: /api/v1/health
  router.use('/health', createHealthRouter());

  // Auth & Profile: /api/v1/auth
  router.use('/auth', createAuthRouter(deps));

  return router;
}
