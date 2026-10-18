import { round2 } from '../utils/round.js';

/**
 * FinancialRecord domain model mapped from Class Diagram and Section 8.
 * Requirement: R6, Expense.Add, Income.Add, Expense.View
 */
export class FinancialRecord {
  constructor({
    record_id = null,
    farm_id,
    type,
    amount,
    date,
    description = '',
    created_at = null,
    updated_at = null,
  }) {
    this.record_id = record_id ? Number(record_id) : null;
    this.farm_id = Number(farm_id);
    this.type = type; // 'Expense' | 'Income'
    this.amount = round2(amount);
    this.date = date;
    this.description = description || '';
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  // Operation from Class Diagram: view_record
  async viewRecord() {
    return this.toJSON();
  }

  // Operation from Class Diagram: update_record
  async updateRecord({ amount, date, description, updated_at }) {
    if (amount !== undefined) this.amount = round2(amount);
    if (date !== undefined) this.date = date;
    if (description !== undefined) this.description = description || '';
    if (updated_at !== undefined) this.updated_at = updated_at;
    return this.toJSON();
  }

  // Operation from Class Diagram: delete_record
  async deleteRecord() {
    return { deleted: true, id: this.record_id };
  }

  toJSON() {
    return {
      record_id: this.record_id,
      farm_id: this.farm_id,
      type: this.type,
      amount: this.amount,
      date: this.date,
      description: this.description,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  static fromRow(row) {
    if (!row) return null;
    return new FinancialRecord({
      record_id: row.record_id,
      farm_id: row.farm_id,
      type: row.type,
      amount: row.amount,
      date: row.date,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }
}
