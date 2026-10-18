import { apiClient } from '../../services/apiClient.js';

/**
 * Requirement: Irrigation.Generate, BR-5, Section 12.7
 * Generates an irrigation schedule for a crop using the 7-day forecast.
 * @param {number|string} cropId
 * @returns {Promise<Object>}
 */
export async function generateIrrigationScheduleApi(cropId) {
  const res = await apiClient.post(`/crops/${cropId}/irrigation-schedules`);
  return res.data;
}

/**
 * Requirement: Irrigation.View, Section 12.7
 * Fetches all irrigation schedules for a crop.
 * @param {number|string} cropId
 * @returns {Promise<Array<Object>>}
 */
export async function getIrrigationSchedulesByCropApi(cropId) {
  const res = await apiClient.get(`/crops/${cropId}/irrigation-schedules`);
  return res.data || [];
}

/**
 * Requirement: Irrigation.Update, Irrigation.Skip, Section 12.7
 * Refreshes an irrigation schedule in place using latest weather forecast.
 * @param {number|string} scheduleId
 * @returns {Promise<Object>}
 */
export async function refreshIrrigationScheduleApi(scheduleId) {
  const res = await apiClient.post(`/irrigation-schedules/${scheduleId}/refresh`);
  return res.data;
}

/**
 * Requirement: Weather.Fetch, Section 12.5
 * Fetches weather forecast for field/farm.
 * @param {number|string} farmId
 * @param {number} [days=7]
 * @returns {Promise<Array<Object>>}
 */
export async function getFarmWeatherForecastApi(farmId, days = 7) {
  const res = await apiClient.get(`/farms/${farmId}/weather/forecast?days=${days}`);
  return res.data || [];
}
