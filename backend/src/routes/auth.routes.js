import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { AuthService } from '../services/authService.js';
import { ProfileService } from '../services/profileService.js';
import { registerSchema, updateProfileSchema } from '../validators/authValidators.js';

/**
 * Creates authentication router.
 * @param {Object} deps
 * @param {import('../db/connection.js').Database} deps.db
 * @param {import('../auth/AuthGateway.js').AuthGateway} deps.authGateway
 * @param {import('../utils/clock.js').Clock} deps.clock
 * @returns {Router}
 */
export function createAuthRouter(deps) {
  const router = Router();
  const authService = new AuthService(deps);
  const profileService = new ProfileService(deps);
  const controller = new AuthController({ authService, profileService });
  const authenticate = createAuthenticateMiddleware(deps.db, deps.authGateway);

  // Public registration
  router.post('/register', validate(registerSchema), controller.register);

  // Authenticated endpoints
  router.post('/login', authenticate, controller.login);
  router.post('/logout', authenticate, controller.logout);
  router.get('/profile', authenticate, controller.getProfile);
  router.put('/profile', authenticate, validate(updateProfileSchema), controller.updateProfile);

  return router;
}
