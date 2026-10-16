import { apiClient } from '../../services/apiClient.js';

/**
 * Requirement: Crop.View
 * Fetches all crops planted on a specific farm.
 * @param {number|string} farmId
 * @returns {Promise<Array<Object>>}
 */
export async function getCropsByFarmApi(farmId) {
  const res = await apiClient.get(`/farms/${farmId}/crops`);
  return res.data || [];
}

/**
 * Requirement: Crop.View
 * Fetches details for a single crop by its ID.
 * @param {number|string} cropId
 * @returns {Promise<Object>}
 */
export async function getCropByIdApi(cropId) {
  const res = await apiClient.get(`/crops/${cropId}`);
  return res.data;
}

/**
 * Requirement: Crop.Add, BR-3
 * Adds a new crop to a farm.
 * @param {number|string} farmId
 * @param {Object} data
 * @param {string} data.crop_name
 * @param {string} [data.variety]
 * @param {string} data.sowing_date
 * @param {string} [data.harvest_date]
 * @param {string} [data.growth_stage]
 * @returns {Promise<Object>}
 */
export async function createCropApi(farmId, data) {
  const res = await apiClient.post(`/farms/${farmId}/crops`, data);
  return res.data;
}

/**
 * Requirement: Crop.Edit, BR-3
 * Updates crop details (farm_id is immutable and ignored by server).
 * @param {number|string} cropId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateCropApi(cropId, data) {
  const res = await apiClient.put(`/crops/${cropId}`, data);
  return res.data;
}

/**
 * Requirement: Crop.Stage.Update, D3
 * Updates the crop growth stage.
 * @param {number|string} cropId
 * @param {string} growth_stage
 * @returns {Promise<Object>}
 */
export async function updateCropStageApi(cropId, growth_stage) {
  const res = await apiClient.patch(`/crops/${cropId}/stage`, { growth_stage });
  return res.data;
}

/**
 * Requirement: Crop.Delete, D5
 * Deletes a crop by its ID.
 * @param {number|string} cropId
 * @returns {Promise<Object>}
 */
export async function deleteCropApi(cropId) {
  const res = await apiClient.delete(`/crops/${cropId}`);
  return res.data;
}
