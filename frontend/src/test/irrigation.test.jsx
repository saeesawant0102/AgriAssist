import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as cropApi from '../features/crops/api.js';
import * as farmApi from '../features/farms/api.js';
import * as irrigationApi from '../features/irrigation/api.js';
import { ScheduleCard } from '../features/irrigation/components/ScheduleCard.jsx';
import { SkipNotice } from '../features/irrigation/components/SkipNotice.jsx';
import { IrrigationScheduling } from '../features/irrigation/pages/IrrigationScheduling.jsx';

// Mock AuthContext
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { uid: 'test-farmer-uid' },
    profile: {
      name: 'Farmer John',
      email: 'farmer@example.com',
      user_type: 'farmer',
      farmer_id: 1,
    },
    loading: false,
  }),
}));

describe('Frontend Irrigation Scheduling Component Tests (Feature 5)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('SkipNotice Component', () => {
    it('Irrigation.Skip: renders rain-skip alert banner with note', () => {
      render(
        <SkipNotice
          note="Rainfall expected on 2026-05-06; skip irrigation on these dates."
          skippedDates={['2026-05-06']}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Rain-Skip Recommended')).toBeInTheDocument();
      expect(
        screen.getByText('Rainfall expected on 2026-05-06; skip irrigation on these dates.')
      ).toBeInTheDocument();
    });

    it('Irrigation.Skip: returns null when no skip recommendation exists', () => {
      const { container } = render(<SkipNotice note="" skippedDates={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('ScheduleCard Component', () => {
    it('Irrigation.View: renders schedule metrics, watering dates, and skip notices', () => {
      const mockSchedule = {
        schedule_id: 10,
        start_date: '2026-05-01',
        end_date: '2026-05-07',
        frequency: 'Every 5 days',
        water_required: '25 mm per irrigation',
        skip_recommended: 1,
        note: 'Rainfall expected on 2026-05-06; skip irrigation on these dates.',
        irrigation_dates: ['2026-05-01'],
        skipped_dates: ['2026-05-06'],
        updated_at: '2026-05-01T10:00:00.000Z',
      };

      const handleRefresh = vi.fn();

      render(
        <ScheduleCard
          schedule={mockSchedule}
          onRefresh={handleRefresh}
          isRefreshing={false}
        />
      );

      expect(screen.getByText(/Irrigation Schedule #10/)).toBeInTheDocument();
      expect(screen.getByText(/Every 5 days/)).toBeInTheDocument();
      expect(screen.getByText(/25 mm per irrigation/)).toBeInTheDocument();
      expect(screen.getByText('2026-05-01 to 2026-05-07')).toBeInTheDocument();
      expect(screen.getByText('Rain-Skip Active')).toBeInTheDocument();

      // Dates listed
      expect(screen.getByText('2026-05-01')).toBeInTheDocument();
      expect(screen.getByText('Irrigate')).toBeInTheDocument();
      expect(screen.getByText('2026-05-06')).toBeInTheDocument();
      expect(screen.getByText('Skip (Rain)')).toBeInTheDocument();

      // Refresh button click
      const refreshBtn = screen.getByRole('button', { name: /Refresh Schedule/i });
      fireEvent.click(refreshBtn);
      expect(handleRefresh).toHaveBeenCalledWith(10);
    });
  });

  describe('IrrigationScheduling Page', () => {
    const mockFarms = [
      { farm_id: 1, farm_name: 'Sunrise Orchard', location: 'Nashik', area: 5 },
    ];
    const mockCrops = [
      { crop_id: 101, farm_id: 1, crop_name: 'Grapes', growth_stage: 'Flowering' },
    ];
    const mockForecast = [
      { date: '2026-05-01', temperature_max: 32, rainfall_probability: 10, rainfall: 0 },
      { date: '2026-05-02', temperature_max: 33, rainfall_probability: 15, rainfall: 0 },
      { date: '2026-05-03', temperature_max: 31, rainfall_probability: 20, rainfall: 0 },
      { date: '2026-05-04', temperature_max: 30, rainfall_probability: 25, rainfall: 0 },
      { date: '2026-05-05', temperature_max: 31, rainfall_probability: 15, rainfall: 0 },
      { date: '2026-05-06', temperature_max: 27, rainfall_probability: 70, rainfall: 12 },
      { date: '2026-05-07', temperature_max: 29, rainfall_probability: 30, rainfall: 1 },
    ];

    it('Irrigation.View: shows empty state when farmer has no farms', async () => {
      vi.spyOn(farmApi, 'getFarmsApi').mockResolvedValue([]);

      render(
        <MemoryRouter>
          <IrrigationScheduling />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No farms available')).toBeInTheDocument();
      });
    });

    it('Irrigation.Generate & Irrigation.Update: renders forecast, generates schedule, and refreshes in-place', async () => {
      vi.spyOn(farmApi, 'getFarmsApi').mockResolvedValue(mockFarms);
      vi.spyOn(cropApi, 'getCropsByFarmApi').mockResolvedValue(mockCrops);
      vi.spyOn(irrigationApi, 'getFarmWeatherForecastApi').mockResolvedValue(mockForecast);
      vi.spyOn(irrigationApi, 'getIrrigationSchedulesByCropApi').mockResolvedValue([]);

      const mockCreatedSchedule = {
        schedule_id: 25,
        crop_id: 101,
        start_date: '2026-05-01',
        end_date: '2026-05-07',
        frequency: 'Every 5 days',
        water_required: '25 mm per irrigation',
        skip_recommended: 1,
        note: 'Rainfall expected on 2026-05-06; skip irrigation on these dates.',
        irrigation_dates: ['2026-05-01'],
        skipped_dates: ['2026-05-06'],
        updated_at: '2026-05-01T08:00:00.000Z',
      };

      vi.spyOn(irrigationApi, 'generateIrrigationScheduleApi').mockResolvedValue(mockCreatedSchedule);

      render(
        <MemoryRouter>
          <IrrigationScheduling />
        </MemoryRouter>
      );

      // Verify farm and crop selectors loaded
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /Sunrise Orchard/ })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /Grapes/ })).toBeInTheDocument();
      });

      // Verify 7-day weather outlook is rendered
      expect(screen.getByText(/7-Day Weather Outlook for Field/)).toBeInTheDocument();
      expect(screen.getByText('Rain Skip')).toBeInTheDocument();

      // Click Generate button
      const generateBtn = screen.getByRole('button', { name: /Generate Irrigation Schedule/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(irrigationApi.generateIrrigationScheduleApi).toHaveBeenCalledWith('101');
        expect(screen.getByText(/Irrigation Schedule #25/)).toBeInTheDocument();
        expect(screen.getByText('Rain-Skip Active')).toBeInTheDocument();
      });

      // Test Refresh action
      const mockRefreshedSchedule = {
        ...mockCreatedSchedule,
        note: 'Rainfall expected on 2026-05-06; skip irrigation on these dates.',
        updated_at: '2026-05-01T09:30:00.000Z',
      };
      vi.spyOn(irrigationApi, 'refreshIrrigationScheduleApi').mockResolvedValue(mockRefreshedSchedule);

      const refreshBtn = screen.getByRole('button', { name: /Refresh Schedule/i });
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(irrigationApi.refreshIrrigationScheduleApi).toHaveBeenCalledWith(25);
        expect(screen.getByText(/Schedule #25 refreshed with current forecast!/)).toBeInTheDocument();
      });
    });
  });
});
