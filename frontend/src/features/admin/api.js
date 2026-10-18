import { apiClient } from '../../services/apiClient.js';

/**
 * Requirement: Administrator.manage_system, D8, Section 12.10
 * Retrieves system-wide counts.
 * @returns {Promise<Object>}
 */
export async function getAdminStatsApi() {
  const res = await apiClient.get('/admin/stats');
  return res.data;
}

/**
 * Requirement: Administrator.view_all_reports, D9, Section 12.10
 * Retrieves overall profitability across all farms and farmers.
 * @returns {Promise<Array<Object>>}
 */
export async function getAdminReportsApi() {
  const res = await apiClient.get('/admin/reports');
  return res.data || [];
}

/**
 * Requirement: Administrator.manage_users, D7, D19, Section 12.10
 * Lists farmer accounts with keyset pagination and status filter.
 * @param {Object} [params={}] - { status, limit, cursor }
 * @returns {Promise<{ data: Array<Object>, next_cursor: number | null }>}
 */
export async function getAdminUsersApi(params = {}) {
  const res = await apiClient.get('/admin/users', { params });
  return res;
}

/**
 * Requirement: Section 12.10 GET /admin/users/:userId
 * @param {number|string} userId
 * @returns {Promise<Object>}
 */
export async function getAdminUserByIdApi(userId) {
  const res = await apiClient.get(`/admin/users/${userId}`);
  return res.data;
}

/**
 * Requirement: Section 12.10 PUT /admin/users/:userId
 * @param {number|string} userId
 * @param {Object} data - { name, phone, address }
 * @returns {Promise<Object>}
 */
export async function updateAdminUserApi(userId, data) {
  const res = await apiClient.put(`/admin/users/${userId}`, data);
  return res.data;
}

/**
 * Requirement: Section 12.10 PATCH /admin/users/:userId/status
 * @param {number|string} userId
 * @param {'active' | 'disabled'} status
 * @returns {Promise<Object>}
 */
export async function updateAdminUserStatusApi(userId, status) {
  const res = await apiClient.patch(`/admin/users/${userId}/status`, { status });
  return res.data;
}

/**
 * Requirement: Section 12.10 DELETE /admin/users/:userId
 * @param {number|string} userId
 * @returns {Promise<Object>}
 */
export async function deleteAdminUserApi(userId) {
  const res = await apiClient.delete(`/admin/users/${userId}`);
  return res.data;
}

/**
 * Requirement: Section 12.10 / Section 12.12 Admin Farms
 * @param {Object} [params={}]
 * @returns {Promise<Array<Object>>}
 */
export async function getAdminFarmsApi(params = {}) {
  const res = await apiClient.get('/admin/farms', { params });
  return res.data || [];
}

/**
 * Requirement: Section 12.10 / Section 12.12 Admin create farm on behalf
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createAdminFarmApi(data) {
  const res = await apiClient.post('/admin/farms', data);
  return res.data;
}

/**
 * Requirement: Section 12.10 / Section 12.12 Admin delete farm
 * @param {number|string} farmId
 * @returns {Promise<Object>}
 */
export async function deleteAdminFarmApi(farmId) {
  const res = await apiClient.delete(`/admin/farms/${farmId}`);
  return res.data;
}
