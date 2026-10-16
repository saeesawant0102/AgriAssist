import { evaluateCropAdvisory } from '../advisory/advisoryRules.js';
import { AppError } from '../errors/AppError.js';
import {
  getAdvisoriesByCrop as repoGetAdvisoriesByCrop,
  getAdvisoryWeatherRows,
  getLatestAdvisoryByCrop as repoGetLatestAdvisoryByCrop,
  insertAdvisory,
  linkAdvisoryWeather,
} from '../repositories/advisoryRepository.js';
import { findCropById } from '../repositories/cropRepository.js';
import { findFarmById } from '../repositories/farmRepository.js';
import { WeatherDashboardService } from './weatherDashboardService.js';

/**
 * Service for Crop Advisory generation and retrieval.
 * Requirements: Advisory.Generate, Advisory.Display, BR-4, Sequence Diagram 1, Section 12.6, Section 13.2
 */
export class AdvisoryService {
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
   * Requirement: Advisory.Generate (Farmer only, Admin -> 403 per D6)
   * Sequence Diagram 1: view_advisory(crop_id)
   * @param {number} cropId
   * @param {Object} user
   * @returns {Promise<Object>}
   */
  async generateAdvisory(cropId, user) {
    if (user.user_type === 'administrator') {
      throw AppError.forbidden('Administrators cannot generate crop advisories', 'FORBIDDEN');
    }

    const { crop } = await this._getAuthorizedCrop(cropId, user);

    // Fetch weather (uses 30-min cache or upstream Open-Meteo per BR-4)
    const { current, forecast } = await this.weatherDashboardService.getWeatherForFarm(
      crop.farm_id,
      user
    );

    // Apply 7 priority advisory rules
    const today = forecast[0]?.date || current?.date || this.clock.now().toISOString().split('T')[0];
    const { recommendation, message } = evaluateCropAdvisory({
      crop,
      current,
      forecast,
      today,
    });

    const createdAt = this.clock.now().toISOString();

    // Persist advisory and link underlying weather readings in advisory_weather junction
    const advisory = await this.db.transaction(async (tx) => {
      const inserted = await insertAdvisory(tx, {
        crop_id: crop.crop_id,
        recommendation,
        message,
        date: today,
        created_at: createdAt,
      });

      // Link current row and next 5 forecast days (Section 13.2)
      const weatherIdsToLink = [
        current?.weather_id,
        ...forecast.slice(0, 5).map((f) => f.weather_id),
      ].filter((id) => id !== null && id !== undefined);

      await linkAdvisoryWeather(tx, inserted.advisory_id, weatherIdsToLink);

      return inserted;
    });

    return advisory.toJSON();
  }

  /**
   * Requirement: Advisory.Display (History, newest first)
   * @param {number} cropId
   * @param {Object} user
   * @returns {Promise<Object[]>}
   */
  async getAdvisoriesByCrop(cropId, user) {
    await this._getAuthorizedCrop(cropId, user);
    const advisories = await repoGetAdvisoriesByCrop(this.db, cropId);
    return advisories.map((a) => a.toJSON());
  }

  /**
   * Requirement: Advisory.Display (Latest advisory)
   * @param {number} cropId
   * @param {Object} user
   * @returns {Promise<Object>}
   */
  async getLatestAdvisoryByCrop(cropId, user) {
    await this._getAuthorizedCrop(cropId, user);
    const latest = await repoGetLatestAdvisoryByCrop(this.db, cropId);
    if (!latest) {
      throw AppError.notFound('No advisory found for this crop', 'NOT_FOUND');
    }
    return latest.toJSON();
  }

  /**
   * Helper to retrieve linked weather data for an advisory.
   * @param {number} advisoryId
   * @returns {Promise<Object[]>}
   */
  async getAdvisoryWeather(advisoryId) {
    const weatherRows = await getAdvisoryWeatherRows(this.db, advisoryId);
    return weatherRows.map((w) => w.toJSON());
  }
}
