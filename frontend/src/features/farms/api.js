import { apiClient } from '../../services/apiClient.js';

/**
 * Requirement: Farm.View
 * Fetches list of farms. Farmers get their own farms; Admins get all farms (or filtered by farmer_id).
 * @param {Object} [params]
 * @param {number|string} [params.farmer_id]
 * @returns {Promise<Array<Object>>}
 */
export async function getFarmsApi(params = {}) {
  const res = await apiClient.get('/farms', { params });
  return res.data || [];
}

/**
 * Requirement: Farm.View
 * Fetches a single farm by its ID.
 * @param {number|string} farmId
 * @returns {Promise<Object>}
 */
export async function getFarmByIdApi(farmId) {
  const res = await apiClient.get(`/farms/${farmId}`);
  return res.data;
}

/**
 * Requirement: Farm.Add, BR-1, BR-2
 * Creates a new farm.
 * @param {Object} data
 * @param {string} data.farm_name
 * @param {string} data.location
 * @param {number} data.area
 * @param {number} [data.latitude]
 * @param {number} [data.longitude]
 * @param {number} [data.farmer_id] - Required when admin adds farm on behalf of a farmer
 * @returns {Promise<Object>}
 */
export async function createFarmApi(data) {
  const res = await apiClient.post('/farms', data);
  return res.data;
}

/**
 * Requirement: Farm.Edit
 * Updates an existing farm (farmer only).
 * @param {number|string} farmId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateFarmApi(farmId, data) {
  const res = await apiClient.put(`/farms/${farmId}`, data);
  return res.data;
}

/**
 * Requirement: Farm.Delete
 * Deletes a farm by ID (farmer owner or admin).
 * @param {number|string} farmId
 * @returns {Promise<Object>}
 */
export async function deleteFarmApi(farmId) {
  const res = await apiClient.delete(`/farms/${farmId}`);
  return res.data;
}
