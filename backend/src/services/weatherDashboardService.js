import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { WeatherData } from '../models/WeatherData.js';
import { findFarmById } from '../repositories/farmRepository.js';
import {
  getLatestWeatherBundle,
  insertWeatherRows,
} from '../repositories/weatherRepository.js';
import { evaluateWeatherAlerts } from '../weather/alertRules.js';

/**
 * Service for Weather Dashboard, Caching and Alerts.
 * Requirements: Weather.Fetch, Weather.Display, BR-4, D16, D17, Section 13.1, Section 13.5
 */
export class WeatherDashboardService {
  /**
   * @param {Object} deps
   * @param {import('../db/connection.js').Database} deps.db
   * @param {import('../weather/WeatherService.js').WeatherService} deps.weatherService
   * @param {import('../utils/clock.js').Clock} deps.clock
   */
  constructor({ db, weatherService, clock }) {
    this.db = db;
    this.weatherService = weatherService;
    this.clock = clock;
  }

  /**
   * Internal helper to load farm and verify user authorization.
   * @param {number} farmId
   * @param {Object} user
   * @returns {Promise<import('../models/Farm.js').Farm>}
   */
  async _getAuthorizedFarm(farmId, user) {
    const farm = await findFarmById(this.db, farmId);
    if (!farm) {
      throw AppError.notFound('Farm not found', 'FARM_NOT_FOUND');
    }

    if (user.user_type === 'farmer' && farm.farmer_id !== user.farmer_id) {
      throw AppError.forbidden('Access denied to this farm', 'FORBIDDEN');
    }

    return farm;
  }

  /**
   * Retrieves weather bundle for farm, handling 30-min cache, refresh, and stale fallback.
   * @param {number} farmId
   * @param {Object} user
   * @returns {Promise<{ current: WeatherData, forecast: WeatherData[], stale: boolean }>}
   */
  async getWeatherForFarm(farmId, user) {
    const farm = await this._getAuthorizedFarm(farmId, user);
    const cached = await getLatestWeatherBundle(this.db, farmId);

    const ttlMs = (env.WEATHER_CACHE_TTL_MINUTES || 30) * 60 * 1000;
    const nowMs = this.clock.now().getTime();

    // Cache hit: newest cached fetch is within 30 minutes
    if (cached.fetched_at && cached.current && cached.forecast.length > 0) {
      const fetchedMs = new Date(cached.fetched_at).getTime();
      if (nowMs - fetchedMs <= ttlMs) {
        return {
          current: cached.current,
          forecast: cached.forecast,
          stale: false,
        };
      }
    }

    // Cache miss or expired: fetch from upstream Open-Meteo
    try {
      let upstreamCurrent;
      let upstreamForecast;

      if (typeof this.weatherService.fetchAll === 'function') {
        const result = await this.weatherService.fetchAll(farm.latitude, farm.longitude);
        upstreamCurrent = result.current;
        upstreamForecast = result.forecast;
      } else {
        upstreamCurrent = await this.weatherService.fetchWeather(farm.latitude, farm.longitude);
        upstreamForecast = await this.weatherService.fetchForecast(farm.latitude, farm.longitude, 7);
      }

      const fetchedAt = this.clock.now().toISOString();

      // Insert 1 current row and 7 forecast rows in a single transaction with shared fetched_at
      const inserted = await this.db.transaction(async (tx) => {
        const rowsToInsert = [
          {
            ...upstreamCurrent,
            farm_id: farmId,
            type: 'current',
            fetched_at: fetchedAt,
          },
          ...upstreamForecast.slice(0, 7).map((f) => ({
            ...f,
            farm_id: farmId,
            type: 'forecast',
            fetched_at: fetchedAt,
          })),
        ];

        return await insertWeatherRows(tx, rowsToInsert);
      });

      const current = inserted.find((r) => r.type === 'current');
      const forecast = inserted.filter((r) => r.type === 'forecast');

      return {
        current,
        forecast,
        stale: false,
      };
    } catch {
      // Upstream failed: fall back to newest cached fetch with stale: true
      if (cached.fetched_at && cached.current && cached.forecast.length > 0) {
        const staleCurrent = WeatherData.fromRow(cached.current.toJSON(), { stale: true });
        const staleForecast = cached.forecast.map((f) =>
          WeatherData.fromRow(f.toJSON(), { stale: true })
        );
        return {
          current: staleCurrent,
          forecast: staleForecast,
          stale: true,
        };
      }

      // No cache available at all: return 502 WEATHER_UNAVAILABLE
      throw AppError.weatherUnavailable(
        'Weather service is unavailable and no cached weather data is available'
      );
    }
  }

  /**
   * Requirement: Weather.Fetch, Weather.Display (current)
   * @param {number} farmId
   * @param {Object} user
   * @returns {Promise<Object>}
   */
  async getCurrentWeather(farmId, user) {
    const { current, stale } = await this.getWeatherForFarm(farmId, user);
    const data = current.toJSON();
    if (stale) {
      data.stale = true;
    }
    return data;
  }

  /**
   * Requirement: Weather.Fetch, Weather.Display (forecast)
   * @param {number} farmId
   * @param {number} [days=7]
   * @param {Object} user
   * @returns {Promise<Object[]>}
   */
  async getForecast(farmId, days = 7, user) {
    const validDays = [5, 6, 7].includes(Number(days)) ? Number(days) : 7;
    const { forecast, stale } = await this.getWeatherForFarm(farmId, user);
    return forecast.slice(0, validDays).map((f) => {
      const json = f.toJSON();
      if (stale) {
        json.stale = true;
      }
      return json;
    });
  }

  /**
   * Requirement: Weather Alert Notification (Section 13.5, D12)
   * @param {number} farmId
   * @param {Object} user
   * @returns {Promise<Array<{ alert_type: string, severity: string, date: string, message: string }>>}
   */
  async getAlerts(farmId, user) {
    const { forecast } = await this.getWeatherForFarm(farmId, user);
    // Evaluated on next 3 forecast days (days 0-2)
    return evaluateWeatherAlerts(forecast.slice(0, 3));
  }
}
