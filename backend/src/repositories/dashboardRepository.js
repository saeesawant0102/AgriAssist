import { round2 } from '../utils/round.js';

/**
 * Repository for Farmer Dashboard aggregates and queries.
 * Requirements: Farmer.view_dashboard, D10, Section 12.9
 */

/**
 * Retrieves the latest advisory across all crops belonging to the farmer.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} farmerId
 * @returns {Promise<Object | null>}
 */
export async function getLatestAdvisoryForFarmer(exec, farmerId) {
  const sql = `
    SELECT
      ca.advisory_id,
      ca.crop_id,
      ca.recommendation,
      ca.message,
      ca.date,
      ca.created_at,
      c.crop_name,
      f.farm_name
    FROM crop_advisories ca
    INNER JOIN crops c ON ca.crop_id = c.crop_id
    INNER JOIN farms f ON c.farm_id = f.farm_id
    WHERE f.farmer_id = ?
    ORDER BY ca.advisory_id DESC
    LIMIT 1
  `;
  const row = await exec.get(sql, [farmerId]);
  if (!row) return null;
  return {
    advisory_id: row.advisory_id,
    crop_id: row.crop_id,
    crop_name: row.crop_name,
    farm_name: row.farm_name,
    recommendation: row.recommendation,
    message: row.message,
    date: row.date,
    created_at: row.created_at,
  };
}

/**
 * Retrieves the next upcoming non-skipped irrigation date on or after todayDate.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} farmerId
 * @param {string} todayDate - YYYY-MM-DD
 * @returns {Promise<string | null>}
 */
export async function getNextIrrigationDateForFarmer(exec, farmerId, todayDate) {
  const sql = `
    SELECT isd.date
    FROM irrigation_schedule_dates isd
    INNER JOIN irrigation_schedules s ON isd.schedule_id = s.schedule_id
    INNER JOIN crops c ON s.crop_id = c.crop_id
    INNER JOIN farms f ON c.farm_id = f.farm_id
    WHERE f.farmer_id = ?
      AND isd.is_skipped = 0
      AND isd.date >= ?
    ORDER BY isd.date ASC
    LIMIT 1
  `;
  const row = await exec.get(sql, [farmerId, todayDate]);
  return row ? row.date : null;
}

/**
 * Computes overall net profit across all farms owned by the farmer from overall profitability rows.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} farmerId
 * @returns {Promise<number>}
 */
export async function getOverallNetProfitForFarmer(exec, farmerId) {
  const sql = `
    SELECT COALESCE(SUM(p.net_profit), 0) AS overall_net_profit
    FROM profitability p
    INNER JOIN farms f ON p.farm_id = f.farm_id
    WHERE f.farmer_id = ? AND p.is_overall = 1
  `;
  const row = await exec.get(sql, [farmerId]);
  return row ? round2(row.overall_net_profit) : 0;
}
