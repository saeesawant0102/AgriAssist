import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { AppError } from './errors/AppError.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createHealthRouter } from './routes/health.routes.js';
import { createApiRouter } from './routes/index.js';

/**
 * Creates and configures the Express application with injected dependencies.
 * Note: Must NOT start cron jobs.
 * @param {Object} deps
 * @param {import('./db/connection.js').Database} deps.db
 * @param {import('./auth/AuthGateway.js').AuthGateway} [deps.authGateway]
 * @param {import('./weather/WeatherService.js').WeatherService} [deps.weatherService]
 * @param {import('./utils/clock.js').Clock} [deps.clock]
 * @param {express.Router} [deps.extraRoutes] - Optional routes for testing middleware
 * @returns {express.Application}
 */
export function createApp(deps = {}) {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  const allowedOrigins = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:5173'];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new AppError(403, 'CORS_ERROR', `Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
    })
  );

  // Body parser with 100kb limit (Section 14)
  app.use(express.json({ limit: '100kb' }));

  // Root health check alias
  app.use('/health', createHealthRouter());

  // Mount API v1 router
  app.use('/api/v1', createApiRouter(deps));

  // Optional extra test routes mounted before error handler
  if (deps.extraRoutes) {
    app.use(deps.extraRoutes);
  }

  // Centralized error handler
  app.use(errorHandler);

  return app;
}
