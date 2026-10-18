import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { exportFinancialReportCsv } from '../../../utils/exportCsv.js';
import { exportFinancialReportPdf } from '../../../utils/exportPdf.js';
import { getFinancialReportDatasetApi } from '../api.js';

/**
 * ExportButtons component for generating client-side CSV and PDF reports.
 * Requirement: Export Report, D13, Section 12.8
 */
export function ExportButtons({ farmId, dateRange = {}, currency = 'INR' }) {
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState(null);

  const handleExportCsv = async () => {
    if (!farmId) return;
    try {
      setExportingCsv(true);
      setError(null);
      const dataset = await getFinancialReportDatasetApi(farmId, dateRange);
      exportFinancialReportCsv(dataset, currency);
    } catch (err) {
      setError(err.message || 'Failed to export CSV report');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    if (!farmId) return;
    try {
      setExportingPdf(true);
      setError(null);
      const dataset = await getFinancialReportDatasetApi(farmId, dateRange);
      exportFinancialReportPdf(dataset, currency);
    } catch (err) {
      setError(err.message || 'Failed to export PDF report');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2">
      {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={!farmId || exportingCsv || exportingPdf}
          className="gap-1.5 text-xs text-slate-700 hover:text-slate-900"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>{exportingCsv ? 'Exporting...' : 'Export CSV'}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExportPdf}
          disabled={!farmId || exportingCsv || exportingPdf}
          className="gap-1.5 text-xs text-slate-700 hover:text-slate-900"
        >
          <FileText className="w-4 h-4 text-red-600" />
          <span>{exportingPdf ? 'Exporting...' : 'Export PDF'}</span>
        </Button>
      </div>
    </div>
  );
}
