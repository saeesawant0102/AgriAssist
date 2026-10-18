/**
 * Utility for exporting data to CSV with spreadsheet formula injection protection.
 * Requirement: Export Report, D13, Section 7.4
 */

/**
 * Sanitizes a string to prevent spreadsheet formula injection.
 * Prepends a single quote if the value starts with =, +, -, @, \t, or \r.
 * @param {any} value
 * @returns {string}
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Converts headers and row data into a formatted CSV string.
 * @param {string[]} headers
 * @param {Array<Array<any>>} rows
 * @returns {string}
 */
export function buildCsvContent(headers, rows) {
  const formatCell = (val) => {
    const sanitized = sanitizeCsvCell(val);
    const escaped = sanitized.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const headerLine = headers.map(formatCell).join(',');
  const rowLines = rows.map((row) => row.map(formatCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Triggers browser download of a CSV file.
 * @param {string} filename
 * @param {string} csvContent
 */
export function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports a full financial report dataset to CSV.
 * @param {Object} dataset - { farm, period, records, totals, generated_at }
 * @param {string} [currency='INR']
 */
export function exportFinancialReportCsv(dataset, currency = 'INR') {
  const { farm, period, records = [], totals, generated_at } = dataset;

  const metadataRows = [
    ['AgriAssist Financial Report'],
    ['Farm Name', farm?.farm_name || 'N/A'],
    ['Farm Location', farm?.location || 'N/A'],
    ['Reporting Period', `${period?.start_date || 'All-time'} to ${period?.end_date || 'Present'}`],
    ['Currency', currency],
    ['Generated At', generated_at || new Date().toISOString()],
    [],
    ['Summary Metrics'],
    ['Total Income', totals?.total_income ?? 0],
    ['Total Expense', totals?.total_expense ?? 0],
    ['Net Profit / Loss', totals?.net_profit ?? 0],
    ['Total Records', totals?.record_count ?? records.length],
    [],
  ];

  const tableHeaders = ['Record ID', 'Type', 'Date', 'Amount', 'Description'];
  const recordRows = records.map((r) => [
    r.record_id || '',
    r.type || '',
    r.date || '',
    r.amount ?? 0,
    r.description || '',
  ]);

  const allRows = [...metadataRows, tableHeaders, ...recordRows];
  const formatCell = (val) => {
    const sanitized = sanitizeCsvCell(val);
    const escaped = sanitized.replace(/"/g, '""');
    return `"${escaped}"`;
  };
  const csvContent = allRows.map((row) => row.map(formatCell).join(',')).join('\r\n');

  const startStr = period?.start_date || 'all';
  const endStr = period?.end_date || 'time';
  const filename = `financial_report_farm_${farm?.farm_id || 'unknown'}_${startStr}_to_${endStr}.csv`;

  downloadCsv(filename, csvContent);
}
