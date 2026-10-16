import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GROWTH_STAGES } from '../config/constants.js';
import * as cropApi from '../features/crops/api.js';
import { CropForm } from '../features/crops/components/CropForm.jsx';
import { GrowthStageSelect } from '../features/crops/components/GrowthStageSelect.jsx';
import { CropDetails } from '../features/crops/pages/CropDetails.jsx';
import * as farmApi from '../features/farms/api.js';
import { FarmDetails } from '../features/farms/pages/FarmDetails.jsx';

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

describe('Frontend Crop Management Component Tests (Feature 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockProfile = {
      name: 'Test Farmer',
      email: 'farmer@example.com',
      user_type: 'farmer',
      farmer_id: 1,
    };
  });

  it('Crop.Validate: displays validation errors for missing name and sowing date', async () => {
    const onSubmit = vi.fn();
    render(<CropForm onSubmit={onSubmit} />);

    const submitBtn = screen.getByRole('button', { name: /save crop/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/crop name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/sowing date is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Crop.Validate: rejects harvest_date earlier than sowing_date', async () => {
    const onSubmit = vi.fn();
    render(<CropForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/^crop name/i), {
      target: { value: 'Wheat' },
    });
    fireEvent.change(screen.getByLabelText(/^sowing date/i), {
      target: { value: '2026-06-01' },
    });
    fireEvent.change(screen.getByLabelText(/estimated harvest date/i), {
      target: { value: '2026-05-01' },
    });

    const submitBtn = screen.getByRole('button', { name: /save crop/i });
    fireEvent.click(submitBtn);

    expect(
      screen.getByText(/harvest date must be on or after sowing date/i)
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Crop.Add: submits valid crop details', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    render(<CropForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/^crop name/i), {
      target: { value: 'Sugarcane' },
    });
    fireEvent.change(screen.getByLabelText(/variety/i), {
      target: { value: 'Co 86032' },
    });
    fireEvent.change(screen.getByLabelText(/^sowing date/i), {
      target: { value: '2026-02-15' },
    });
    fireEvent.change(screen.getByLabelText(/estimated harvest date/i), {
      target: { value: '2026-12-15' },
    });

    const submitBtn = screen.getByRole('button', { name: /save crop/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        crop_name: 'Sugarcane',
        variety: 'Co 86032',
        sowing_date: '2026-02-15',
        harvest_date: '2026-12-15',
        growth_stage: 'Sowing',
      });
    });
  });

  it('Crop.Stage.Update: GrowthStageSelect renders all 7 configured D3 lifecycle stages', () => {
    const onChange = vi.fn();
    render(<GrowthStageSelect value="Vegetative" onChange={onChange} />);

    const select = screen.getByLabelText(/growth stage/i);
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('Vegetative');

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(7);
    expect(options.map((o) => o.value)).toEqual(GROWTH_STAGES);
  });

  it('Crop.View: FarmDetails renders planted crops list and stage badges', async () => {
    vi.spyOn(farmApi, 'getFarmByIdApi').mockResolvedValue({
      farm_id: 1,
      farmer_id: 1,
      farm_name: 'Test Farm',
      location: 'Pune',
      area: 10,
      latitude: 18.5,
      longitude: 73.8,
    });
    vi.spyOn(cropApi, 'getCropsByFarmApi').mockResolvedValue([
      {
        crop_id: 10,
        farm_id: 1,
        crop_name: 'Golden Wheat',
        variety: 'Sharbati',
        sowing_date: '2026-11-01',
        harvest_date: '2027-03-15',
        growth_stage: 'Vegetative',
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/farms/1']}>
        <Routes>
          <Route path="/farms/:farmId" element={<FarmDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Golden Wheat')).toBeInTheDocument();
      expect(screen.getByText('Sharbati')).toBeInTheDocument();
      expect(screen.getByText('Vegetative')).toBeInTheDocument();
      expect(screen.getByText('2026-11-01')).toBeInTheDocument();
    });
  });

  it('Crop.Add: FarmDetails opens Plant Crop modal and creates crop', async () => {
    vi.spyOn(farmApi, 'getFarmByIdApi').mockResolvedValue({
      farm_id: 1,
      farmer_id: 1,
      farm_name: 'Test Farm',
      location: 'Pune',
      area: 10,
      latitude: 18.5,
      longitude: 73.8,
    });
    vi.spyOn(cropApi, 'getCropsByFarmApi').mockResolvedValue([]);
    const createSpy = vi.spyOn(cropApi, 'createCropApi').mockResolvedValue({
      crop_id: 99,
      farm_id: 1,
      crop_name: 'Soybean',
      sowing_date: '2026-06-01',
      growth_stage: 'Sowing',
    });

    render(
      <MemoryRouter initialEntries={['/farms/1']}>
        <Routes>
          <Route path="/farms/:farmId" element={<FarmDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no active crops registered/i)).toBeInTheDocument();
    });

    // Click Plant Crop
    const plantBtn = screen.getAllByRole('button', { name: /plant crop/i })[0];
    fireEvent.click(plantBtn);

    // Modal is open
    expect(screen.getByText('Plant New Crop')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^crop name/i), {
      target: { value: 'Soybean' },
    });
    fireEvent.change(within(dialog).getByLabelText(/^sowing date/i), {
      target: { value: '2026-06-01' },
    });

    const submitBtn = within(dialog).getByRole('button', { name: /plant crop/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith('1', {
        crop_name: 'Soybean',
        variety: null,
        sowing_date: '2026-06-01',
        harvest_date: null,
        growth_stage: 'Sowing',
      });
    });
  });

  it('Crop.Delete: FarmDetails confirms and deletes crop', async () => {
    vi.spyOn(farmApi, 'getFarmByIdApi').mockResolvedValue({
      farm_id: 1,
      farmer_id: 1,
      farm_name: 'Test Farm',
      location: 'Pune',
      area: 10,
      latitude: 18.5,
      longitude: 73.8,
    });
    vi.spyOn(cropApi, 'getCropsByFarmApi').mockResolvedValue([
      {
        crop_id: 15,
        farm_id: 1,
        crop_name: 'Deletable Crop',
        sowing_date: '2026-05-01',
        growth_stage: 'Sowing',
      },
    ]);
    const deleteSpy = vi.spyOn(cropApi, 'deleteCropApi').mockResolvedValue({ deleted: true });

    render(
      <MemoryRouter initialEntries={['/farms/1']}>
        <Routes>
          <Route path="/farms/:farmId" element={<FarmDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Deletable Crop')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle('Delete Crop');
    fireEvent.click(deleteBtn);

    // Confirmation dialog
    expect(
      screen.getByText(/are you sure you want to delete "Deletable Crop"/i)
    ).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', { name: /^delete crop$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(15);
    });
  });

  it('Crop.Details: CropDetails displays growth lifecycle and stage updater for farmer', async () => {
    vi.spyOn(cropApi, 'getCropByIdApi').mockResolvedValue({
      crop_id: 7,
      farm_id: 1,
      crop_name: 'Barley',
      variety: 'Hordeum',
      sowing_date: '2026-10-15',
      harvest_date: '2027-02-28',
      growth_stage: 'Vegetative',
    });
    const stageSpy = vi.spyOn(cropApi, 'updateCropStageApi').mockResolvedValue({
      crop_id: 7,
      farm_id: 1,
      crop_name: 'Barley',
      variety: 'Hordeum',
      sowing_date: '2026-10-15',
      harvest_date: '2027-02-28',
      growth_stage: 'Flowering',
    });

    render(
      <MemoryRouter initialEntries={['/crops/7']}>
        <Routes>
          <Route path="/crops/:cropId" element={<CropDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Barley' })).toBeInTheDocument();
      expect(screen.getAllByText('Hordeum').length).toBeGreaterThan(0);
      expect(screen.getByText('Advance Growth Stage')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit crop/i })).toBeInTheDocument();
    });

    // Advance stage via select
    const stageSelect = screen.getByRole('combobox');
    fireEvent.change(stageSelect, { target: { value: 'Flowering' } });

    await waitFor(() => {
      expect(stageSpy).toHaveBeenCalledWith('7', 'Flowering');
    });
  });

  it('D6: CropDetails excludes edit, delete and stage updater for admin (read-only)', async () => {
    mockProfile = {
      name: 'System Admin',
      email: 'admin@example.com',
      user_type: 'administrator',
    };

    vi.spyOn(cropApi, 'getCropByIdApi').mockResolvedValue({
      crop_id: 8,
      farm_id: 2,
      crop_name: 'Chickpea',
      sowing_date: '2026-10-01',
      growth_stage: 'Maturity',
    });

    render(
      <MemoryRouter initialEntries={['/admin/crops/8']}>
        <Routes>
          <Route path="/admin/crops/:cropId" element={<CropDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Chickpea' })).toBeInTheDocument();
      // Requirement: Section 5 D6 - Administrator cannot edit or delete crops or update stage
      expect(screen.queryByRole('button', { name: /edit crop/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete crop/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/advance growth stage/i)).not.toBeInTheDocument();
    });
  });
});
