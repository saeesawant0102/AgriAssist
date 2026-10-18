import { AppError } from '../errors/AppError.js';
import { findFarmById } from '../repositories/farmRepository.js';
import {
  deleteFinancialRecord,
  findRecordById,
  getFinancialTotals,
  insertExpense,
  insertFinancialRecord,
  insertIncome,
  listFinancialRecords,
  updateFinancialRecord,
} from '../repositories/financialRepository.js';
import { upsertOverallProfitability } from '../repositories/profitabilityRepository.js';
import { formatDate } from '../utils/dates.js';

/**
 * Service for financial record management (Expenses, Income, Updates, Summary).
 * Requirements: Expense.Add, Income.Add, Expense.View, BR-6, SE-5, Section 12.8, Section 13.4
 */
export class FinancialService {
  /**
   * @param {Object} deps
   * @param {import('../db/connection.js').Database} deps.db
   * @param {import('../utils/clock.js').Clock} deps.clock
   */
  constructor({ db, clock }) {
    this.db = db;
    this.clock = clock;
  }

  /**
   * Internal helper to load farm and enforce authorization.
   * @param {number} farmId
   * @param {Object} user
   * @param {boolean} [farmerOnly=false]
   * @returns {Promise<import('../models/Farm.js').Farm>}
   */
  async _getAuthorizedFarm(farmId, user, farmerOnly = false) {
    const farm = await findFarmById(this.db, farmId);
    if (!farm) {
      throw AppError.notFound('Farm not found', 'FARM_NOT_FOUND');
    }

    if (farmerOnly && user.user_type !== 'farmer') {
      throw AppError.forbidden('Only farmers can perform this financial operation', 'FORBIDDEN');
    }

    if (user.user_type === 'farmer' && farm.farmer_id !== user.farmer_id) {
      throw AppError.forbidden('Access denied to this farm', 'FORBIDDEN');
    }

    return farm;
  }

  /**
   * Requirement: Expense.Add
   * Section 12.8: POST /farms/:farmId/expenses
   * @param {number} farmId
   * @param {Object} user
   * @param {Object} data - { amount, date, description }
   * @returns {Promise<import('../models/Expense.js').Expense>}
   */
  async addExpense(farmId, user, data) {
    const farm = await this._getAuthorizedFarm(farmId, user, true);

    const nowIso = this.clock.now().toISOString();
    const today = formatDate(this.clock.now());

    return this.db.transaction(async (tx) => {
      // 1. Insert parent financial_record
      const recordId = await insertFinancialRecord(tx, {
        farm_id: farm.farm_id,
        type: 'Expense',
        amount: data.amount,
        date: data.date,
        description: data.description || '',
        created_at: nowIso,
        updated_at: nowIso,
      });

      // 2. Insert child expense row
      await insertExpense(tx, recordId);

      // 3. Recompute overall totals and upsert profitability in same transaction (R10)
      const totals = await getFinancialTotals(tx, farm.farm_id);
      await upsertOverallProfitability(tx, farm.farm_id, {
        total_expense: totals.total_expense,
        total_income: totals.total_income,
        net_profit: totals.net_profit,
        date: today,
        created_at: nowIso,
      });

      return findRecordById(tx, recordId);
    });
  }

  /**
   * Requirement: Income.Add
   * Section 12.8: POST /farms/:farmId/incomes
   * @param {number} farmId
   * @param {Object} user
   * @param {Object} data - { amount, date, description }
   * @returns {Promise<import('../models/Income.js').Income>}
   */
  async addIncome(farmId, user, data) {
    const farm = await this._getAuthorizedFarm(farmId, user, true);

    const nowIso = this.clock.now().toISOString();
    const today = formatDate(this.clock.now());

    return this.db.transaction(async (tx) => {
      // 1. Insert parent financial_record
      const recordId = await insertFinancialRecord(tx, {
        farm_id: farm.farm_id,
        type: 'Income',
        amount: data.amount,
        date: data.date,
        description: data.description || '',
        created_at: nowIso,
        updated_at: nowIso,
      });

      // 2. Insert child income row
      await insertIncome(tx, recordId);

      // 3. Recompute overall totals and upsert profitability in same transaction (R10)
      const totals = await getFinancialTotals(tx, farm.farm_id);
      await upsertOverallProfitability(tx, farm.farm_id, {
        total_expense: totals.total_expense,
        total_income: totals.total_income,
        net_profit: totals.net_profit,
        date: today,
        created_at: nowIso,
      });

      return findRecordById(tx, recordId);
    });
  }

