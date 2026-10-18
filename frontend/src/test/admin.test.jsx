import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as adminApi from '../features/admin/api.js';
import { AdminDashboard } from '../features/admin/pages/AdminDashboard.jsx';
import { AllReports } from '../features/admin/pages/AllReports.jsx';
import { FarmerAccountDetails } from '../features/admin/pages/FarmerAccountDetails.jsx';
import { FarmerAccounts } from '../features/admin/pages/FarmerAccounts.jsx';

// Mock AuthContext
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { uid: 'test-admin-uid' },
    profile: {
      name: 'System Admin',
      email: 'admin@example.com',
      user_type: 'administrator',
      admin_id: 1,
      role: 'superadmin',
    },
    loading: false,
  }),
}));

describe('Frontend Administrator Component Tests (Feature 7 / Section 12.10)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('AdminDashboard Page', () => {
    it('Administrator.manage_system (D8): renders system statistics cards and module navigation', async () => {
      vi.spyOn(adminApi, 'getAdminStatsApi').mockResolvedValue({
        farmer_count: 14,
        farm_count: 28,
        crop_count: 42,
        financial_record_count: 85,
      });

      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Administrator Dashboard/i)).toBeInTheDocument();
      });

      expect(screen.getByText('14')).toBeInTheDocument();
      expect(screen.getByText('28')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();

      expect(screen.getAllByText(/Farmer Accounts/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/All Farms & Parcels/i)).toBeInTheDocument();
      expect(screen.getByText(/All Financial Reports/i)).toBeInTheDocument();
    });
  });

  describe('FarmerAccounts Page', () => {
    it('Administrator.manage_users: renders list with status filter and keyset pagination controls', async () => {
      const getSpy = vi.spyOn(adminApi, 'getAdminUsersApi').mockResolvedValue({
        data: [
          {
            user_id: 10,
            farmer_id: 5,
            name: 'Ramesh Patil',
            email: 'ramesh@example.com',
            phone: '+919876543210',
            address: 'Pune',
            farm_count: 2,
            status: 'active',
            created_at: '2026-03-01T10:00:00Z',
          },
          {
            user_id: 8,
            farmer_id: 4,
            name: 'Suresh Deshmukh',
            email: 'suresh@example.com',
            phone: null,
            address: null,
            farm_count: 0,
            status: 'disabled',
            created_at: '2026-02-15T10:00:00Z',
          },
        ],
        next_cursor: 8,
      });

      render(
        <MemoryRouter>
          <FarmerAccounts />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Ramesh Patil')).toBeInTheDocument();
      });

      expect(screen.getByText('suresh@example.com')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Disabled')).toBeInTheDocument();

      // Next Page button should be enabled because next_cursor is present
      const nextBtn = screen.getByRole('button', { name: /Next Page/i });
      expect(nextBtn).toBeEnabled();

      // Filter change triggers fetch with status
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'disabled' } });

      await waitFor(() => {
        expect(getSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'disabled' }));
      });
    });
  });

  describe('FarmerAccountDetails Page', () => {
    it('Administrator.manage_users: renders details and handles profile update form submit', async () => {
      vi.spyOn(adminApi, 'getAdminUserByIdApi').mockResolvedValue({
        user_id: 5,
        farmer_id: 2,
        name: 'Ganesh Shinde',
        email: 'ganesh@example.com',
        phone: '9822000000',
        address: 'Baramati',
        farm_count: 3,
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
      });

      const updateSpy = vi.spyOn(adminApi, 'updateAdminUserApi').mockResolvedValue({
        user_id: 5,
        farmer_id: 2,
        name: 'Ganesh R. Shinde',
        email: 'ganesh@example.com',
        phone: '+919822000000',
        address: 'Baramati MIDC',
        farm_count: 3,
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
      });

      render(
        <MemoryRouter initialEntries={['/admin/users/5']}>
          <Routes>
            <Route path="/admin/users/:userId" element={<FarmerAccountDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Ganesh Shinde')).toBeInTheDocument();
      });

      expect(screen.getByText('ganesh@example.com')).toBeInTheDocument();

      const nameInput = screen.getByLabelText(/Full Name/i);
      fireEvent.change(nameInput, { target: { value: 'Ganesh R. Shinde' } });

      const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith('5', expect.objectContaining({
          name: 'Ganesh R. Shinde',
        }));
      });
    });
  });

  describe('AllReports Page', () => {
    it('Administrator.view_all_reports (D9): renders all farms profitability list and system totals', async () => {
      vi.spyOn(adminApi, 'getAdminReportsApi').mockResolvedValue([
        {
          profit_id: 1,
          farm_id: 101,
          farm_name: 'Western Green',
          location: 'Kolhapur',
          farmer_name: 'Anand Rao',
          farmer_email: 'anand@example.com',
          total_income: 45000,
          total_expense: 15000,
          net_profit: 30000,
          date: '2026-10-10',
        },
      ]);

      render(
        <MemoryRouter>
          <AllReports />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/System Profitability Reports/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Western Green')).toBeInTheDocument();
      expect(screen.getByText('Anand Rao')).toBeInTheDocument();
      expect(screen.getByText('anand@example.com')).toBeInTheDocument();
      expect(screen.getAllByText(/30,000.00/).length).toBeGreaterThanOrEqual(1);
    });
  });
});
