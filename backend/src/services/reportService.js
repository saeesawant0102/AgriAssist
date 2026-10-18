import { AppError } from '../errors/AppError.js';
import { findFarmById } from '../repositories/farmRepository.js';
import {
  getFinancialTotals,
  listFinancialRecords,
} from '../repositories/financialRepository.js';

/**
 * Service for generating comprehensive report datasets.
 * Requirements: Export Report, D13, Section 12.8
 */
export class ReportService {
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
   * Generates the financial report dataset for a farm.
   * Section 12.8: GET /farms/:farmId/reports/financial?start_date=&end_date=
   * @param {number} farmId
   * @param {Object} user
   * @param {Object} options - { start_date, end_date }
   * @returns {Promise<Object>}
   */
  async getFinancialReportDataset(farmId, user, { start_date = null, end_date = null } = {}) {
    const farm = await findFarmById(this.db, farmId);
    if (!farm) {
      throw AppError.notFound('Farm not found', 'FARM_NOT_FOUND');
    }

    if (user.user_type === 'farmer' && farm.farmer_id !== user.farmer_id) {
      throw AppError.forbidden('Access denied to this farm', 'FORBIDDEN');
    }

    if (start_date && end_date && start_date > end_date) {
      throw AppError.validation('start_date must not be after end_date', [
        { field: 'start_date', message: 'start_date must be on or before end_date' },
      ]);
    }

    const filters = {};
    if (start_date) filters.from = start_date;
    if (end_date) filters.to = end_date;

    const [records, totals] = await Promise.all([
      listFinancialRecords(this.db, farmId, filters),
      getFinancialTotals(this.db, farmId, {
        startDate: start_date,
        endDate: end_date,
      }),
    ]);

    return {
      farm: {
        farm_id: farm.farm_id,
        farm_name: farm.farm_name,
        location: farm.location,
        area: farm.area,
      },
      period: {
        start_date: start_date || null,
        end_date: end_date || null,
      },
      records: records.map((r) => r.toJSON()),
      totals: {
        total_income: totals.total_income,
        total_expense: totals.total_expense,
        net_profit: totals.net_profit,
        record_count: totals.record_count,
      },
      generated_at: this.clock.now().toISOString(),
    };
  }
}
