import { FinancialRecord } from './FinancialRecord.js';

/**
 * Expense domain model extending FinancialRecord.
 * Requirement: Expense.Add, Expense.View, Section 8
 */
export class Expense extends FinancialRecord {
  constructor({
    expense_id = null,
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
      type: 'Expense',
      amount,
      date,
      description,
      created_at,
      updated_at,
    });
    this.expense_id = expense_id ? Number(expense_id) : null;
  }

  // Operation from Class Diagram: add_expense
  async addExpense() {
    return this.toJSON();
  }

  toJSON() {
    return {
      ...super.toJSON(),
      expense_id: this.expense_id,
    };
  }

  static fromRow(row) {
    if (!row) return null;
    return new Expense({
      expense_id: row.expense_id,
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
