import { AppError } from '../errors/AppError.js';
import { countCropsByFarmerId } from '../repositories/cropRepository.js';
import {
  getLatestAdvisoryForFarmer,
  getNextIrrigationDateForFarmer,
  getOverallNetProfitForFarmer,
} from '../repositories/dashboardRepository.js';
import { countFarmsByFarmerId } from '../repositories/farmRepository.js';
import { getFarmerFarmsOverallProfitability } from '../repositories/profitabilityRepository.js';

/**
 * Service for Farmer Dashboard and Reports.
 * Requirements: Farmer.view_dashboard (D10), Farmer.view_reports (D11), Section 12.9
 */
export class DashboardService {
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
   * Retrieves dashboard statistics and summary for the authenticated farmer.
   * Requirement: Farmer.view_dashboard, D10, Section 12.9
   * @param {Object} user
   * @returns {Promise<Object>}
   */
  async getFarmerDashboard(user) {
    if (user.user_type !== 'farmer' || !user.farmer_id) {
      throw AppError.forbidden('Farmer access required', 'FORBIDDEN');
    }

    const todayDate = this.clock.now().toISOString().split('T')[0];

    const [farmCount, cropCount, latestAdvisory, nextIrrigationDate, overallNetProfit] =
      await Promise.all([
        countFarmsByFarmerId(this.db, user.farmer_id),
        countCropsByFarmerId(this.db, user.farmer_id),
        getLatestAdvisoryForFarmer(this.db, user.farmer_id),
        getNextIrrigationDateForFarmer(this.db, user.farmer_id, todayDate),
        getOverallNetProfitForFarmer(this.db, user.farmer_id),
      ]);

    return {
      farm_count: farmCount,
      crop_count: cropCount,
      latest_advisory: latestAdvisory,
      next_irrigation_date: nextIrrigationDate,
      overall_net_profit: overallNetProfit,
    };
  }

  /**
   * Retrieves overall profitability for each of the farmer's farms.
   * Requirement: Farmer.view_reports, D11, Section 12.9
   * @param {Object} user
   * @returns {Promise<Array<Object>>}
   */
  async getFarmerReports(user) {
    if (user.user_type !== 'farmer' || !user.farmer_id) {
      throw AppError.forbidden('Farmer access required', 'FORBIDDEN');
    }

    return getFarmerFarmsOverallProfitability(this.db, user.farmer_id);
  }
}
