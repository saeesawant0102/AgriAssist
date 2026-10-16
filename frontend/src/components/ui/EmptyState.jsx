import React from 'react';
import { PackageOpen } from 'lucide-react';

export function EmptyState({
  title = 'No records found',
  description = 'Get started by adding your first record.',
  icon = null,
  action = null,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-white border border-slate-200 border-dashed rounded-xl ${className}`}>
      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full mb-3">
        {icon || <PackageOpen className="w-8 h-8" />}
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mt-1 mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
