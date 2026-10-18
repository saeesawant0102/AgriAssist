/**
 * Controller for Farmer Dashboard and Reports.
 * Requirements: Farmer.view_dashboard, Farmer.view_reports, Section 12.9
 */
export class DashboardController {
  /**
   * @param {Object} deps
   * @param {import('../services/dashboardService.js').DashboardService} deps.dashboardService
   */
  constructor({ dashboardService }) {
    this.dashboardService = dashboardService;
  }

  // Requirement: GET /api/v1/dashboard
  getDashboard = async (req, res, next) => {
    try {
      const data = await this.dashboardService.getFarmerDashboard(req.user);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: GET /api/v1/reports/profitability
  getReports = async (req, res, next) => {
    try {
      const data = await this.dashboardService.getFarmerReports(req.user);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };
}
