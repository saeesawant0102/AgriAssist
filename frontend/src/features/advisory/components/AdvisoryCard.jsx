import React from 'react';
import { Calendar, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';

/**
 * Requirement: Advisory.Display (Advisory Card)
 * Displays a single crop advisory recommendation and message.
 * @param {Object} props
 * @param {Object} props.advisory - Advisory details
 * @param {string} [props.cropName] - Name of the crop
 */
export function AdvisoryCard({ advisory, cropName = 'Target Crop' }) {
  if (!advisory) return null;

  const getHeadlineBadgeVariant = (headline) => {
    switch (headline) {
      case 'Harvest before rain':
      case 'Heavy rain':
        return 'danger';
      case 'Heat stress':
      case 'Cold / frost':
      case 'Strong wind':
      case 'Fungal risk':
        return 'warning';
      case 'Favourable conditions':
        return 'success';
      default:
        return 'info';
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-emerald-50/30 rounded-2xl border border-emerald-200/80 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-emerald-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 block">
              Crop Advisory Recommendation
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              {cropName}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={getHeadlineBadgeVariant(advisory.recommendation)} size="md">
            {advisory.recommendation}
          </Badge>
        </div>
      </div>

      <div className="py-5">
        <h3 className="text-base font-bold text-slate-900 mb-2">
          {advisory.recommendation}
        </h3>
        <p className="text-sm leading-relaxed text-slate-700 font-medium bg-white/70 p-4 rounded-xl border border-emerald-100/60 shadow-2xs">
          {advisory.message}
        </p>
      </div>

      <div className="pt-4 border-t border-emerald-100/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Forecast Date: <strong className="text-slate-700">{advisory.date}</strong></span>
        </div>
        {advisory.created_at && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Generated: {new Date(advisory.created_at).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
