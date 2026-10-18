import { Router } from 'express';
import { CropController } from '../controllers/cropController.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { CropService } from '../services/cropService.js';
import { updateCropSchema, updateStageSchema } from '../validators/cropValidators.js';
import { createAdvisoryRouter } from './advisory.routes.js';
import { createCropIrrigationRouter } from './irrigation.routes.js';

/**
 * Creates Crop router mounted at /api/v1/crops
 * @param {Object} deps
 * @param {import('../db/connection.js').Database} deps.db
 * @param {import('../auth/AuthGateway.js').AuthGateway} deps.authGateway
 * @param {import('../utils/clock.js').Clock} deps.clock
 * @returns {Router}
 */
export function createCropsRouter(deps) {
  const router = Router();
  const cropService = new CropService(deps);
  const controller = new CropController({ cropService });
  const authenticate = createAuthenticateMiddleware(deps.db, deps.authGateway);

  // Requirement: Crop.View (Details - Farmer owner or Admin)
  router.get(
    '/:cropId',
    authenticate,
    requireRole('farmer', 'administrator'),
    controller.getCropById
  );

  // Requirement: Crop.Edit (Farmer only, Admin -> 403 per D6)
  router.put(
    '/:cropId',
    authenticate,
    requireRole('farmer'),
    validate(updateCropSchema),
    controller.updateCrop
  );

  // Requirement: Crop.Stage.Update (Farmer only, Admin -> 403 per D6)
  router.patch(
    '/:cropId/stage',
    authenticate,
    requireRole('farmer'),
    validate(updateStageSchema),
    controller.updateCropStage
  );

  // Requirement: Crop.Delete (Farmer only, Admin -> 403 per D6)
  router.delete(
    '/:cropId',
    authenticate,
    requireRole('farmer'),
    controller.deleteCrop
  );

  // Advisory routes: /api/v1/crops/:cropId/advisories/*
  router.use('/:cropId/advisories', createAdvisoryRouter(deps));

  // Irrigation routes: /api/v1/crops/:cropId/irrigation-schedules/*
  router.use('/:cropId/irrigation-schedules', createCropIrrigationRouter(deps));

  return router;
}

