import { Router } from 'express';
import { AdvisoryController } from '../controllers/advisoryController.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { AdvisoryService } from '../services/advisoryService.js';

/**
 * Creates Advisory router mounted at /crops/:cropId/advisories or /api/v1/crops/:cropId/advisories
 * @param {Object} deps
 * @param {import('../db/connection.js').Database} deps.db
 * @param {import('../auth/AuthGateway.js').AuthGateway} deps.authGateway
 * @param {import('../weather/WeatherService.js').WeatherService} deps.weatherService
 * @param {import('../utils/clock.js').Clock} deps.clock
 * @returns {Router}
 */
export function createAdvisoryRouter(deps) {
  const router = Router({ mergeParams: true });
  const advisoryService = new AdvisoryService(deps);
  const controller = new AdvisoryController({ advisoryService });
  const authenticate = createAuthenticateMiddleware(deps.db, deps.authGateway);

  // Requirement: Advisory.Generate (Farmer only, Admin -> 403 per D6)
  router.post(
    '/',
    authenticate,
    requireRole('farmer'),
    controller.generateAdvisory
  );

  // Requirement: Advisory.Display (History, newest first - Farmer owner or Admin)
  router.get(
    '/',
    authenticate,
    requireRole('farmer', 'administrator'),
    controller.getAdvisories
  );

  // Requirement: Advisory.Display (Latest advisory - Farmer owner or Admin)
  router.get(
    '/latest',
    authenticate,
    requireRole('farmer', 'administrator'),
    controller.getLatestAdvisory
  );

  return router;
}
