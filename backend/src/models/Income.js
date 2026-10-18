import { FinancialRecord } from './FinancialRecord.js';

/**
 * Income domain model extending FinancialRecord.
 * Requirement: Income.Add, Section 8
 */
export class Income extends FinancialRecord {
  constructor({
    income_id = null,
    record_id = null,
    farm_id,
    amount,
    date,
    description = '',
    created_at = null,
    updated_at = null,
  }) {
    super({
      record_id,
      farm_id,
      type: 'Income',
      amount,
      date,
      description,
      created_at,
      updated_at,
    });
    this.income_id = income_id ? Number(income_id) : null;
  }

  // Operation from Class Diagram: add_income
  async addIncome() {
    return this.toJSON();
  }

  toJSON() {
    return {
      ...super.toJSON(),
      income_id: this.income_id,
    };
  }

  static fromRow(row) {
    if (!row) return null;
    return new Income({
      income_id: row.income_id,
      record_id: row.record_id,
      farm_id: row.farm_id,
      amount: row.amount,
      date: row.date,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }
}
