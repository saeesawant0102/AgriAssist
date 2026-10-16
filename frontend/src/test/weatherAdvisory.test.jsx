import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as advisoryApi from '../features/advisory/api.js';
import { AdvisoryCard } from '../features/advisory/components/AdvisoryCard.jsx';
import { CropAdvisory } from '../features/advisory/pages/CropAdvisory.jsx';
import * as cropApi from '../features/crops/api.js';
import * as farmApi from '../features/farms/api.js';
import * as weatherApi from '../features/weather/api.js';
import { AlertBanner } from '../features/weather/components/AlertBanner.jsx';
import { CurrentWeatherCard } from '../features/weather/components/CurrentWeatherCard.jsx';
import { ForecastList } from '../features/weather/components/ForecastList.jsx';
import { WeatherDashboard } from '../features/weather/pages/WeatherDashboard.jsx';

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

describe('Frontend Weather Dashboard & Crop Advisory Component Tests (Feature 4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('CurrentWeatherCard Component', () => {
    it('Weather.Display: renders current temperature, condition and agro-metrics', () => {
      const mockWeather = {
        date: '2026-04-15',
        temperature: 28.5,
        temperature_max: 34.0,
        temperature_min: 21.0,
        humidity: 62.0,
        rainfall: 0.0,
        rainfall_probability: 10,
        wind_speed: 15.0,
        condition: 'Mainly clear',
        forecast: 'Mainly clear with mild breeze',
      };

      render(<CurrentWeatherCard weather={mockWeather} farmName="Valley Farm" />);

      expect(screen.getByText('Valley Farm')).toBeInTheDocument();
      expect(screen.getByText('28.5°C')).toBeInTheDocument();
      expect(screen.getByText('Mainly clear')).toBeInTheDocument();
      expect(screen.getByText(/High: 34°C/)).toBeInTheDocument();
      expect(screen.getByText(/Low: 21°C/)).toBeInTheDocument();
      expect(screen.getAllByText(/62%/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/15 km\/h/).length).toBeGreaterThanOrEqual(1);
    });


    it('Weather.Display: displays stale banner when stale is true', () => {
      const mockWeather = {
        date: '2026-04-15',
        temperature: 25.0,
        stale: true,
      };

      render(<CurrentWeatherCard weather={mockWeather} farmName="River Farm" />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/Stale Data:/i)).toBeInTheDocument();
      expect(screen.getByText(/Live updates unavailable/i)).toBeInTheDocument();
    });
  });

  describe('AlertBanner Component', () => {
    it('Weather.Alert: renders nothing when alerts list is empty', () => {
      const { container } = render(<AlertBanner alerts={[]} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('Weather.Alert: renders alert warnings with type, date, and message', () => {
      const alerts = [
        {
          alert_type: 'HIGH_WIND',
          severity: 'severe',
          date: '2026-04-16',
          message: 'High wind warning: wind speed expected to reach 55 km/h.',
        },
        {
          alert_type: 'THUNDERSTORM',
          severity: 'severe',
          date: '2026-04-17',
          message: 'Thunderstorm warning: severe thunderstorms expected.',
        },
      ];

      render(<AlertBanner alerts={alerts} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Weather Alert Notification/i)).toBeInTheDocument();
      expect(screen.getByText('HIGH WIND')).toBeInTheDocument();
      expect(screen.getByText('THUNDERSTORM')).toBeInTheDocument();
      expect(screen.getByText(/55 km\/h/)).toBeInTheDocument();
    });
  });

  describe('ForecastList Component', () => {
    it('Weather.Display: renders daily cards and handles horizon toggles', () => {
      const forecast = [
        {
          date: '2026-04-15',
          condition: 'Clear sky',
          temperature_max: 33,
          temperature_min: 20,
          humidity: 55,
          rainfall: 0,
          rainfall_probability: 5,
          wind_speed: 12,
        },
        {
          date: '2026-04-16',
          condition: 'Partly cloudy',
          temperature_max: 31,
          temperature_min: 19,
          humidity: 60,
          rainfall: 2,
          rainfall_probability: 30,
          wind_speed: 14,
        },
      ];

      const onDaysChange = vi.fn();
      render(<ForecastList forecast={forecast} days={7} onDaysChange={onDaysChange} />);

      expect(screen.getByText('2026-04-15')).toBeInTheDocument();
      expect(screen.getByText('2026-04-16')).toBeInTheDocument();
      expect(screen.getByText('Clear sky')).toBeInTheDocument();

      const btn5 = screen.getByRole('button', { name: /5 days/i });
      fireEvent.click(btn5);
      expect(onDaysChange).toHaveBeenCalledWith(5);
    });
  });

  describe('WeatherDashboard Page', () => {
    it('Weather.Display: shows empty state when farmer has no farms', async () => {
      vi.spyOn(farmApi, 'getFarmsApi').mockResolvedValue([]);

      render(
        <MemoryRouter>
          <WeatherDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No Farms Found/i)).toBeInTheDocument();
      });
    });

    it('Weather.Display: loads and renders weather data and Open-Meteo attribution', async () => {
      vi.spyOn(farmApi, 'getFarmsApi').mockResolvedValue([
        { farm_id: 1, farm_name: 'Green Field', location: 'Pune' },
      ]);

      vi.spyOn(weatherApi, 'getCurrentWeatherApi').mockResolvedValue({
        date: '2026-04-15',
        temperature: 27.0,
        temperature_max: 33.0,
        temperature_min: 20.0,
        humidity: 60,
        rainfall: 0,
        rainfall_probability: 10,
        wind_speed: 12,
        condition: 'Clear sky',
        forecast: 'Clear sky',
      });

      vi.spyOn(weatherApi, 'getForecastApi').mockResolvedValue([
        {
          date: '2026-04-15',
          condition: 'Clear sky',
          temperature_max: 33.0,
          temperature_min: 20.0,
          humidity: 60,
          rainfall: 0,
          rainfall_probability: 10,
          wind_speed: 12,
        },
      ]);

      vi.spyOn(weatherApi, 'getWeatherAlertsApi').mockResolvedValue([]);

      render(
        <MemoryRouter>
          <WeatherDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Green Field')).toBeInTheDocument();
        expect(screen.getByText('27°C')).toBeInTheDocument();
        expect(screen.getByText(/Weather data provided by/i)).toBeInTheDocument();
        expect(screen.getByText('Open-Meteo')).toBeInTheDocument();
      });
    });
  });

  describe('AdvisoryCard & CropAdvisory Page', () => {
    it('Advisory.Display: AdvisoryCard renders headline, message and dates', () => {
      const advisory = {
        advisory_id: 10,
        recommendation: 'Heavy rain',
        message: 'Heavy rain expected. Postpone irrigation and fertilizer spraying.',
        date: '2026-04-15',
        created_at: '2026-04-15T12:00:00Z',
      };

      render(<AdvisoryCard advisory={advisory} cropName="Cotton" />);

      expect(screen.getByText('Cotton')).toBeInTheDocument();
      expect(screen.getAllByText('Heavy rain').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Postpone irrigation/i)).toBeInTheDocument();
      expect(screen.getByText('2026-04-15')).toBeInTheDocument();
    });

    it('Advisory.Generate: CropAdvisory triggers advisory generation and updates history', async () => {
      vi.spyOn(farmApi, 'getFarmsApi').mockResolvedValue([
        { farm_id: 1, farm_name: 'Hill Farm', location: 'Nashik' },
      ]);

      vi.spyOn(cropApi, 'getCropsByFarmApi').mockResolvedValue([
        { crop_id: 5, crop_name: 'Tomato', growth_stage: 'Vegetative' },
      ]);

      vi.spyOn(advisoryApi, 'getAdvisoriesByCropApi').mockResolvedValue([]);

      const generateSpy = vi.spyOn(advisoryApi, 'generateAdvisoryApi').mockResolvedValue({
        advisory_id: 101,
        crop_id: 5,
        recommendation: 'Fungal risk',
        message: 'High humidity with mild temperatures raises fungal disease risk. Inspect regularly.',
        date: '2026-04-15',
        created_at: '2026-04-15T14:30:00Z',
      });

      render(
        <MemoryRouter>
          <CropAdvisory />
        </MemoryRouter>
      );

      // Wait for crop to be selected and empty advisory state shown
      await waitFor(() => {
        expect(screen.getByText(/No Advisory Yet/i)).toBeInTheDocument();
      });

      // Click "Get Crop Advisory"
      const generateBtns = screen.getAllByRole('button', { name: /get crop advisory/i });
      fireEvent.click(generateBtns[0]);

      await waitFor(() => {
        expect(generateSpy).toHaveBeenCalledWith('5');
        expect(screen.getAllByText('Fungal risk').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/raises fungal disease risk/i)).toBeInTheDocument();
      });

    });
  });
});
