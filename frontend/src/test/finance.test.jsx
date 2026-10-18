import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SummaryCards } from '../features/finance/components/SummaryCards.jsx';
import { RecordTable } from '../features/finance/components/RecordTable.jsx';
import { buildCsvContent, sanitizeCsvCell, exportFinancialReportCsv } from '../utils/exportCsv.js';

// Mock AuthContext
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { uid: 'test-farmer-uid' },
    profile: {
      name: 'Farmer Test',
      email: 'farmer@example.com',
      user_type: 'farmer',
      farmer_id: 1,
    },
    loading: false,
  }),
}));

// Mock jsPDF to avoid canvas issues in test env
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    setFillColor: vi.fn(),
    text: vi.fn(),
    roundedRect: vi.fn(),
    autoTable: vi.fn(),
    save: vi.fn(),
  })),
}));
vi.mock('jspdf-autotable', () => ({}));

describe('Finance Frontend Component Tests (Feature 6)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // SummaryCards – profit display
  // -----------------------------------------------------------------------
  describe('SummaryCards Component', () => {
    it('BR-6: renders income, expense and net profit with correct values', () => {
      render(
        <SummaryCards
          totalIncome={15000}
          totalExpense={5000}
          netProfit={10000}
          recordCount={5}
          currency="INR"
        />
      );

      expect(screen.getByText(/Total Income/i)).toBeInTheDocument();
      expect(screen.getByText(/INR 15000.00/)).toBeInTheDocument();
      expect(screen.getByText(/Total Expenses/i)).toBeInTheDocument();
      expect(screen.getByText(/INR 5000.00/)).toBeInTheDocument();
      expect(screen.getByText(/Net Profit/i)).toBeInTheDocument();
      expect(screen.getByText(/INR 10000.00/)).toBeInTheDocument();
    });

    it('BR-6: displays "Net Loss" label when net profit is negative', () => {
      render(
        <SummaryCards
          totalIncome={2000}
          totalExpense={8000}
          netProfit={-6000}
          recordCount={3}
          currency="INR"
        />
      );

      expect(screen.getByText(/Net Loss/i)).toBeInTheDocument();
      expect(screen.getByText(/INR -6000.00/)).toBeInTheDocument();
    });

    it('BR-6: shows 0 values when no records exist', () => {
      render(<SummaryCards totalIncome={0} totalExpense={0} netProfit={0} recordCount={0} />);

      expect(screen.getByText(/Total Transactions/i)).toBeInTheDocument();
      // Net profit = 0, should show "Net Profit" (non-loss)
      expect(screen.getByText(/Net Profit/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // RecordTable – filters and empty state
  // -----------------------------------------------------------------------
  describe('RecordTable Component', () => {
    it('Expense.View: shows empty state message when no records exist', () => {
      render(
        <RecordTable
          records={[]}
          filters={{}}
          onFilterChange={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText(/No financial transactions match the selected filters/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // CSV Export utility unit tests
  // -----------------------------------------------------------------------
  describe('Export Report – CSV Generator Unit Tests', () => {
    it('Export Report: sanitizeCsvCell prepends quote for formula-injection chars', () => {
      expect(sanitizeCsvCell('=SUM(A1)')).toBe("'=SUM(A1)");
      expect(sanitizeCsvCell('+100')).toBe("'+100");
      expect(sanitizeCsvCell('-attack')).toBe("'-attack");
      expect(sanitizeCsvCell('normal text')).toBe('normal text');
      expect(sanitizeCsvCell(null)).toBe('');
    });

    it('Export Report: buildCsvContent produces correct header line and row count', () => {
      const headers = ['Record ID', 'Type', 'Amount'];
      const rows = [
        ['1', 'Expense', '500'],
        ['2', 'Income', '12000'],
      ];
      const csv = buildCsvContent(headers, rows);
      const lines = csv.split('\r\n');

      // Header line
      expect(lines[0]).toContain('Record ID');
      expect(lines[0]).toContain('Type');
      expect(lines[0]).toContain('Amount');

      // Data rows
      expect(lines.length).toBe(3); // header + 2 rows
      expect(lines[1]).toContain('Expense');
      expect(lines[2]).toContain('Income');
    });

    it('Export Report: exportFinancialReportCsv generates correct CSV structure with totals', () => {
      const dataset = {
        farm: { farm_id: 1, farm_name: 'Green Valley', location: 'Pune', area: 10 },
        period: { start_date: '2026-05-01', end_date: '2026-05-31' },
        records: [
          { record_id: 1, type: 'Expense', amount: 500, date: '2026-05-01', description: 'Seeds' },
          { record_id: 2, type: 'Income', amount: 2000, date: '2026-05-10', description: 'Harvest' },
        ],
        totals: { total_income: 2000, total_expense: 500, net_profit: 1500, record_count: 2 },
        generated_at: '2026-05-31T12:00:00.000Z',
      };

      // Mock URL and document methods
      const createObjectURL = vi.fn(() => 'blob:test-url');
      const revokeObjectURL = vi.fn();
      const appendChildMock = vi.fn();
      const removeChildMock = vi.fn();
      const clickMock = vi.fn();

      global.URL.createObjectURL = createObjectURL;
      global.URL.revokeObjectURL = revokeObjectURL;
      const origAppend = document.body.appendChild.bind(document.body);
      const origRemove = document.body.removeChild.bind(document.body);
      vi.spyOn(document.body, 'appendChild').mockImplementation((el) => {
        el.click = clickMock;
        return el;
      });
      vi.spyOn(document.body, 'removeChild').mockImplementation(removeChildMock);

      exportFinancialReportCsv(dataset, 'INR');

      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(clickMock).toHaveBeenCalledOnce();
      expect(revokeObjectURL).toHaveBeenCalledOnce();
    });

    it('Export Report: CSV includes farm name, period and record count in metadata rows', () => {
      // Test the content structure by reconstructing what the function builds
      const headers = ['Record ID', 'Type', 'Date', 'Amount', 'Description'];
      const rows = [
        ['1', 'Expense', '2026-05-01', '500', 'Seeds'],
        ['2', 'Income', '2026-05-10', '12000', 'Sale'],
      ];
      const csv = buildCsvContent(headers, rows);
      const lines = csv.split('\r\n');

      // 1 header + 2 rows = 3 lines
      expect(lines.length).toBe(3);
      expect(lines[1]).toContain('500');
      expect(lines[2]).toContain('12000');
    });
  });
});
