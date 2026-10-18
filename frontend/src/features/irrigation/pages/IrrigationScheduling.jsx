import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CloudRain,
  Droplets,
  History,
  Layers,
  Sparkles,
  Sprout,
  Sun,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { getCropsByFarmApi } from '../../crops/api.js';
import { getFarmsApi } from '../../farms/api.js';
import {
  generateIrrigationScheduleApi,
  getFarmWeatherForecastApi,
  getIrrigationSchedulesByCropApi,
  refreshIrrigationScheduleApi,
} from '../api.js';
import { ScheduleCard } from '../components/ScheduleCard.jsx';

/**
 * Requirement: Irrigation.Generate, Irrigation.View, Irrigation.Update, Irrigation.Skip, BR-5, Section 12.7
 * Main Irrigation Scheduling page: Select Crop & Field -> Check Weather Forecast -> Generate -> View/Refresh.
 */
export function IrrigationScheduling() {
  const [farms, setFarms] = useState([]);
  const [crops, setCrops] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [selectedCropId, setSelectedCropId] = useState('');

  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingCrops, setLoadingCrops] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refreshingId, setRefreshingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch farms initially
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

  // Fetch crops & forecast when selected farm changes
  useEffect(() => {
    if (!selectedFarmId) {
      setCrops([]);
      setSelectedCropId('');
      setForecast([]);
      return;
    }

    async function loadFarmData() {
      try {
        setLoadingCrops(true);
        setLoadingForecast(true);
        setError(null);

        const [cropsData, forecastData] = await Promise.all([
          getCropsByFarmApi(selectedFarmId),
          getFarmWeatherForecastApi(selectedFarmId, 7).catch(() => []),
        ]);

        setCrops(cropsData);
        setForecast(forecastData);

        if (cropsData.length > 0) {
          setSelectedCropId(String(cropsData[0].crop_id));
        } else {
          setSelectedCropId('');
          setSchedules([]);
        }
      } catch (err) {
        setError(err.message || 'Failed to load farm details');
      } finally {
        setLoadingCrops(false);
        setLoadingForecast(false);
      }
    }

    loadFarmData();
  }, [selectedFarmId]);

  // Fetch irrigation schedules when crop changes
  useEffect(() => {
    if (!selectedCropId) {
      setSchedules([]);
      return;
    }

    async function loadSchedules() {
      try {
        setLoadingSchedules(true);
        setError(null);
        const data = await getIrrigationSchedulesByCropApi(selectedCropId);
        setSchedules(data);
      } catch (err) {
        setError(err.message || 'Failed to load irrigation schedules');
      } finally {
        setLoadingSchedules(false);
      }
    }

    loadSchedules();
  }, [selectedCropId]);

  const handleGenerate = async () => {
    if (!selectedCropId) return;
    try {
      setGenerating(true);
      setError(null);
      setSuccessMessage(null);
      const newSchedule = await generateIrrigationScheduleApi(selectedCropId);
      setSchedules((prev) => [newSchedule, ...prev]);
      setSuccessMessage('Irrigation schedule generated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to generate irrigation schedule');
    } finally {
      setGenerating(false);
    }
  };

  const handleRefresh = async (scheduleId) => {
    try {
      setRefreshingId(scheduleId);
      setError(null);
      setSuccessMessage(null);
      const updated = await refreshIrrigationScheduleApi(scheduleId);
      setSchedules((prev) =>
        prev.map((s) => (s.schedule_id === updated.schedule_id ? updated : s))
      );
      setSuccessMessage(`Schedule #${scheduleId} refreshed with current forecast!`);
    } catch (err) {
      setError(err.message || 'Failed to refresh schedule');
    } finally {
      setRefreshingId(null);
    }
  };

  if (loadingFarms) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Spinner size="lg" className="text-emerald-600" />
        <p className="mt-4 text-sm text-slate-500 font-medium">Loading farms &amp; fields...</p>
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Irrigation Scheduling</h1>
          <p className="text-sm text-slate-500 mt-1">Smart water planning based on 7-day weather forecasts.</p>
        </div>
        <EmptyState
          icon={<Layers className="w-8 h-8" />}
          title="No farms available"
          description="You need to register at least one farm and planted crop before scheduling irrigation."
        />
      </div>
    );
  }

  const selectedCrop = crops.find((c) => String(c.crop_id) === String(selectedCropId));
  const latestSchedule = schedules[0];
  const historySchedules = schedules.slice(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Droplets className="w-6 h-6 text-emerald-600" />
            Irrigation Scheduling
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Weather-informed irrigation schedules and rain-skip advisories for your crops.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          {successMessage}
        </div>
      )}

      {/* Selectors Card (Use Case: Select Crop & Field) */}
      <Card className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <Select
            label="Select Farm / Field"
            value={selectedFarmId}
            onChange={(e) => setSelectedFarmId(e.target.value)}
            disabled={generating}
            options={farms.map((f) => ({
              value: String(f.farm_id),
              label: `${f.farm_name} (${f.location})`,
            }))}
          />

          <Select
            label="Select Planted Crop"
            value={selectedCropId}
            onChange={(e) => setSelectedCropId(e.target.value)}
            disabled={loadingCrops || crops.length === 0 || generating}
            options={
              crops.length > 0
                ? crops.map((c) => ({
                    value: String(c.crop_id),
                    label: `${c.crop_name}${c.variety ? ` - ${c.variety}` : ''} (${c.growth_stage})`,
                  }))
                : [{ value: '', label: loadingCrops ? 'Loading crops...' : 'No crops found on farm' }]
            }
          />

          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!selectedCropId || generating || loadingCrops}
            className="w-full h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {generating ? (
              <>
                <Spinner size="sm" className="text-white" />
                <span>Computing Schedule...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Irrigation Schedule</span>
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* 7-Day Forecast Snapshot (Use Case: Check Weather Forecast) */}
      {forecast.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              7-Day Weather Outlook for Field
            </h2>
            <span className="text-xs text-slate-400">Rain threshold: &ge;60% or &ge;5 mm</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {forecast.slice(0, 7).map((day, idx) => {
              const isRain =
                (day.rainfall_probability || 0) >= 60 || (day.rainfall || 0) >= 5;
              return (
                <div
                  key={day.date || idx}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isRain
                      ? 'bg-amber-50/80 border-amber-300 shadow-sm'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                    {day.date ? day.date.slice(5) : `D+${idx}`}
                  </span>
                  <div className="my-1.5 flex justify-center">
                    {isRain ? (
                      <CloudRain className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Sun className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {day.temperature_max !== null ? `${Math.round(day.temperature_max)}°C` : '—'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {day.rainfall_probability ?? 0}% rain
                  </span>
                  {isRain && (
                    <Badge variant="warning" className="text-[9px] mt-1 py-0 px-1 font-semibold">
                      Rain Skip
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Schedules Section */}
      {loadingSchedules ? (
        <div className="flex flex-col items-center justify-center p-12">
          <Spinner size="md" className="text-emerald-600" />
          <p className="mt-2 text-xs text-slate-500">Loading irrigation plans...</p>
        </div>
      ) : crops.length === 0 ? (
        <EmptyState
          icon={<Sprout className="w-8 h-8" />}
          title="No planted crops on this farm"
          description="Add a crop to this farm under My Farms to start generating irrigation schedules."
        />
      ) : !latestSchedule ? (
        <EmptyState
          icon={<Droplets className="w-8 h-8" />}
          title="No irrigation schedule generated yet"
          description={`Click "Generate Irrigation Schedule" above to build an optimized watering plan for ${selectedCrop ? selectedCrop.crop_name : 'your crop'}.`}
        />
      ) : (
        <div className="space-y-6">
          {/* Active / Latest Schedule */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-base font-bold text-slate-900">Current Irrigation Plan</h2>
            </div>
            <ScheduleCard
              schedule={latestSchedule}
              onRefresh={handleRefresh}
              isRefreshing={refreshingId === latestSchedule.schedule_id}
            />
          </div>

          {/* Schedule History */}
          {historySchedules.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                Schedule History ({historySchedules.length})
              </h2>

              <div className="space-y-4">
                {historySchedules.map((item) => (
                  <ScheduleCard
                    key={item.schedule_id}
                    schedule={item}
                    onRefresh={handleRefresh}
                    isRefreshing={refreshingId === item.schedule_id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
