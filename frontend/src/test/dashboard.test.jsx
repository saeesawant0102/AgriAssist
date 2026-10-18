import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as dashboardApi from '../features/dashboard/api.js';
import { FarmerDashboard } from '../features/dashboard/pages/FarmerDashboard.jsx';
import * as reportsApi from '../features/reports/api.js';
import { Reports } from '../features/reports/pages/Reports.jsx';

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

describe('Frontend Dashboard & Reports Component Tests (Feature 7)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('FarmerDashboard Page', () => {
    it('Farmer.view_dashboard: renders summary cards, advisory card, and navigation', async () => {
      vi.spyOn(dashboardApi, 'getDashboardApi').mockResolvedValue({
        farm_count: 3,
        crop_count: 5,
        overall_net_profit: 14250.5,
        next_irrigation_date: '2026-10-22',
        latest_advisory: {
          advisory_id: 1,
          crop_name: 'Wheat',
          farm_name: 'Green Field',
          recommendation: 'Cold spell expected',
          message: 'Protect crops from night frost.',
          date: '2026-10-19',
        },
      });

      render(
        <MemoryRouter>
          <FarmerDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Farmer Dashboard/i)).toBeInTheDocument();
      });

      // Stat cards
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText(/14,250.50/)).toBeInTheDocument();
      expect(screen.getByText('2026-10-22')).toBeInTheDocument();

      // Advisory
      expect(screen.getByText(/Cold spell expected/i)).toBeInTheDocument();
      expect(screen.getByText(/Protect crops from night frost/i)).toBeInTheDocument();
      expect(screen.getByText('Wheat')).toBeInTheDocument();

      // Quick Nav
      expect(screen.getByText(/Weather Forecast/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Crop Advisory/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Irrigation/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Record Finances/i)).toBeInTheDocument();
      expect(screen.getByText(/Farm Reports/i)).toBeInTheDocument();
    });

    it('Farmer.view_dashboard: renders graceful empty state when farmer has no advisory or schedules', async () => {
      vi.spyOn(dashboardApi, 'getDashboardApi').mockResolvedValue({
        farm_count: 0,
        crop_count: 0,
        overall_net_profit: 0,
        next_irrigation_date: null,
        latest_advisory: null,
      });

      render(
        <MemoryRouter>
          <FarmerDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Farmer Dashboard/i)).toBeInTheDocument();
      });

      expect(screen.getByText('None scheduled')).toBeInTheDocument();
      expect(screen.getByText(/No crop advisory generated yet/i)).toBeInTheDocument();
    });
  });

  describe('Farmer Reports Page', () => {
    it('Farmer.view_reports: renders farm profitability list and aggregate summary totals', async () => {
      vi.spyOn(reportsApi, 'getProfitabilityReportsApi').mockResolvedValue([
        {
          farm_id: 1,
          farm_name: 'Sunrise Valley',
          location: 'Pune',
          area: 10,
          total_income: 25000,
          total_expense: 10000,
          net_profit: 15000,
          date: '2026-10-01',
        },
        {
          farm_id: 2,
          farm_name: 'River Orchard',
          location: 'Nashik',
          area: 5,
          total_income: 8000,
          total_expense: 12000,
          net_profit: -4000,
          date: '2026-10-05',
        },
      ]);

      render(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Farm Profitability Reports/i)).toBeInTheDocument();
      });

      // Table rows
      expect(screen.getByText('Sunrise Valley')).toBeInTheDocument();
      expect(screen.getByText('River Orchard')).toBeInTheDocument();

      // Aggregate totals (Total income: 33,000, Total expense: 22,000, Combined: 11,000)
      expect(screen.getByText(/33,000.00/)).toBeInTheDocument();
      expect(screen.getByText(/22,000.00/)).toBeInTheDocument();
      expect(screen.getByText(/11,000.00/)).toBeInTheDocument();
    });

    it('Farmer.view_reports: displays empty state when farmer has no registered farms', async () => {
      vi.spyOn(reportsApi, 'getProfitabilityReportsApi').mockResolvedValue([]);

      render(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No farms registered/i)).toBeInTheDocument();
      });
    });
  });
});
