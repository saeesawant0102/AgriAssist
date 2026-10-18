import { apiClient } from '../../services/apiClient.js';

/**
 * Requirement: Farmer.view_reports, D11, Section 12.9
 * Fetches overall profitability report for each farm owned by the authenticated farmer.
 * @returns {Promise<Array<Object>>}
 */
export async function getProfitabilityReportsApi() {
  const res = await apiClient.get('/reports/profitability');
  return res.data || [];
}
