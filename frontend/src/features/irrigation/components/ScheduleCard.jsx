import React from 'react';
import { Calendar, Droplets, RefreshCw, Clock } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { SkipNotice } from './SkipNotice.jsx';

/**
 * ScheduleCard component displaying irrigation schedule details and refresh action.
 * Requirement: Irrigation.View, Irrigation.Update, BR-5
 */
export function ScheduleCard({ schedule, onRefresh, isRefreshing = false }) {
  if (!schedule) return null;

  const irrigationDates = schedule.irrigation_dates || [];
  const skippedDates = schedule.skipped_dates || [];

  return (
    <Card className="overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
      <div className="space-y-5">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Irrigation Schedule #{schedule.schedule_id}
              </span>
              {schedule.skip_recommended === 1 ? (
                <Badge variant="warning">Rain-Skip Active</Badge>
              ) : (
                <Badge variant="success">Normal Schedule</Badge>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              {schedule.start_date} to {schedule.end_date}
            </h3>
          </div>

          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRefresh(schedule.schedule_id)}
              disabled={isRefreshing}
              className="gap-1.5 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Schedule'}</span>
            </Button>
          )}
        </div>

        {/* Skip Notice if rain predicted */}
        {schedule.skip_recommended === 1 && (
          <SkipNotice note={schedule.note} skippedDates={skippedDates} />
        )}

        {/* Schedule metadata metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Frequency</span>
              <span className="text-sm font-semibold text-slate-800">{schedule.frequency}</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center flex-shrink-0">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Water Required</span>
              <span className="text-sm font-semibold text-slate-800">{schedule.water_required}</span>
            </div>
          </div>
        </div>

        {/* Candidate Dates List */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Scheduled Watering Days
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {irrigationDates.map((date) => (
              <div
                key={date}
                className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200/60 text-xs text-emerald-950 font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-emerald-600" />
                  {date}
                </span>
                <Badge variant="success" className="text-[10px] py-0 px-1.5">
                  Irrigate
                </Badge>
              </div>
            ))}

            {skippedDates.map((date) => (
              <div
                key={date}
                className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/60 text-xs text-amber-950 font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  {date}
                </span>
                <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                  Skip (Rain)
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {schedule.updated_at && (
          <div className="text-[11px] text-slate-400 text-right pt-2 border-t border-slate-100">
            Last updated: {new Date(schedule.updated_at).toLocaleString()}
          </div>
        )}
      </div>
    </Card>
  );
}
