-- Migration 006_finance.sql (Phase 6 - Financial Records & Profitability)
-- Requirement: Expense.Add, Income.Add, Expense.View, Profit.Calculate, Profit.Report, BR-6, Section 9.8

CREATE TABLE financial_records (
  record_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  farm_id     INTEGER NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  type        TEXT    NOT NULL CHECK (type IN ('Expense','Income')),
  amount      REAL    NOT NULL CHECK (amount > 0),
  date        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);
CREATE INDEX idx_fin_farm_date      ON financial_records (farm_id, date DESC);
CREATE INDEX idx_fin_farm_type_date ON financial_records (farm_id, type, date DESC);

CREATE TABLE expenses (
  expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id  INTEGER NOT NULL UNIQUE REFERENCES financial_records(record_id) ON DELETE CASCADE
);

CREATE TABLE incomes (
  income_id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL UNIQUE REFERENCES financial_records(record_id) ON DELETE CASCADE
);

CREATE TABLE profitability (
  profit_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  farm_id       INTEGER NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  start_date    TEXT,
  end_date      TEXT,
  total_expense REAL    NOT NULL,
  total_income  REAL    NOT NULL,
  net_profit    REAL    NOT NULL,
  date          TEXT    NOT NULL,
  is_overall    INTEGER NOT NULL DEFAULT 0 CHECK (is_overall IN (0,1)),
  created_at    TEXT    NOT NULL
);
CREATE INDEX idx_profit_farm ON profitability (farm_id, profit_id DESC);
CREATE UNIQUE INDEX idx_profit_overall ON profitability (farm_id) WHERE is_overall = 1;
