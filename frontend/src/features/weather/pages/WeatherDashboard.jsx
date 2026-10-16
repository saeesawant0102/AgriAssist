import React, { useEffect, useState } from 'react';
import { CloudSun, Info, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { getFarmsApi } from '../../farms/api.js';
import { getCurrentWeatherApi, getForecastApi, getWeatherAlertsApi } from '../api.js';
import { AlertBanner } from '../components/AlertBanner.jsx';
import { CurrentWeatherCard } from '../components/CurrentWeatherCard.jsx';
import { ForecastList } from '../components/ForecastList.jsx';

/**
 * Requirement: Weather.Fetch, Weather.Display, Weather Alert Notification, Section 12.5
 * Main Weather Dashboard page for viewing current weather, 5-7 day forecast, and alerts.
 */
export function WeatherDashboard() {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [days, setDays] = useState(7);

  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [error, setError] = useState(null);

  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // Fetch farmer's farms on initial mount
  useEffect(() => {
    async function loadFarms() {
      try {
        setLoadingFarms(true);
        setError(null);
        const data = await getFarmsApi();
        setFarms(data);
        if (data.length > 0) {
          setSelectedFarmId(String(data[0].farm_id));
        }
      } catch (err) {
        setError(err.message || 'Failed to load farms');
      } finally {
        setLoadingFarms(false);
      }
    }
    loadFarms();
  }, []);

  // Fetch weather data whenever selected farm or days change
  useEffect(() => {
    if (!selectedFarmId) return;

    async function loadWeatherData() {
      try {
        setLoadingWeather(true);
        setError(null);
        const [curr, fore, al] = await Promise.all([
          getCurrentWeatherApi(selectedFarmId),
          getForecastApi(selectedFarmId, days),
          getWeatherAlertsApi(selectedFarmId),
        ]);
        setCurrentWeather(curr);
        setForecast(fore);
        setAlerts(al);
      } catch (err) {
        setError(err.message || 'Failed to load weather data');
      } finally {
        setLoadingWeather(false);
      }
    }

    loadWeatherData();
  }, [selectedFarmId, days]);

  const handleRefresh = async () => {
    if (!selectedFarmId) return;
    try {
      setLoadingWeather(true);
      setError(null);
      const [curr, fore, al] = await Promise.all([
        getCurrentWeatherApi(selectedFarmId),
        getForecastApi(selectedFarmId, days),
        getWeatherAlertsApi(selectedFarmId),
      ]);
      setCurrentWeather(curr);
      setForecast(fore);
      setAlerts(al);
    } catch (err) {
      setError(err.message || 'Failed to refresh weather data');
    } finally {
      setLoadingWeather(false);
    }
  };

  const selectedFarm = farms.find((f) => String(f.farm_id) === String(selectedFarmId));

  if (loadingFarms) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <EmptyState
        icon={<CloudSun className="w-8 h-8" />}
        title="No Farms Found"
        description="You have not registered any farms yet. Add a farm to start monitoring live weather conditions and forecasts."
        action={
          <Button to="/farms/new">Add Your First Farm</Button>
        }
      />
    );
  }


  return (
    <div className="space-y-6">
      {/* Top Header & Farm Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Weather Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time agro-meteorological monitoring and severe weather advisories
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Select
              id="weather-farm-select"
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              options={farms.map((f) => ({
                value: String(f.farm_id),
                label: `${f.farm_name} (${f.location})`,
              }))}
            />
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loadingWeather}
            title="Refresh weather"
          >
            <RefreshCw className={`w-4 h-4 ${loadingWeather ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-2"
        >
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {loadingWeather && !currentWeather ? (
        <div className="flex items-center justify-center min-h-[250px]">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Weather Alert Banner */}
          <AlertBanner alerts={alerts} />

          {/* Current Observations Card */}
          {currentWeather && (
            <CurrentWeatherCard
              weather={currentWeather}
              farmName={selectedFarm?.farm_name || 'Selected Farm'}
            />
          )}

          {/* Forecast Horizon List */}
          {forecast.length > 0 && (
            <ForecastList
              forecast={forecast}
              days={days}
              onDaysChange={(newDays) => setDays(newDays)}
            />
          )}

          {/* Attribution Footer per Section 13.1 */}
          <div className="pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Weather data provided by{' '}
                <a
                  href="https://open-meteo.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-600 hover:underline"
                >
                  Open-Meteo
                </a>{' '}
                under CC BY 4.0.
              </span>
            </div>
            <span>Auto-cached for 30 minutes</span>
          </div>
        </>
      )}
    </div>
  );
}
