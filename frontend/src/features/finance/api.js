import { apiClient } from '../../services/apiClient.js';

/**
 * Requirement: Expense.Add, Section 12.8
 * Adds an expense record to a farm.
 * @param {number|string} farmId
 * @param {Object} data - { amount, date, description }
 * @returns {Promise<Object>}
 */
export async function addExpenseApi(farmId, data) {
  const res = await apiClient.post(`/farms/${farmId}/expenses`, data);
  return res.data;
}

/**
 * Requirement: Income.Add, Section 12.8
 * Adds an income record to a farm.
 * @param {number|string} farmId
 * @param {Object} data - { amount, date, description }
 * @returns {Promise<Object>}
 */
export async function addIncomeApi(farmId, data) {
  const res = await apiClient.post(`/farms/${farmId}/incomes`, data);
  return res.data;
}

/**
 * Requirement: Expense.View, Section 12.8
 * Lists financial records for a farm with optional filters (type, from, to).
 * @param {number|string} farmId
 * @param {Object} [filters={}]
 * @returns {Promise<Array<Object>>}
 */
export async function getFinancialRecordsApi(farmId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.from) params.append('from', filters.from);
  if (filters.to) params.append('to', filters.to);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const res = await apiClient.get(`/farms/${farmId}/financial-records${queryStr}`);
  return res.data || [];
}

/**
 * Requirement: Class update_record, Section 12.8
 * Updates an existing financial record.
 * @param {number|string} recordId
 * @param {Object} data - { amount, date, description }
 * @returns {Promise<Object>}
 */
export async function updateFinancialRecordApi(recordId, data) {
  const res = await apiClient.put(`/financial-records/${recordId}`, data);
  return res.data;
}

/**
 * Requirement: Class delete_record, Section 12.8
 * Deletes a financial record.
 * @param {number|string} recordId
 * @returns {Promise<Object>}
 */
export async function deleteFinancialRecordApi(recordId) {
  const res = await apiClient.delete(`/financial-records/${recordId}`);
  return res.data;
}

/**
 * Requirement: View Financial Summary, Section 12.8
 * Live financial summary aggregation.
 * @param {number|string} farmId
 * @param {Object} [options={}]
 * @returns {Promise<Object>}
 */
export async function getFinancialSummaryApi(farmId, options = {}) {
  const params = new URLSearchParams();
  if (options.start_date) params.append('start_date', options.start_date);
  if (options.end_date) params.append('end_date', options.end_date);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const res = await apiClient.get(`/farms/${farmId}/financial-summary${queryStr}`);
  return res.data;
}

/**
 * Requirement: Profit.Calculate, Section 12.8
 * Calculates profitability for a date range and persists calculation record.
 * @param {number|string} farmId
 * @param {Object} [options={}] - { start_date, end_date }
 * @returns {Promise<Object>}
 */
export async function calculateProfitabilityApi(farmId, options = {}) {
  const res = await apiClient.post(`/farms/${farmId}/profitability/calculate`, options);
  return res.data;
}

/**
 * Requirement: Profit.Report, Section 12.8
 * Retrieves saved profitability records for a farm.
 * @param {number|string} farmId
 * @returns {Promise<Array<Object>>}
 */
export async function getProfitabilityHistoryApi(farmId) {
  const res = await apiClient.get(`/farms/${farmId}/profitability`);
  return res.data || [];
}

/**
 * Requirement: Export Report, Section 12.8
 * Fetches JSON dataset for CSV/PDF report export.
 * @param {number|string} farmId
 * @param {Object} [options={}] - { start_date, end_date }
 * @returns {Promise<Object>}
 */
export async function getFinancialReportDatasetApi(farmId, options = {}) {
  const params = new URLSearchParams();
  if (options.start_date) params.append('start_date', options.start_date);
  if (options.end_date) params.append('end_date', options.end_date);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const res = await apiClient.get(`/farms/${farmId}/reports/financial${queryStr}`);
  return res.data;
}
