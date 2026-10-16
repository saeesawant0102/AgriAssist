import React from 'react';
import { CloudDrizzle, Droplets, Sun, Wind } from 'lucide-react';

/**
 * Requirement: Weather.Display, D17 (5-7 Day Forecast)
 * @param {Object} props
 * @param {Array<Object>} props.forecast - List of daily forecasts
 * @param {number} props.days - Current days setting (5, 6, or 7)
 * @param {(days: number) => void} props.onDaysChange - Callback when user toggles days
 */
export function ForecastList({
  forecast = [],
  days = 7,
  onDaysChange = () => {},
}) {
  return (
    <div className="space-y-4">
      {/* Header and 5/6/7-day filter pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Weather Forecast
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upcoming agricultural conditions across the chosen horizon
          </p>
        </div>

        {/* Days selector: 5, 6, 7 days */}
        <div
          role="group"
          aria-label="Forecast horizon selector"
          className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto"
        >
          {[5, 6, 7].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onDaysChange(num)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                days === num
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {num} Days
            </button>
          ))}
        </div>
      </div>

      {/* Daily Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3">
        {forecast.map((item, idx) => (
          <div
            key={item.date || idx}
            className="flex flex-col justify-between p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-colors"
          >
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                {item.date}
              </span>
              <div className="flex items-center justify-between mt-2">
                <Sun className="w-6 h-6 text-amber-500" />
                <span className="text-xs font-bold text-slate-700 text-right">
                  {item.condition || 'Clear'}
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-900">
                  {item.temperature_max !== null ? `${item.temperature_max}°` : '--'}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {item.temperature_min !== null ? `${item.temperature_min}°` : '--'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-400">
                  <CloudDrizzle className="w-3.5 h-3.5 text-sky-500" />
                  Rain
                </span>
                <span className="font-semibold text-slate-800">
                  {item.rainfall_probability ?? 0}% ({item.rainfall ?? 0} mm)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-400">
                  <Droplets className="w-3.5 h-3.5 text-blue-500" />
                  Humidity
                </span>
                <span className="font-semibold text-slate-800">
                  {item.humidity ?? 0}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-400">
                  <Wind className="w-3.5 h-3.5 text-teal-500" />
                  Wind
                </span>
                <span className="font-semibold text-slate-800">
                  {item.wind_speed ?? 0} km/h
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
