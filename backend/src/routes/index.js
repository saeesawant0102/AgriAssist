import { Router } from 'express';
import { createAuthRouter } from './auth.routes.js';
import { createHealthRouter } from './health.routes.js';
import { createFarmsRouter } from './farms.routes.js';

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

  // Farms: /api/v1/farms
  router.use('/farms', createFarmsRouter(deps));

  return router;
}
