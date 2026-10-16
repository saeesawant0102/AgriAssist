import { Router } from 'express';
import { createHealthRouter } from './health.routes.js';

/**
 * Creates versioned API router mounted at /api/v1
 * @param {Object} _deps
 * @returns {Router}
 */
export function createApiRouter(_deps) {
  const router = Router();

  // Health route: /api/v1/health
  router.use('/health', createHealthRouter());

  return router;
}
