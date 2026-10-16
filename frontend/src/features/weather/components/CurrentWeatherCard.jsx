import React from 'react';
import {
  CloudDrizzle,
  CloudRain,
  Compass,
  Droplets,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';

/**
 * Requirement: Weather.Display (Current Weather)
 * Displays current weather metrics and stale indicator if applicable.
 * @param {Object} props
 * @param {Object} props.weather - Current weather data
 * @param {string} [props.farmName] - Name of the selected farm
 */
export function CurrentWeatherCard({ weather, farmName = 'Selected Farm' }) {
  if (!weather) return null;

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/80 rounded-2xl border border-slate-200/80 p-6 shadow-sm">
      {/* Stale Cache Notice */}
      {weather.stale && (
        <div
          role="status"
          className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold">⚠️ Stale Data:</span>
            <span>Live updates unavailable; displaying latest cached reading.</span>
          </div>
          <Badge variant="warning" size="sm">
            Cached
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 block">
            Current Observations
          </span>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            {farmName}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Observed Date: {weather.date}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" size="md">
            {weather.condition || 'Clear'}
          </Badge>
        </div>
      </div>

      {/* Primary Hero Temp & Condition */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 py-6 border-b border-slate-100">
        <div className="md:col-span-2 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
            <Sun className="w-9 h-9" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                {weather.temperature !== null ? `${weather.temperature}°C` : '--'}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-600 mt-0.5">
              {weather.forecast || weather.condition || 'Normal conditions'}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <span className="text-xs text-slate-400 font-medium">Daily Range</span>
          <div className="flex items-center gap-2 mt-1">
            <Thermometer className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-semibold text-slate-800">
              High: {weather.temperature_max !== null ? `${weather.temperature_max}°C` : '--'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Thermometer className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-slate-800">
              Low: {weather.temperature_min !== null ? `${weather.temperature_min}°C` : '--'}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <span className="text-xs text-slate-400 font-medium">Wind &amp; Humidity</span>
          <div className="flex items-center gap-2 mt-1">
            <Wind className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-800">
              {weather.wind_speed !== null ? `${weather.wind_speed} km/h` : '--'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Droplets className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-800">
              {weather.humidity !== null ? `${weather.humidity}%` : '--'}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Droplets className="w-3.5 h-3.5 text-blue-500" />
            <span>Relative Humidity</span>
          </div>
          <p className="text-base font-bold text-slate-900 mt-1">
            {weather.humidity !== null ? `${weather.humidity}%` : '--'}
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <CloudRain className="w-3.5 h-3.5 text-indigo-500" />
            <span>Precipitation</span>
          </div>
          <p className="text-base font-bold text-slate-900 mt-1">
            {weather.rainfall !== null ? `${weather.rainfall} mm` : '--'}
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <CloudDrizzle className="w-3.5 h-3.5 text-sky-500" />
            <span>Rain Probability</span>
          </div>
          <p className="text-base font-bold text-slate-900 mt-1">
            {weather.rainfall_probability !== null ? `${weather.rainfall_probability}%` : '--'}
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Compass className="w-3.5 h-3.5 text-teal-500" />
            <span>Wind Velocity</span>
          </div>
          <p className="text-base font-bold text-slate-900 mt-1">
            {weather.wind_speed !== null ? `${weather.wind_speed} km/h` : '--'}
          </p>
        </div>
      </div>
    </div>
  );
}
