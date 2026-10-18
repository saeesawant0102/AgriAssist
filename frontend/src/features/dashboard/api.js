import { apiClient } from '../../services/apiClient.js';

/**
 * Requirement: Farmer.view_dashboard, D10, Section 12.9
 * Fetches farmer dashboard statistics and summary.
 * @returns {Promise<Object>}
 */
export async function getDashboardApi() {
  const res = await apiClient.get('/dashboard');
  return res.data;
}
