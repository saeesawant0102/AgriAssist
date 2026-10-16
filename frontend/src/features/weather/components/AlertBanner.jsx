import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';

/**
 * Requirement: Weather Alert Notification (Section 13.5, D12)
 * Displays severe weather alerts evaluated from the forecast.
 * @param {Object} props
 * @param {Array<{ alert_type: string, severity: string, date: string, message: string }>} props.alerts
 */
export function AlertBanner({ alerts = [] }) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  const getAlertBadgeVariant = (type) => {
    switch (type) {
      case 'HIGH_WIND':
      case 'THUNDERSTORM':
      case 'HEAVY_RAIN':
        return 'danger';
      case 'EXTREME_HEAT':
      case 'FROST':
        return 'warning';
      default:
        return 'danger';
    }
  };

  return (
    <div
      role="alert"
      className="rounded-xl border border-red-300 bg-red-50/90 p-4 shadow-sm text-red-900 transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-red-100 rounded-lg text-red-600 shrink-0">
          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-red-950 tracking-tight">
            Weather Alert Notification — Severe Weather Expected
          </h2>
          <p className="text-xs text-red-700 mt-0.5">
            The weather service has detected severe weather conditions over the next 3 days:
          </p>

          <div className="mt-3 space-y-2">
            {alerts.map((alert, idx) => (
              <div
                key={`${alert.alert_type}-${alert.date}-${idx}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white/80 rounded-lg border border-red-200 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={getAlertBadgeVariant(alert.alert_type)}>
                    {alert.alert_type.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs font-semibold text-slate-600">
                    {alert.date}
                  </span>
                </div>
                <p className="text-xs text-slate-800 font-medium">
                  {alert.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
