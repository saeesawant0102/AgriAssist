import { Router } from 'express';
import { WeatherController } from '../controllers/weatherController.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { WeatherDashboardService } from '../services/weatherDashboardService.js';
import { forecastQuerySchema } from '../validators/weatherValidators.js';

/**
 * Creates Weather router mounted at /farms/:farmId/weather or /api/v1/farms/:farmId/weather
 * @param {Object} deps
 * @param {import('../db/connection.js').Database} deps.db
 * @param {import('../auth/AuthGateway.js').AuthGateway} deps.authGateway
 * @param {import('../weather/WeatherService.js').WeatherService} deps.weatherService
 * @param {import('../utils/clock.js').Clock} deps.clock
 * @returns {Router}
 */
export function createWeatherRouter(deps) {
  const router = Router({ mergeParams: true });
  const weatherDashboardService = new WeatherDashboardService(deps);
  const controller = new WeatherController({ weatherDashboardService });
  const authenticate = createAuthenticateMiddleware(deps.db, deps.authGateway);

  // Requirement: Weather.Fetch, Weather.Display (Current Weather - Farmer owner or Admin)
  router.get(
    '/current',
    authenticate,
    requireRole('farmer', 'administrator'),
    controller.getCurrentWeather
  );

  // Requirement: Weather.Fetch, Weather.Display (5-7 Day Forecast - Farmer owner or Admin)
  router.get(
    '/forecast',
    authenticate,
    requireRole('farmer', 'administrator'),
    validate(forecastQuerySchema, 'query'),
    controller.getForecast
  );

  // Requirement: Weather Alert Notification (Farmer owner or Admin)
  router.get(
    '/alerts',
    authenticate,
    requireRole('farmer', 'administrator'),
    controller.getAlerts
  );

  return router;
}
