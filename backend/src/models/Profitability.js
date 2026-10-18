import { round2 } from '../utils/round.js';

/**
 * Profitability domain model mapped from Class Diagram and Section 8.
 * Requirement: R10, Profit.Calculate, Profit.Report, BR-6, Section 13.4
 */
export class Profitability {
  constructor({
    profit_id = null,
    farm_id,
    start_date = null,
    end_date = null,
    total_expense = 0,
    total_income = 0,
    net_profit = 0,
    date,
    is_overall = 0,
    created_at = null,
  }) {
    this.profit_id = profit_id ? Number(profit_id) : null;
    this.farm_id = Number(farm_id);
    this.start_date = start_date || null;
    this.end_date = end_date || null;
    this.total_expense = round2(total_expense);
    this.total_income = round2(total_income);
    this.net_profit = round2(net_profit);
    this.date = date;
    this.is_overall = Number(is_overall) ? 1 : 0;
    this.created_at = created_at;
  }

  // Operation from Class Diagram: calculate_profit
  async calculateProfit(startDate = null, endDate = null) {
    return {
      farm_id: this.farm_id,
      start_date: startDate,
      end_date: endDate,
      total_expense: this.total_expense,
      total_income: this.total_income,
      net_profit: this.net_profit,
    };
  }

  toJSON() {
    return {
      profit_id: this.profit_id,
      farm_id: this.farm_id,
      start_date: this.start_date,
      end_date: this.end_date,
      total_expense: this.total_expense,
      total_income: this.total_income,
      net_profit: this.net_profit,
      date: this.date,
      is_overall: this.is_overall,
      created_at: this.created_at,
    };
  }

  static fromRow(row) {
    if (!row) return null;
    return new Profitability({
      profit_id: row.profit_id,
      farm_id: row.farm_id,
      start_date: row.start_date,
      end_date: row.end_date,
      total_expense: row.total_expense,
      total_income: row.total_income,
      net_profit: row.net_profit,
      date: row.date,
      is_overall: row.is_overall,
      created_at: row.created_at,
    });
  }
}
