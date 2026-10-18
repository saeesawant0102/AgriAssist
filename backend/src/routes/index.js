import { Router } from 'express';
import { createAdminRouter } from './admin.routes.js';
import { createAuthRouter } from './auth.routes.js';
import { createCropsRouter } from './crops.routes.js';
import { createDashboardRouter, createReportsRouter } from './dashboard.routes.js';
import { createFarmsRouter } from './farms.routes.js';
import { createFinancialRecordRouter } from './finance.routes.js';
import { createHealthRouter } from './health.routes.js';
import { createIrrigationScheduleRouter } from './irrigation.routes.js';

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

  // Crops: /api/v1/crops
  router.use('/crops', createCropsRouter(deps));

  // Irrigation Schedules: /api/v1/irrigation-schedules
  router.use('/irrigation-schedules', createIrrigationScheduleRouter(deps));

  // Financial Records: /api/v1/financial-records
  router.use('/financial-records', createFinancialRecordRouter(deps));

  // Dashboard: /api/v1/dashboard (Farmer)
  router.use('/dashboard', createDashboardRouter(deps));

  // Reports: /api/v1/reports (Farmer)
  router.use('/reports', createReportsRouter(deps));

  // Administration: /api/v1/admin (Administrator)
  router.use('/admin', createAdminRouter(deps));

  return router;
}
