import { Router } from 'express';
import { FinanceController } from '../controllers/financeController.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { FinancialService } from '../services/financialService.js';
import { ProfitabilityService } from '../services/profitabilityService.js';
import { ReportService } from '../services/reportService.js';
import {
  calculateProfitSchema,
  farmIdParamSchema,
  recordIdParamSchema,
  recordInputSchema,
  updateRecordSchema,
} from '../validators/financeValidators.js';

/**
 * Creates sub-router for farm finance endpoints mounted under /api/v1/farms/:farmId
 * @param {Object} deps
 * @returns {Router}
 */
export function createFarmFinanceRouter(deps) {
  const router = Router({ mergeParams: true });
  const financialService = new FinancialService(deps);
  const profitabilityService = new ProfitabilityService(deps);
  const reportService = new ReportService(deps);
  const controller = new FinanceController({
    financialService,
    profitabilityService,
    reportService,
  });
  const authenticate = createAuthenticateMiddleware(deps.db, deps.authGateway);

  // Requirement: Expense.Add (POST /farms/:farmId/expenses)
  router.post(
    '/expenses',
    authenticate,
    requireRole('farmer'),
    validate(farmIdParamSchema, 'params'),
    validate(recordInputSchema),
    controller.addExpense
  );

  // Requirement: Income.Add (POST /farms/:farmId/incomes)
  router.post(
    '/incomes',
    authenticate,
    requireRole('farmer'),
    validate(farmIdParamSchema, 'params'),
    validate(recordInputSchema),
    controller.addIncome
  );

  // Requirement: Expense.View (GET /farms/:farmId/financial-records)
  router.get(
    '/financial-records',
    authenticate,
    requireRole('farmer', 'administrator'),
    validate(farmIdParamSchema, 'params'),
    controller.getFinancialRecords
  );

  // Requirement: View Financial Summary (GET /farms/:farmId/financial-summary)
  router.get(
    '/financial-summary',
    authenticate,
    requireRole('farmer', 'administrator'),
    validate(farmIdParamSchema, 'params'),
    controller.getFinancialSummary
  );

  // Requirement: Profit.Calculate (POST /farms/:farmId/profitability/calculate)
  router.post(
    '/profitability/calculate',
    authenticate,
    requireRole('farmer'),
    validate(farmIdParamSchema, 'params'),
    validate(calculateProfitSchema),
    controller.calculateProfit
  );

  // Requirement: Profit.Report (GET /farms/:farmId/profitability)
  router.get(
    '/profitability',
    authenticate,
    requireRole('farmer', 'administrator'),
    validate(farmIdParamSchema, 'params'),
    controller.getProfitabilityHistory
  );

  // Requirement: Export Report dataset (GET /farms/:farmId/reports/financial)
  router.get(
    '/reports/financial',
    authenticate,
    requireRole('farmer', 'administrator'),
    validate(farmIdParamSchema, 'params'),
    controller.getFinancialReport
  );

  return router;
}

/**
 * Creates router for standalone financial record mutations mounted at /api/v1/financial-records
 * @param {Object} deps
 * @returns {Router}
 */
export function createFinancialRecordRouter(deps) {
  const router = Router();
  const financialService = new FinancialService(deps);
  const profitabilityService = new ProfitabilityService(deps);
  const reportService = new ReportService(deps);
  const controller = new FinanceController({
    financialService,
    profitabilityService,
    reportService,
  });
  const authenticate = createAuthenticateMiddleware(deps.db, deps.authGateway);

  // Requirement: Class update_record (PUT /financial-records/:recordId)
  router.put(
    '/:recordId',
    authenticate,
    requireRole('farmer'),
    validate(recordIdParamSchema, 'params'),
    validate(updateRecordSchema),
    controller.updateRecord
  );

  // Requirement: Class delete_record (DELETE /financial-records/:recordId)
  router.delete(
    '/:recordId',
    authenticate,
    requireRole('farmer'),
    validate(recordIdParamSchema, 'params'),
    controller.deleteRecord
  );

  return router;
}
