import { generateIrrigationPlan } from '../config/irrigationRules.js';
import { AppError } from '../errors/AppError.js';
import { findCropById } from '../repositories/cropRepository.js';
import { findFarmById } from '../repositories/farmRepository.js';
import {
  findActiveSchedules,
  getScheduleById,
  getSchedulesByCropId,
  insertSchedule,
  updateScheduleInPlace,
} from '../repositories/irrigationRepository.js';
import { formatDate } from '../utils/dates.js';
import { WeatherDashboardService } from './weatherDashboardService.js';

/**
 * Service for Irrigation Scheduling management, generation, and scheduled refreshes.
 * Requirements: Irrigation.Generate, Irrigation.View, Irrigation.Update, Irrigation.Skip, BR-5, Section 12.7, Section 13.3
 */
export class IrrigationService {
  /**
   * @param {Object} deps
   * @param {import('../db/connection.js').Database} deps.db
   * @param {import('../weather/WeatherService.js').WeatherService} deps.weatherService
   * @param {import('../utils/clock.js').Clock} deps.clock
   * @param {WeatherDashboardService} [deps.weatherDashboardService]
   */
  constructor({ db, weatherService, clock, weatherDashboardService = null }) {
    this.db = db;
    this.weatherService = weatherService;
    this.clock = clock;
    this.weatherDashboardService =
      weatherDashboardService || new WeatherDashboardService({ db, weatherService, clock });
  }

  /**
   * Internal helper to load crop and verify user authorization.
   * @param {number} cropId
   * @param {Object} user
   * @returns {Promise<{ crop: import('../models/Crop.js').Crop, farm: import('../models/Farm.js').Farm }>}
   */
  async _getAuthorizedCrop(cropId, user) {
    const crop = await findCropById(this.db, cropId);
    if (!crop) {
      throw AppError.notFound('Crop not found', 'CROP_NOT_FOUND');
    }

    const farm = await findFarmById(this.db, crop.farm_id);
    if (!farm) {
      throw AppError.notFound('Farm not found', 'FARM_NOT_FOUND');
    }

    if (user.user_type === 'farmer' && farm.farmer_id !== user.farmer_id) {
      throw AppError.forbidden('Access denied to this crop', 'FORBIDDEN');
    }

    return { crop, farm };
  }

  /**
   * Requirement: Irrigation.Generate (Farmer only, Admin -> 403)
   * Section 12.7: POST /crops/:cropId/irrigation-schedules
   * @param {number} cropId
   * @param {Object} user
   * @returns {Promise<import('../models/IrrigationSchedule.js').IrrigationSchedule>}
   */
  async generateSchedule(cropId, user) {
    if (user.user_type !== 'farmer') {
      throw AppError.forbidden('Only farmers can generate irrigation schedules', 'FORBIDDEN');
    }

    const { crop, farm } = await this._getAuthorizedCrop(cropId, user);

    // Fetch weather data for the farm (7-day forecast D[0]..D[6])
    const weatherBundle = await this.weatherDashboardService.getWeatherForFarm(farm.farm_id, user);
    const forecastDays = weatherBundle.forecast;

    if (!forecastDays || forecastDays.length === 0) {
      throw AppError.badGateway('Weather forecast unavailable for scheduling', 'WEATHER_UNAVAILABLE');
    }

    // Generate schedule plan using rule thresholds
    const plan = generateIrrigationPlan(crop.crop_name, forecastDays);
    const nowIso = this.clock.now().toISOString();

    const schedule = await this.db.transaction(async (tx) => {
      return insertSchedule(tx, {
        crop_id: crop.crop_id,
        start_date: plan.start_date,
        end_date: plan.end_date,
        frequency: plan.frequency,
        water_required: plan.water_required,
        skip_recommended: plan.skip_recommended,
        note: plan.note,
        created_at: nowIso,
        updated_at: nowIso,
        dates: plan.dates,
        weather_ids: plan.weather_ids,
      });
    });

    return schedule;
  }

