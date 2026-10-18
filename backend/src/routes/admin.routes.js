import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { AdminService } from '../services/adminService.js';
import { FarmService } from '../services/farmService.js';
import {
  listUsersQuerySchema,
  updateFarmerStatusSchema,
  updateFarmerUserSchema,
  userIdParamSchema,
} from '../validators/adminValidators.js';
import { addFarmSchema } from '../validators/farmValidators.js';

/**
 * Creates Administrator router mounted at /api/v1/admin
 * Requirements: Section 12.10, D7, D8, D9, D19
 * @param {Object} deps
 * @param {import('../db/connection.js').Database} deps.db
 * @param {import('../auth/AuthGateway.js').AuthGateway} deps.authGateway
 * @param {import('../utils/clock.js').Clock} deps.clock
 * @returns {Router}
 */
export function createAdminRouter(deps) {
  const router = Router();
  const adminService = new AdminService(deps);
  const farmService = new FarmService(deps);
  const controller = new AdminController({ adminService, farmService });
  const authenticate = createAuthenticateMiddleware(deps.db, deps.authGateway);

  // All admin endpoints require authentication and administrator role
  router.use(authenticate, requireRole('administrator'));

  // Requirement: Administrator.manage_system (D8)
  router.get('/stats', controller.getStats);

  // Requirement: Administrator.view_all_reports (D9)
  router.get('/reports', controller.getAllReports);

  // Requirement: Administrator.manage_users - List farmer accounts with keyset pagination (D7, D19)
  router.get('/users', validate(listUsersQuerySchema, 'query'), controller.listUsers);

  // Requirement: Administrator.manage_users - View single farmer account
  router.get('/users/:userId', validate(userIdParamSchema, 'params'), controller.getUser);

  // Requirement: Administrator.manage_users - Update farmer profile (D7)
  router.put(
    '/users/:userId',
    validate(userIdParamSchema, 'params'),
    validate(updateFarmerUserSchema),
    controller.updateUser
  );

  // Requirement: Administrator.manage_users - Update farmer status (D7, enable/disable)
  router.patch(
    '/users/:userId/status',
    validate(userIdParamSchema, 'params'),
    validate(updateFarmerStatusSchema),
    controller.updateStatus
  );

  // Requirement: Administrator.manage_users - Delete farmer account (D5, D7)
  router.delete('/users/:userId', validate(userIdParamSchema, 'params'), controller.deleteUser);

  // Requirement: Admin farms (D6, Section 12.10 / Section 12.12)
  router.get('/farms', controller.listFarms);
  router.post('/farms', validate(addFarmSchema), controller.addFarm);
  router.delete('/farms/:farmId', controller.deleteFarm);

  return router;
}
