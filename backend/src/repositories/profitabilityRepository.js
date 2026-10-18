import { Profitability } from '../models/Profitability.js';
import { round2 } from '../utils/round.js';

/**
 * Repository for profitability records and overall profitability upserts.
 * Requirements: Profit.Calculate, Profit.Report, BR-6, Section 9.8, Section 13.4
 */

/**
 * Upserts the single all-time overall profitability row (is_overall = 1) for a farm.
 * Executes within the same transaction as any financial record mutation.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} farmId
 * @param {Object} data
 * @returns {Promise<Profitability>}
 */
export async function upsertOverallProfitability(exec, farmId, data) {
  const sql = `
    INSERT INTO profitability (
      farm_id, start_date, end_date, total_expense, total_income,
      net_profit, date, is_overall, created_at
    ) VALUES (?, NULL, NULL, ?, ?, ?, ?, 1, ?)
    ON CONFLICT (farm_id) WHERE is_overall = 1 DO UPDATE SET
      total_expense = excluded.total_expense,
      total_income = excluded.total_income,
      net_profit = excluded.net_profit,
      date = excluded.date,
      created_at = excluded.created_at
  `;
  const params = [
    farmId,
    round2(data.total_expense),
    round2(data.total_income),
    round2(data.net_profit),
    data.date,
    data.created_at,
  ];

  await exec.run(sql, params);
  return getOverallProfitabilityByFarm(exec, farmId);
}

/**
 * Inserts a new range-based calculation profitability row (is_overall = 0).
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {Object} data
 * @returns {Promise<Profitability>}
 */
export async function insertDateRangeProfitability(exec, data) {
  const sql = `
    INSERT INTO profitability (
      farm_id, start_date, end_date, total_expense, total_income,
      net_profit, date, is_overall, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `;
  const params = [
    data.farm_id,
    data.start_date || null,
    data.end_date || null,
    round2(data.total_expense),
    round2(data.total_income),
    round2(data.net_profit),
    data.date,
    data.created_at,
  ];

  const result = await exec.run(sql, params);
  const row = await exec.get(`SELECT * FROM profitability WHERE profit_id = ?`, [result.lastID]);
  return Profitability.fromRow(row);
}

/**
 * Retrieves the overall profitability row for a farm.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} farmId
 * @returns {Promise<Profitability | null>}
 */
export async function getOverallProfitabilityByFarm(exec, farmId) {
  const row = await exec.get(
    `SELECT * FROM profitability WHERE farm_id = ? AND is_overall = 1`,
    [farmId]
  );
  return Profitability.fromRow(row);
}

/**
 * Retrieves profitability calculation history for a farm, newest first.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} farmId
 * @returns {Promise<Profitability[]>}
 */
export async function getProfitabilityHistory(exec, farmId) {
  const rows = await exec.all(
    `SELECT * FROM profitability WHERE farm_id = ? ORDER BY profit_id DESC`,
    [farmId]
  );
  return rows.map((r) => Profitability.fromRow(r));
}

/**
 * Retrieves overall profitability for all farms owned by a farmer.
 * Used for Farmer Reports (GET /reports/profitability, D11).
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} farmerId
 * @returns {Promise<Array<Object>>}
 */
export async function getFarmerFarmsOverallProfitability(exec, farmerId) {
  const sql = `
    SELECT
      f.farm_id,
      f.farm_name,
      f.location,
      f.area,
      COALESCE(p.total_income, 0) AS total_income,
      COALESCE(p.total_expense, 0) AS total_expense,
      COALESCE(p.net_profit, 0) AS net_profit,
      p.date,
      p.profit_id
    FROM farms f
    LEFT JOIN profitability p ON p.farm_id = f.farm_id AND p.is_overall = 1
    WHERE f.farmer_id = ?
    ORDER BY f.farm_id ASC
  `;
  const rows = await exec.all(sql, [farmerId]);
  return rows.map((r) => ({
    farm_id: r.farm_id,
    farm_name: r.farm_name,
    location: r.location,
    area: r.area,
    total_income: round2(r.total_income),
    total_expense: round2(r.total_expense),
    net_profit: round2(r.net_profit),
    date: r.date,
    profit_id: r.profit_id,
  }));
}

/**
 * Retrieves overall profitability across all farms in the system with farm and farmer names.
 * Used for Admin Reports (GET /admin/reports, D9).
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @returns {Promise<Array<Object>>}
 */
export async function getAllOverallProfitability(exec) {
  const sql = `
    SELECT
      p.profit_id,
      p.farm_id,
      p.total_expense,
      p.total_income,
      p.net_profit,
      p.date,
      p.is_overall,
      p.created_at,
      f.farm_name,
      f.location,
      u.name AS farmer_name,
      u.email AS farmer_email
    FROM profitability p
    INNER JOIN farms f ON f.farm_id = p.farm_id
    INNER JOIN farmers fr ON fr.farmer_id = f.farmer_id
    INNER JOIN users u ON u.user_id = fr.user_id
    WHERE p.is_overall = 1
    ORDER BY p.farm_id ASC
  `;
  const rows = await exec.all(sql);
  return rows.map((r) => ({
    profit_id: r.profit_id,
    farm_id: r.farm_id,
    farm_name: r.farm_name,
    location: r.location,
    farmer_name: r.farmer_name,
    farmer_email: r.farmer_email,
    total_expense: round2(r.total_expense),
    total_income: round2(r.total_income),
    net_profit: round2(r.net_profit),
    date: r.date,
    created_at: r.created_at,
  }));
}
