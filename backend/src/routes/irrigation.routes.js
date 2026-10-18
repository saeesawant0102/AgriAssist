import { Router } from 'express';
import { IrrigationController } from '../controllers/irrigationController.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { IrrigationService } from '../services/irrigationService.js';
import {
  cropIdParamSchema,
  scheduleIdParamSchema,
} from '../validators/irrigationValidators.js';

/**
 * Creates Crop Irrigation router mounted at /api/v1/crops/:cropId/irrigation-schedules
 * @param {Object} deps
 * @returns {Router}
 */
export function createCropIrrigationRouter(deps) {
  const router = Router({ mergeParams: true });
  const irrigationService = new IrrigationService(deps);
  const controller = new IrrigationController({ irrigationService });
  const authenticate = createAuthenticateMiddleware(deps.db, deps.authGateway);

  // Requirement: Irrigation.Generate (POST /crops/:cropId/irrigation-schedules)
  router.post(
    '/',
    authenticate,
    requireRole('farmer'),
    validate(cropIdParamSchema, 'params'),
    controller.generateSchedule
  );

  // Requirement: Irrigation.View (GET /crops/:cropId/irrigation-schedules)
  router.get(
    '/',
    authenticate,
    requireRole('farmer', 'administrator'),
    validate(cropIdParamSchema, 'params'),
    controller.getSchedules
  );

  return router;
}

/**
 * Creates Irrigation Schedule router mounted at /api/v1/irrigation-schedules
 * @param {Object} deps
 * @returns {Router}
 */
export function createIrrigationScheduleRouter(deps) {
  const router = Router();
  const irrigationService = new IrrigationService(deps);
  const controller = new IrrigationController({ irrigationService });
  const authenticate = createAuthenticateMiddleware(deps.db, deps.authGateway);

  // Requirement: Irrigation.Update, Irrigation.Skip (POST /irrigation-schedules/:scheduleId/refresh)
  router.post(
    '/:scheduleId/refresh',
    authenticate,
    requireRole('farmer'),
    validate(scheduleIdParamSchema, 'params'),
    controller.refreshSchedule
  );

  return router;
}
