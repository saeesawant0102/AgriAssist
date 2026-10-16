import { env } from '../config/env.js';
import { round1 } from '../utils/round.js';
import { getWeatherCondition, getWeatherForecast } from './weatherCodes.js';
import { WeatherService } from './WeatherService.js';

/**
 * Open-Meteo Weather API implementation.
 * Requirements: Weather.Fetch, R4, Section 13.1, SRS PE-3 (5s timeout).
 */
export class WeatherAPI extends WeatherService {
  /**
   * @param {Object} [options]
   * @param {string} [options.baseUrl]
   * @param {string} [options.apiKey]
   * @param {number} [options.timeoutMs]
   */
  constructor({
    baseUrl = env.OPEN_METEO_BASE_URL,
    apiKey = null,
    timeoutMs = env.WEATHER_TIMEOUT_MS || 5000,
  } = {}) {
    super();
    this.base_url = baseUrl.replace(/\/+$/, '');
    this.api_key = apiKey; // Retained from Class Diagram (unused per D16)
    this.timeout_ms = timeoutMs;
  }

  /**
   * Internal method to fetch raw weather data from Open-Meteo.
   * @param {number} lat
   * @param {number} lon
   * @param {number} [days=7]
   * @returns {Promise<any>}
   */
  async _fetchFromApi(lat, lon, days = 7) {
    const url = new URL(`${this.base_url}/v1/forecast`);
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set(
      'current',
      'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m'
    );
    url.searchParams.set('hourly', 'relative_humidity_2m');
    url.searchParams.set(
      'daily',
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max'
    );
    url.searchParams.set('forecast_days', String(days));
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('wind_speed_unit', 'kmh');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout_ms);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Open-Meteo forecast API error: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Open-Meteo request timed out after ${this.timeout_ms}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Maps raw Open-Meteo JSON into { current, forecast }.
   * @param {any} data
   * @returns {{ current: Object, forecast: Object[] }}
   */
  mapResponse(data) {
    const currentRaw = data.current || {};
    const dailyRaw = data.daily || {};
    const hourlyRaw = data.hourly || {};

    const currentDate = currentRaw.time ? currentRaw.time.split('T')[0] : '';
    const todayMax = dailyRaw.temperature_2m_max?.[0] ?? currentRaw.temperature_2m ?? null;
    const todayMin = dailyRaw.temperature_2m_min?.[0] ?? currentRaw.temperature_2m ?? null;
    const todayPrecipProb = dailyRaw.precipitation_probability_max?.[0] ?? 0;

    const current = {
      date: currentDate,
      temperature: round1(currentRaw.temperature_2m ?? 0),
      temperature_max: todayMax !== null ? round1(todayMax) : null,
      temperature_min: todayMin !== null ? round1(todayMin) : null,
      humidity: round1(currentRaw.relative_humidity_2m ?? 0),
      rainfall: round1(currentRaw.precipitation ?? 0),
      rainfall_probability: round1(todayPrecipProb),
      wind_speed: round1(currentRaw.wind_speed_10m ?? 0),
      weather_code: currentRaw.weather_code ?? 0,
      condition: getWeatherCondition(currentRaw.weather_code ?? 0),
      forecast: getWeatherForecast(currentRaw.weather_code ?? 0),
    };

    const forecast = [];
    const times = dailyRaw.time || [];
    const hourlyTimes = hourlyRaw.time || [];
    const hourlyHumidities = hourlyRaw.relative_humidity_2m || [];

    for (let i = 0; i < times.length; i++) {
      const dateStr = times[i];
      const max = dailyRaw.temperature_2m_max?.[i] ?? 0;
      const min = dailyRaw.temperature_2m_min?.[i] ?? 0;
      const avgTemp = round1((max + min) / 2);

      // Mean of that day's 24 hourly relative_humidity_2m values, rounded to 1 decimal
      const dayHourlyHumidities = [];
      for (let h = 0; h < hourlyTimes.length; h++) {
        if (hourlyTimes[h].startsWith(dateStr)) {
          dayHourlyHumidities.push(hourlyHumidities[h]);
        }
      }

      let dayHumidity = current.humidity;
      if (dayHourlyHumidities.length > 0) {
        const sum = dayHourlyHumidities.reduce((acc, val) => acc + val, 0);
        dayHumidity = round1(sum / dayHourlyHumidities.length);
      }

      const code = dailyRaw.weather_code?.[i] ?? 0;

      forecast.push({
        date: dateStr,
        temperature: avgTemp,
        temperature_max: round1(max),
        temperature_min: round1(min),
        humidity: dayHumidity,
        rainfall: round1(dailyRaw.precipitation_sum?.[i] ?? 0),
        rainfall_probability: round1(dailyRaw.precipitation_probability_max?.[i] ?? 0),
        wind_speed: round1(dailyRaw.wind_speed_10m_max?.[i] ?? 0),
        weather_code: code,
        condition: getWeatherCondition(code),
        forecast: getWeatherForecast(code),
      });
    }

    return { current, forecast };
  }

  /**
   * Requirement: Weather.Fetch (current)
   * @param {number} lat
   * @param {number} lon
   * @returns {Promise<Object>}
   */
  async fetchWeather(lat, lon) {
    const data = await this._fetchFromApi(lat, lon, 7);
    const { current } = this.mapResponse(data);
    return current;
  }

  /**
   * Requirement: Weather.Fetch (forecast)
   * @param {number} lat
   * @param {number} lon
   * @param {number} [days=7]
   * @returns {Promise<Object[]>}
   */
  async fetchForecast(lat, lon, days = 7) {
    const data = await this._fetchFromApi(lat, lon, days);
    const { forecast } = this.mapResponse(data);
    return forecast.slice(0, days);
  }

  /**
   * Fetches both current and 7-day forecast in a single API call.
   * @param {number} lat
   * @param {number} lon
   * @returns {Promise<{ current: Object, forecast: Object[] }>}
   */
  async fetchAll(lat, lon) {
    const data = await this._fetchFromApi(lat, lon, 7);
    return this.mapResponse(data);
  }
}