  /**
   * Requirement: Irrigation.View (Farmer owner or Admin)
   * Section 12.7: GET /crops/:cropId/irrigation-schedules
   * @param {number} cropId
   * @param {Object} user
   * @returns {Promise<import('../models/IrrigationSchedule.js').IrrigationSchedule[]>}
   */
  async getSchedules(cropId, user) {
    await this._getAuthorizedCrop(cropId, user);
    return getSchedulesByCropId(this.db, cropId);
  }

  /**
   * Requirement: Irrigation.Update, Irrigation.Skip (Farmer only, Admin -> 403)
   * Section 12.7: POST /irrigation-schedules/:scheduleId/refresh
   * @param {number} scheduleId
   * @param {Object} user
   * @returns {Promise<import('../models/IrrigationSchedule.js').IrrigationSchedule>}
   */
  async refreshSchedule(scheduleId, user) {
    if (user.user_type !== 'farmer') {
      throw AppError.forbidden('Only farmers can refresh irrigation schedules', 'FORBIDDEN');
    }

    const existing = await getScheduleById(this.db, scheduleId);
    if (!existing) {
      throw AppError.notFound('Irrigation schedule not found', 'SCHEDULE_NOT_FOUND');
    }

    const { crop, farm } = await this._getAuthorizedCrop(existing.crop_id, user);

    // Fetch fresh weather bundle
    const weatherBundle = await this.weatherDashboardService.getWeatherForFarm(farm.farm_id, user);
    const forecastDays = weatherBundle.forecast;

    if (!forecastDays || forecastDays.length === 0) {
      throw AppError.badGateway('Weather forecast unavailable for scheduling', 'WEATHER_UNAVAILABLE');
    }

    const plan = generateIrrigationPlan(crop.crop_name, forecastDays);
    const nowIso = this.clock.now().toISOString();

    const updated = await this.db.transaction(async (tx) => {
      return updateScheduleInPlace(tx, scheduleId, {
        frequency: plan.frequency,
        water_required: plan.water_required,
        skip_recommended: plan.skip_recommended,
        note: plan.note,
        updated_at: nowIso,
        dates: plan.dates,
        weather_ids: plan.weather_ids,
      });
    });

    return updated;
  }

  /**
   * Plain testable function for the 6-hour refresh cron job.
   * Requirement: D18, Section 13.3 (9)
   * Refreshes active schedules whose end_date is not in the past, grouping by farm
   * so each farm's weather is fetched only once.
   * @returns {Promise<{ refreshedCount: number, farmCount: number }>}
   */
  async refreshActiveSchedules() {
    const today = formatDate(this.clock.now());
    const active = await findActiveSchedules(this.db, today);

    if (active.length === 0) {
      return { refreshedCount: 0, farmCount: 0 };
    }

    // Group schedules by farm_id
    const schedulesByFarm = new Map();
    for (const item of active) {
      if (!schedulesByFarm.has(item.farm_id)) {
        schedulesByFarm.set(item.farm_id, []);
      }
      schedulesByFarm.get(item.farm_id).push(item);
    }

    let refreshedCount = 0;
    const nowIso = this.clock.now().toISOString();

    for (const [farmId, schedules] of schedulesByFarm.entries()) {
      try {
        // Fetch weather once per farm
        const fakeUser = { user_type: 'administrator' };
        const weatherBundle = await this.weatherDashboardService.getWeatherForFarm(farmId, fakeUser);
        const forecastDays = weatherBundle.forecast;

        if (!forecastDays || forecastDays.length === 0) {
          continue;
        }

        for (const sched of schedules) {
          const plan = generateIrrigationPlan(sched.crop_name, forecastDays);
          await this.db.transaction(async (tx) => {
            await updateScheduleInPlace(tx, sched.schedule_id, {
              frequency: plan.frequency,
              water_required: plan.water_required,
              skip_recommended: plan.skip_recommended,
              note: plan.note,
              updated_at: nowIso,
              dates: plan.dates,
              weather_ids: plan.weather_ids,
            });
          });
          refreshedCount++;
        }
      } catch (err) {
        console.error(`[IrrigationService] Error refreshing schedules for farm ${farmId}:`, err);
      }
    }

    return { refreshedCount, farmCount: schedulesByFarm.size };
  }
}
