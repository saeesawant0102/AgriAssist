import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export function Toast({
  type = 'success',
  message,
  onClose,
}) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const borders = {
    success: 'border-emerald-200 bg-emerald-50/90 text-emerald-900',
    error: 'border-red-200 bg-red-50/90 text-red-900',
    info: 'border-blue-200 bg-blue-50/90 text-blue-900',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm text-sm transition-all animate-in slide-in-from-top duration-300 ${borders[type]}`}
    >
      <span className="flex-shrink-0">{icons[type]}</span>
      <span className="font-medium flex-1">{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          className="p-1 hover:opacity-75 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
