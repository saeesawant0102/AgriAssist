import { apiClient } from '../../services/apiClient.js';

/**
 * Requirement: Weather.Fetch, Weather.Display (Current Weather)
 * @param {number|string} farmId
 * @returns {Promise<Object>}
 */
export async function getCurrentWeatherApi(farmId) {
  const res = await apiClient.get(`/farms/${farmId}/weather/current`);
  return res.data;
}

/**
 * Requirement: Weather.Fetch, Weather.Display (5-7 Day Forecast)
 * @param {number|string} farmId
 * @param {number} [days=7]
 * @returns {Promise<Array<Object>>}
 */
export async function getForecastApi(farmId, days = 7) {
  const res = await apiClient.get(`/farms/${farmId}/weather/forecast`, {
    params: { days },
  });
  return res.data || [];
}

/**
 * Requirement: Weather Alert Notification (Section 13.5)
 * @param {number|string} farmId
 * @returns {Promise<Array<Object>>}
 */
export async function getWeatherAlertsApi(farmId) {
  const res = await apiClient.get(`/farms/${farmId}/weather/alerts`);
  return res.data || [];
}
