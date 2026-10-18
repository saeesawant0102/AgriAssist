/**
 * Controller for Financial and Profitability endpoints.
 * Requirements: Expense.Add, Income.Add, Expense.View, Profit.Calculate, Profit.Report, Section 12.8
 */
export class FinanceController {
  /**
   * @param {Object} deps
   * @param {import('../services/financialService.js').FinancialService} deps.financialService
   * @param {import('../services/profitabilityService.js').ProfitabilityService} deps.profitabilityService
   * @param {import('../services/reportService.js').ReportService} deps.reportService
   */
  constructor({ financialService, profitabilityService, reportService }) {
    this.financialService = financialService;
    this.profitabilityService = profitabilityService;
    this.reportService = reportService;
  }

  // Requirement: Expense.Add
  addExpense = async (req, res, next) => {
    try {
      const farmId = Number(req.params.farmId);
      const data = await this.financialService.addExpense(farmId, req.user, req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Income.Add
  addIncome = async (req, res, next) => {
    try {
      const farmId = Number(req.params.farmId);
      const data = await this.financialService.addIncome(farmId, req.user, req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Expense.View
  getFinancialRecords = async (req, res, next) => {
    try {
      const farmId = Number(req.params.farmId);
      const filters = {
        type: req.query.type,
        from: req.query.from,
        to: req.query.to,
      };
      const data = await this.financialService.getFinancialRecords(farmId, req.user, filters);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Class update_record
  updateRecord = async (req, res, next) => {
    try {
      const recordId = Number(req.params.recordId);
      const data = await this.financialService.updateRecord(recordId, req.user, req.body);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Class delete_record
  deleteRecord = async (req, res, next) => {
    try {
      const recordId = Number(req.params.recordId);
      const data = await this.financialService.deleteRecord(recordId, req.user);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: View Financial Summary
  getFinancialSummary = async (req, res, next) => {
    try {
      const farmId = Number(req.params.farmId);
      const options = {
        start_date: req.query.start_date,
        end_date: req.query.end_date,
      };
      const data = await this.financialService.getFinancialSummary(farmId, req.user, options);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Profit.Calculate
  calculateProfit = async (req, res, next) => {
    try {
      const farmId = Number(req.params.farmId);
      const options = {
        start_date: req.body.start_date,
        end_date: req.body.end_date,
      };
      const data = await this.profitabilityService.calculateProfit(farmId, req.user, options);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Profit.Report
  getProfitabilityHistory = async (req, res, next) => {
    try {
      const farmId = Number(req.params.farmId);
      const data = await this.profitabilityService.getProfitabilityHistory(farmId, req.user);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Export Report dataset
  getFinancialReport = async (req, res, next) => {
    try {
      const farmId = Number(req.params.farmId);
      const options = {
        start_date: req.query.start_date,
        end_date: req.query.end_date,
      };
      const data = await this.reportService.getFinancialReportDataset(farmId, req.user, options);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };
}
