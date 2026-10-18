import { describe, expect, it } from 'vitest';
import { Expense } from '../../src/models/Expense.js';
import { FinancialRecord } from '../../src/models/FinancialRecord.js';
import { Income } from '../../src/models/Income.js';
import { Profitability } from '../../src/models/Profitability.js';
import { round2 } from '../../src/utils/round.js';

describe('Financial & Profitability Domain Models Unit Tests (Feature 6)', () => {
  it('Expense.Add: initializes Expense model with parent attributes and expense_id', () => {
    const expense = new Expense({
      expense_id: 1,
      record_id: 10,
      farm_id: 5,
      amount: 1250.5,
      date: '2026-05-10',
      description: 'Organic fertilizer 50kg',
      created_at: '2026-05-10T09:00:00.000Z',
      updated_at: '2026-05-10T09:00:00.000Z',
    });

    expect(expense.type).toBe('Expense');
    expect(expense.amount).toBe(1250.5);
    expect(expense.expense_id).toBe(1);
    expect(expense.record_id).toBe(10);
    expect(expense.farm_id).toBe(5);

    const json = expense.toJSON();
    expect(json.expense_id).toBe(1);
    expect(json.type).toBe('Expense');
    expect(json.amount).toBe(1250.5);
  });

  it('Income.Add: initializes Income model with parent attributes and income_id', () => {
    const income = new Income({
      income_id: 2,
      record_id: 11,
      farm_id: 5,
      amount: 45000.75,
      date: '2026-05-12',
      description: 'Harvest crop sale to cooperative',
      created_at: '2026-05-12T14:00:00.000Z',
      updated_at: '2026-05-12T14:00:00.000Z',
    });

    expect(income.type).toBe('Income');
    expect(income.amount).toBe(45000.75);
    expect(income.income_id).toBe(2);
    expect(income.record_id).toBe(11);

    const json = income.toJSON();
    expect(json.income_id).toBe(2);
    expect(json.type).toBe('Income');
    expect(json.amount).toBe(45000.75);
  });

  it('BR-6: computes net profit as total_income minus total_expense with two-decimal precision', () => {
    const income = 15000.555;
    const expense = 5400.123;
    const roundedIncome = round2(income);
    const roundedExpense = round2(expense);
    const netProfit = round2(roundedIncome - roundedExpense);

    expect(roundedIncome).toBe(15000.56);
    expect(roundedExpense).toBe(5400.12);
    expect(netProfit).toBe(9600.44);

    const prof = new Profitability({
      farm_id: 1,
      total_income: roundedIncome,
      total_expense: roundedExpense,
      net_profit: netProfit,
      date: '2026-05-15',
      is_overall: 1,
    });

    expect(prof.total_income).toBe(15000.56);
    expect(prof.total_expense).toBe(5400.12);
    expect(prof.net_profit).toBe(9600.44);
    expect(prof.is_overall).toBe(1);
  });

  it('BR-6: handles operating loss (negative net profit) correctly', () => {
    const income = 2000.0;
    const expense = 8500.5;
    const netProfit = round2(income - expense);

    expect(netProfit).toBe(-6500.5);

    const prof = new Profitability({
      farm_id: 2,
      total_income: income,
      total_expense: expense,
      net_profit: netProfit,
      date: '2026-05-15',
      is_overall: 0,
      start_date: '2026-05-01',
      end_date: '2026-05-15',
    });

    expect(prof.net_profit).toBe(-6500.5);
    expect(prof.is_overall).toBe(0);
    expect(prof.start_date).toBe('2026-05-01');
    expect(prof.end_date).toBe('2026-05-15');
  });

  it('Class update_record: updates amount, date, description while keeping type immutable', async () => {
    const record = new FinancialRecord({
      record_id: 20,
      farm_id: 3,
      type: 'Expense',
      amount: 100,
      date: '2026-05-01',
      description: 'Seeds',
    });

    await record.updateRecord({
      amount: 150.25,
      date: '2026-05-02',
      description: 'Premium Seeds',
      updated_at: '2026-05-02T10:00:00.000Z',
    });

    expect(record.amount).toBe(150.25);
    expect(record.date).toBe('2026-05-02');
    expect(record.description).toBe('Premium Seeds');
    expect(record.type).toBe('Expense'); // Immutable
  });
});
