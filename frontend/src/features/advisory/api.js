import { apiClient } from '../../services/apiClient.js';

/**
 * Requirement: Advisory.Generate, BR-4, Sequence Diagram 1
 * Generates an advisory for a crop using the latest weather conditions.
 * @param {number|string} cropId
 * @returns {Promise<Object>}
 */
export async function generateAdvisoryApi(cropId) {
  const res = await apiClient.post(`/crops/${cropId}/advisories`);
  return res.data;
}

/**
 * Requirement: Advisory.Display
 * Fetches all advisories for a crop, newest first.
 * @param {number|string} cropId
 * @returns {Promise<Array<Object>>}
 */
export async function getAdvisoriesByCropApi(cropId) {
  const res = await apiClient.get(`/crops/${cropId}/advisories`);
  return res.data || [];
}

/**
 * Requirement: Advisory.Display
 * Fetches the latest advisory for a crop.
 * @param {number|string} cropId
 * @returns {Promise<Object>}
 */
export async function getLatestAdvisoryByCropApi(cropId) {
  const res = await apiClient.get(`/crops/${cropId}/advisories/latest`);
  return res.data;
}
