import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminFarms } from '../features/admin/pages/AdminFarms.jsx';
import * as farmApi from '../features/farms/api.js';
import { FarmForm } from '../features/farms/components/FarmForm.jsx';
import { FarmDetails } from '../features/farms/pages/FarmDetails.jsx';
import { FarmList } from '../features/farms/pages/FarmList.jsx';

// Mock AuthContext
let mockProfile = {
  name: 'Test Farmer',
  email: 'farmer@example.com',
  user_type: 'farmer',
  farmer_id: 1,
};

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { uid: 'test-uid' },
    profile: mockProfile,
    loading: false,
  }),
}));

describe('Frontend Farm Management Component Tests (Feature 2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockProfile = {
      name: 'Test Farmer',
      email: 'farmer@example.com',
      user_type: 'farmer',
      farmer_id: 1,
    };
  });

  it('Farm.Validate: displays validation errors for missing and invalid fields', async () => {
    const onSubmit = vi.fn();
    render(<FarmForm onSubmit={onSubmit} />);

    const submitBtn = screen.getByRole('button', { name: /save farm/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/farm name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/location is required/i)).toBeInTheDocument();
    expect(screen.getByText(/area must be a positive number/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('BR-1: rejects area <= 0 with validation message', async () => {
    const onSubmit = vi.fn();
    render(<FarmForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/^farm name/i), {
      target: { value: 'Green Farm' },
    });
    fireEvent.change(screen.getByLabelText(/^location/i), {
      target: { value: 'Pune' },
    });
    fireEvent.change(screen.getByLabelText(/farm area/i), {
      target: { value: '0' },
    });

    const submitBtn = screen.getByRole('button', { name: /save farm/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/area must be a positive number/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Farm.Add: submits valid farm details without manual coordinates', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    render(<FarmForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/^farm name/i), {
      target: { value: 'Golden Fields' },
    });
    fireEvent.change(screen.getByLabelText(/^location/i), {
      target: { value: 'Nashik, Maharashtra' },
    });
    fireEvent.change(screen.getByLabelText(/farm area/i), {
      target: { value: '25.5' },
    });

    const submitBtn = screen.getByRole('button', { name: /save farm/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        farm_name: 'Golden Fields',
        location: 'Nashik, Maharashtra',
        area: 25.5,
      });
    });
  });

  it('Farm.Add: toggles GPS coordinates and submits manual coordinates', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    render(<FarmForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/^farm name/i), {
      target: { value: 'Coastal Farm' },
    });
    fireEvent.change(screen.getByLabelText(/^location/i), {
      target: { value: 'Alibag' },
    });
    fireEvent.change(screen.getByLabelText(/farm area/i), {
      target: { value: '10' },
    });

    // Expand manual coordinates
    const toggleBtn = screen.getByText(/custom gps coordinates/i);
    fireEvent.click(toggleBtn);

    fireEvent.change(screen.getByLabelText(/^latitude/i), {
      target: { value: '18.6414' },
    });
    fireEvent.change(screen.getByLabelText(/^longitude/i), {
      target: { value: '72.8722' },
    });

    const submitBtn = screen.getByRole('button', { name: /save farm/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        farm_name: 'Coastal Farm',
        location: 'Alibag',
        area: 10,
        latitude: 18.6414,
        longitude: 72.8722,
      });
    });
  });

  it('Farm.View: FarmList shows empty state when no farms exist', async () => {
    vi.spyOn(farmApi, 'getFarmsApi').mockResolvedValue([]);

    render(
      <MemoryRouter>
        <FarmList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no farms registered yet/i)).toBeInTheDocument();
    });
  });

  it('Farm.View: FarmList renders registered farms with area and location', async () => {
    vi.spyOn(farmApi, 'getFarmsApi').mockResolvedValue([
      {
        farm_id: 1,
        farmer_id: 1,
        farm_name: 'River Valley Farm',
        location: 'Pune, Maharashtra',
        area: 15,
        latitude: 18.5204,
        longitude: 73.8567,
      },
    ]);

    render(
      <MemoryRouter>
        <FarmList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('River Valley Farm')).toBeInTheDocument();
      expect(screen.getByText('Pune, Maharashtra')).toBeInTheDocument();
      expect(screen.getByText(/15 (hectares|acres)/i)).toBeInTheDocument();
    });
  });

  it('Farm.Delete: deletes farm after confirm dialog', async () => {
    vi.spyOn(farmApi, 'getFarmsApi').mockResolvedValue([
      {
        farm_id: 42,
        farmer_id: 1,
        farm_name: 'Deletable Farm',
        location: 'Pune',
        area: 10,
        latitude: 18.5,
        longitude: 73.8,
      },
    ]);
    const deleteSpy = vi.spyOn(farmApi, 'deleteFarmApi').mockResolvedValue({ deleted: true });

    render(
      <MemoryRouter>
        <FarmList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Deletable Farm')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle('Delete Farm');
    fireEvent.click(deleteBtn);

    // Dialog is open
    expect(screen.getByText(/are you sure you want to delete "Deletable Farm"/i)).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', { name: /delete farm/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(42);
    });
  });

  it('D6: FarmDetails shows Edit button for farmer, but not for admin', async () => {
    const mockFarm = {
      farm_id: 5,
      farmer_id: 1,
      farm_name: 'Detail Farm',
      location: 'Pune',
      area: 20,
      latitude: 18.52,
      longitude: 73.85,
      created_at: new Date().toISOString(),
    };
    vi.spyOn(farmApi, 'getFarmByIdApi').mockResolvedValue(mockFarm);

    // Render as farmer
    const { unmount } = render(
      <MemoryRouter initialEntries={['/farms/5']}>
        <Routes>
          <Route path="/farms/:farmId" element={<FarmDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Detail Farm')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit farm/i })).toBeInTheDocument();
    });

    unmount();

    // Now render as administrator
    mockProfile = {
      name: 'System Admin',
      email: 'admin@example.com',
      user_type: 'administrator',
    };

    render(
      <MemoryRouter initialEntries={['/admin/farms/5']}>
        <Routes>
          <Route path="/admin/farms/:farmId" element={<FarmDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Detail Farm')).toBeInTheDocument();
      // Requirement: Section 5 D6 - Administrator cannot edit farms
      expect(screen.queryByRole('button', { name: /edit farm/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete farm/i })).toBeInTheDocument();
    });
  });

  it('D6: AdminFarms renders all farms and provides add-on-behalf, without edit buttons', async () => {
    mockProfile = {
      name: 'Admin User',
      email: 'admin@example.com',
      user_type: 'administrator',
    };

    vi.spyOn(farmApi, 'getFarmsApi').mockResolvedValue([
      {
        farm_id: 101,
        farmer_id: 7,
        farm_name: 'Admin Managed Farm',
        location: 'Solapur',
        area: 40,
        latitude: 17.6599,
        longitude: 75.9064,
      },
    ]);

    render(
      <MemoryRouter>
        <AdminFarms />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin Managed Farm')).toBeInTheDocument();
      expect(screen.getByText('Farmer #7')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add on behalf of farmer/i })).toBeInTheDocument();
      // Verify no Edit button exists in the table
      expect(screen.queryByTitle(/edit farm/i)).not.toBeInTheDocument();
    });
  });
});
