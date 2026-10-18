import { AppError } from '../errors/AppError.js';
import { findFarmById } from '../repositories/farmRepository.js';
import { getFinancialTotals } from '../repositories/financialRepository.js';
import {
  getProfitabilityHistory,
  insertDateRangeProfitability,
} from '../repositories/profitabilityRepository.js';
import { formatDate } from '../utils/dates.js';

/**
 * Service for Profitability calculation and history retrieval.
 * Requirements: Profit.Calculate, Profit.Report, BR-6, Section 12.8, Section 13.4
 */
export class ProfitabilityService {
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
      throw AppError.forbidden('Only farmers can calculate profitability', 'FORBIDDEN');
    }

    if (user.user_type === 'farmer' && farm.farmer_id !== user.farmer_id) {
      throw AppError.forbidden('Access denied to this farm', 'FORBIDDEN');
    }

    return farm;
  }

  /**
   * Requirement: Profit.Calculate, BR-6
   * Section 12.8: POST /farms/:farmId/profitability/calculate
   * Sequence Diagram 2: calculate_profit(start_date, end_date)
   * @param {number} farmId
   * @param {Object} user
   * @param {Object} options - { start_date, end_date }
   * @returns {Promise<Object>}
   */
  async calculateProfit(farmId, user, { start_date = null, end_date = null } = {}) {
    await this._getAuthorizedFarm(farmId, user, true);

    if (start_date && end_date && start_date > end_date) {
      throw AppError.validation('start_date must not be after end_date', [
        { field: 'start_date', message: 'start_date must be on or before end_date' },
      ]);
    }

    const totals = await getFinancialTotals(this.db, farmId, {
      startDate: start_date,
      endDate: end_date,
    });

    const today = formatDate(this.clock.now());
    const nowIso = this.clock.now().toISOString();

    const record = await insertDateRangeProfitability(this.db, {
      farm_id: farmId,
      start_date,
      end_date,
      total_expense: totals.total_expense,
      total_income: totals.total_income,
      net_profit: totals.net_profit,
      date: today,
      created_at: nowIso,
    });

    return {
      profit_id: record.profit_id,
      farm_id: Number(farmId),
      total_expense: record.total_expense,
      total_income: record.total_income,
      net_profit: record.net_profit,
      start_date: record.start_date,
      end_date: record.end_date,
      date: record.date,
    };
  }

  /**
   * Requirement: Profit.Report, view_profit
   * Section 12.8: GET /farms/:farmId/profitability
   * @param {number} farmId
   * @param {Object} user
   * @returns {Promise<Array<import('../models/Profitability.js').Profitability>>}
   */
  async getProfitabilityHistory(farmId, user) {
    await this._getAuthorizedFarm(farmId, user, false);
    return getProfitabilityHistory(this.db, farmId);
  }
}
