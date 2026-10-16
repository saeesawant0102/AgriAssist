import { Router } from 'express';
import { CropController } from '../controllers/cropController.js';
import { FarmController } from '../controllers/farmController.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { CropService } from '../services/cropService.js';
import { FarmService } from '../services/farmService.js';
import { addCropSchema } from '../validators/cropValidators.js';
import { addFarmSchema, updateFarmSchema } from '../validators/farmValidators.js';
import { createWeatherRouter } from './weather.routes.js';

/**
 * Creates Farm router mounted at /api/v1/farms
 * @param {Object} deps
 * @param {import('../db/connection.js').Database} deps.db
 * @param {import('../auth/AuthGateway.js').AuthGateway} deps.authGateway
 * @param {import('../utils/clock.js').Clock} deps.clock
 * @returns {Router}
 */
export function createFarmsRouter(deps) {
  const router = Router();
  const farmService = new FarmService(deps);
  const controller = new FarmController({ farmService });
  const cropService = new CropService(deps);
  const cropController = new CropController({ cropService });
  const authenticate = createAuthenticateMiddleware(deps.db, deps.authGateway);

  // Requirement: Farm.Add (Farmer, Admin on behalf)
  router.post(
    '/',
    authenticate,
    requireRole('farmer', 'administrator'),
    validate(addFarmSchema),
    controller.addFarm
  );

  // Requirement: Farm.View (Farmer own, Admin all/filter)
  router.get(
    '/',
    authenticate,
    requireRole('farmer', 'administrator'),
    controller.getFarms
  );

  // Requirement: Farm.View (Details)
  router.get(
    '/:farmId',
    authenticate,
    requireRole('farmer', 'administrator'),
    controller.getFarmById
  );

  // Requirement: Farm.Edit (Farmer only, Admin -> 403 per D6)
  router.put(
    '/:farmId',
    authenticate,
    requireRole('farmer'),
    validate(updateFarmSchema),
    controller.updateFarm
  );

  // Requirement: Farm.Delete (Farmer owner or Admin)
  router.delete(
    '/:farmId',
    authenticate,
    requireRole('farmer', 'administrator'),
    controller.deleteFarm
  );

  // Requirement: Crop.Add (Farmer only, Admin -> 403 per D6)
  router.post(
    '/:farmId/crops',
    authenticate,
    requireRole('farmer'),
    validate(addCropSchema),
    cropController.addCrop
  );

  // Requirement: Crop.View (Farmer owner or Admin)
  router.get(
    '/:farmId/crops',
    authenticate,
    requireRole('farmer', 'administrator'),
    cropController.getCropsByFarm
  );

  // Weather routes: /api/v1/farms/:farmId/weather/*
  router.use('/:farmId/weather', createWeatherRouter(deps));

  return router;
}

