import { IrrigationService } from '../services/irrigationService.js';

/**
 * Plain testable scheduled job function for refreshing active irrigation schedules.
 * Requirement: D18, Section 13.3 (9), Phase 5
 * @param {Object} deps
 * @param {import('../db/connection.js').Database} deps.db
 * @param {import('../weather/WeatherService.js').WeatherService} deps.weatherService
 * @param {import('../utils/clock.js').Clock} deps.clock
 * @returns {Promise<{ refreshedCount: number, farmCount: number }>}
 */
export async function refreshIrrigationSchedulesJob(deps) {
  const service = new IrrigationService(deps);
  return service.refreshActiveSchedules();
}