  /**
   * Requirement: Expense.View
   * Section 12.8: GET /farms/:farmId/financial-records
   * @param {number} farmId
   * @param {Object} user
   * @param {Object} filters - { type, from, to }
   * @returns {Promise<Array<Object>>}
   */
  async getFinancialRecords(farmId, user, filters = {}) {
    await this._getAuthorizedFarm(farmId, user, false);
    return listFinancialRecords(this.db, farmId, filters);
  }

  /**
   * Requirement: Class update_record
   * Section 12.8: PUT /financial-records/:recordId
   * @param {number} recordId
   * @param {Object} user
   * @param {Object} data - { amount, date, description }
   * @returns {Promise<Object>}
   */
  async updateRecord(recordId, user, data) {
    if (user.user_type !== 'farmer') {
      throw AppError.forbidden('Only farmers can update financial records', 'FORBIDDEN');
    }

    const existing = await findRecordById(this.db, recordId);
    if (!existing) {
      throw AppError.notFound('Financial record not found', 'RECORD_NOT_FOUND');
    }

    // Verify ownership of the farm that owns this record
    await this._getAuthorizedFarm(existing.farm_id, user, true);

    const nowIso = this.clock.now().toISOString();
    const today = formatDate(this.clock.now());

    return this.db.transaction(async (tx) => {
      const updated = await updateFinancialRecord(tx, recordId, {
        amount: data.amount !== undefined ? data.amount : existing.amount,
        date: data.date !== undefined ? data.date : existing.date,
        description: data.description !== undefined ? data.description : existing.description,
        updated_at: nowIso,
      });

      // Recalculate overall profitability in the same transaction
      const totals = await getFinancialTotals(tx, existing.farm_id);
      await upsertOverallProfitability(tx, existing.farm_id, {
        total_expense: totals.total_expense,
        total_income: totals.total_income,
        net_profit: totals.net_profit,
        date: today,
        created_at: nowIso,
      });

      return updated;
    });
  }

  /**
   * Requirement: Class delete_record
   * Section 12.8: DELETE /financial-records/:recordId
   * @param {number} recordId
   * @param {Object} user
   * @returns {Promise<{ deleted: boolean, id: number }>}
   */
  async deleteRecord(recordId, user) {
    if (user.user_type !== 'farmer') {
      throw AppError.forbidden('Only farmers can delete financial records', 'FORBIDDEN');
    }

    const existing = await findRecordById(this.db, recordId);
    if (!existing) {
      throw AppError.notFound('Financial record not found', 'RECORD_NOT_FOUND');
    }

    // Verify ownership
    await this._getAuthorizedFarm(existing.farm_id, user, true);

    const nowIso = this.clock.now().toISOString();
    const today = formatDate(this.clock.now());

    await this.db.transaction(async (tx) => {
      await deleteFinancialRecord(tx, recordId);

      // Recalculate overall profitability in the same transaction
      const totals = await getFinancialTotals(tx, existing.farm_id);
      await upsertOverallProfitability(tx, existing.farm_id, {
        total_expense: totals.total_expense,
        total_income: totals.total_income,
        net_profit: totals.net_profit,
        date: today,
        created_at: nowIso,
      });
    });

    return { deleted: true, id: recordId };
  }

  /**
   * Requirement: View Financial Summary
   * Section 12.8: GET /farms/:farmId/financial-summary?start_date=&end_date=
   * @param {number} farmId
   * @param {Object} user
   * @param {Object} options - { start_date, end_date }
   * @returns {Promise<Object>}
   */
  async getFinancialSummary(farmId, user, { start_date = null, end_date = null } = {}) {
    await this._getAuthorizedFarm(farmId, user, false);

    if (start_date && end_date && start_date > end_date) {
      throw AppError.validation('start_date must not be after end_date', [
        { field: 'start_date', message: 'start_date must be on or before end_date' },
      ]);
    }

    const totals = await getFinancialTotals(this.db, farmId, {
      startDate: start_date,
      endDate: end_date,
    });

    return {
      farm_id: Number(farmId),
      start_date: start_date || null,
      end_date: end_date || null,
      total_income: totals.total_income,
      total_expense: totals.total_expense,
      net_profit: totals.net_profit,
      record_count: totals.record_count,
    };
  }
}
