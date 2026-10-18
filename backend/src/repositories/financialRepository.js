import { Expense } from '../models/Expense.js';
import { FinancialRecord } from '../models/FinancialRecord.js';
import { Income } from '../models/Income.js';
import { round2 } from '../utils/round.js';

/**
 * Repository for financial records (parent), expenses, and incomes (children).
 * Requirements: Expense.Add, Income.Add, Expense.View, Section 9.8, Section 12.8
 */

/**
 * Inserts a parent financial record.
 * Must be executed within a transaction when adding an expense or income.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {Object} data
 * @returns {Promise<number>} record_id
 */
export async function insertFinancialRecord(exec, data) {
  const sql = `
    INSERT INTO financial_records (
      farm_id, type, amount, date, description, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    data.farm_id,
    data.type,
    round2(data.amount),
    data.date,
    data.description || '',
    data.created_at,
    data.updated_at,
  ];

  const result = await exec.run(sql, params);
  return result.lastID;
}

/**
 * Inserts an expense child record.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} recordId
 * @returns {Promise<number>} expense_id
 */
export async function insertExpense(exec, recordId) {
  const sql = `INSERT INTO expenses (record_id) VALUES (?)`;
  const result = await exec.run(sql, [recordId]);
  return result.lastID;
}

/**
 * Inserts an income child record.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} recordId
 * @returns {Promise<number>} income_id
 */
export async function insertIncome(exec, recordId) {
  const sql = `INSERT INTO incomes (record_id) VALUES (?)`;
  const result = await exec.run(sql, [recordId]);
  return result.lastID;
}

/**
 * Finds a financial record by its primary key ID.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} recordId
 * @returns {Promise<Expense | Income | FinancialRecord | null>}
 */
export async function findRecordById(exec, recordId) {
  const sql = `
    SELECT
      f.*,
      e.expense_id,
      i.income_id
    FROM financial_records f
    LEFT JOIN expenses e ON e.record_id = f.record_id
    LEFT JOIN incomes i ON i.record_id = f.record_id
    WHERE f.record_id = ?
  `;
  const row = await exec.get(sql, [recordId]);
  if (!row) return null;

  if (row.type === 'Expense') {
    return Expense.fromRow(row);
  }
  if (row.type === 'Income') {
    return Income.fromRow(row);
  }
  return FinancialRecord.fromRow(row);
}

/**
 * Updates a financial record's amount, date, description, and updated_at.
 * Record type is strictly immutable.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} recordId
 * @param {Object} data
 * @returns {Promise<Expense | Income | FinancialRecord>}
 */
export async function updateFinancialRecord(exec, recordId, data) {
  const sql = `
    UPDATE financial_records
    SET amount = ?,
        date = ?,
        description = ?,
        updated_at = ?
    WHERE record_id = ?
  `;
  await exec.run(sql, [
    round2(data.amount),
    data.date,
    data.description || '',
    data.updated_at,
    recordId,
  ]);
  return findRecordById(exec, recordId);
}

/**
 * Deletes a financial record. Database FK cascade deletes associated child rows.
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} recordId
 * @returns {Promise<boolean>}
 */
export async function deleteFinancialRecord(exec, recordId) {
  const sql = `DELETE FROM financial_records WHERE record_id = ?`;
  const result = await exec.run(sql, [recordId]);
  return result.changes > 0;
}

/**
 * Lists financial records for a farm with optional filters (type, from, to).
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} farmId
 * @param {Object} [filters={}]
 * @param {string} [filters.type]
 * @param {string} [filters.from]
 * @param {string} [filters.to]
 * @returns {Promise<Array<Expense | Income>>}
 */
export async function listFinancialRecords(exec, farmId, filters = {}) {
  let sql = `
    SELECT
      f.*,
      e.expense_id,
      i.income_id
    FROM financial_records f
    LEFT JOIN expenses e ON e.record_id = f.record_id
    LEFT JOIN incomes i ON i.record_id = f.record_id
    WHERE f.farm_id = ?
  `;
  const params = [farmId];

  if (filters.type) {
    sql += ` AND f.type = ?`;
    params.push(filters.type);
  }
  if (filters.from) {
    sql += ` AND f.date >= ?`;
    params.push(filters.from);
  }
  if (filters.to) {
    sql += ` AND f.date <= ?`;
    params.push(filters.to);
  }

  sql += ` ORDER BY f.date DESC, f.record_id DESC`;

  const rows = await exec.all(sql, params);
  return rows.map((row) => (row.type === 'Expense' ? Expense.fromRow(row) : Income.fromRow(row)));
}

/**
 * Computes financial totals and net profit for a farm with optional date bounds.
 * Requirement: BR-6, Section 13.4
 * @param {import('../db/connection.js').DatabaseExecutor} exec
 * @param {number} farmId
 * @param {Object} [options={}]
 * @param {string} [options.startDate]
 * @param {string} [options.endDate]
 * @returns {Promise<{ total_income: number, total_expense: number, net_profit: number, record_count: number }>}
 */
export async function getFinancialTotals(exec, farmId, { startDate = null, endDate = null } = {}) {
  const sql = `
    SELECT
      type,
      SUM(amount) AS total,
      COUNT(*) AS cnt
    FROM financial_records
    WHERE farm_id = ?
      AND (? IS NULL OR date >= ?)
      AND (? IS NULL OR date <= ?)
    GROUP BY type
  `;
  const params = [farmId, startDate, startDate, endDate, endDate];
  const rows = await exec.all(sql, params);

  let totalIncome = 0;
  let totalExpense = 0;
  let recordCount = 0;

  for (const row of rows) {
    const val = round2(row.total || 0);
    const count = Number(row.cnt || 0);
    recordCount += count;
    if (row.type === 'Income') {
      totalIncome = val;
    } else if (row.type === 'Expense') {
      totalExpense = val;
    }
  }

  const netProfit = round2(totalIncome - totalExpense);

  return {
    total_income: totalIncome,
    total_expense: totalExpense,
    net_profit: netProfit,
    record_count: recordCount,
  };
}
