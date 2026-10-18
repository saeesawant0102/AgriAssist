import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { DashboardService } from '../services/dashboardService.js';

/**
 * Creates Dashboard router mounted at /api/v1/dashboard
 * Requirement: Farmer.view_dashboard, D10, Section 12.9
 * @param {Object} deps
 * @param {import('../db/connection.js').Database} deps.db
 * @param {import('../auth/AuthGateway.js').AuthGateway} deps.authGateway
 * @param {import('../utils/clock.js').Clock} deps.clock
 * @returns {Router}
 */
export function createDashboardRouter(deps) {
  const router = Router();
  const dashboardService = new DashboardService(deps);
  const controller = new DashboardController({ dashboardService });
  const authenticate = createAuthenticateMiddleware(deps.db, deps.authGateway);

  // Requirement: Farmer.view_dashboard (Role: Farmer)
  router.get(
    '/',
    authenticate,
    requireRole('farmer'),
    controller.getDashboard
  );

  return router;
}

/**
 * Creates Reports router mounted at /api/v1/reports
 * Requirement: Farmer.view_reports, D11, Section 12.9
 * @param {Object} deps
 * @param {import('../db/connection.js').Database} deps.db
 * @param {import('../auth/AuthGateway.js').AuthGateway} deps.authGateway
 * @param {import('../utils/clock.js').Clock} deps.clock
 * @returns {Router}
 */
export function createReportsRouter(deps) {
  const router = Router();
  const dashboardService = new DashboardService(deps);
  const controller = new DashboardController({ dashboardService });
  const authenticate = createAuthenticateMiddleware(deps.db, deps.authGateway);

  // Requirement: Farmer.view_reports (Role: Farmer)
  router.get(
    '/profitability',
    authenticate,
    requireRole('farmer'),
    controller.getReports
  );

  return router;
}
