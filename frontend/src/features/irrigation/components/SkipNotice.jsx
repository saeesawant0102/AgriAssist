import React from 'react';
import { AlertTriangle, CloudRain } from 'lucide-react';

/**
 * SkipNotice component.
 * Requirement: Irrigation.Skip, BR-5, Section 13.3
 * Displays warning banner when rainfall is expected and irrigation should be skipped.
 */
export function SkipNotice({ note, skippedDates = [] }) {
  if (!note && (!skippedDates || skippedDates.length === 0)) {
    return null;
  }

  return (
    <div
      role="alert"
      className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg text-amber-700 flex-shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-amber-950 flex items-center gap-1.5">
              <CloudRain className="w-4 h-4 text-amber-700" />
              Rain-Skip Recommended
            </h4>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            {note || `Rainfall expected on ${skippedDates.join(', ')}; skip irrigation on these dates.`}
          </p>
        </div>
      </div>
    </div>
  );
}
