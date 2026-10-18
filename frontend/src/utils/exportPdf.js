import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Utility for exporting financial reports to formatted PDF documents.
 * Requirement: Export Report, D13, Section 12.8
 * @param {Object} dataset - { farm, period, records, totals, generated_at }
 * @param {string} [currency='INR']
 */
export function exportFinancialReportPdf(dataset, currency = 'INR') {
  const { farm, period, records = [], totals, generated_at } = dataset;

  const doc = new jsPDF();

  // Document Title Header
  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129); // Emerald 600
  doc.text('AgriAssist - Financial Report', 14, 20);

  // Metadata
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text(`Farm: ${farm?.farm_name || 'N/A'} (${farm?.location || 'N/A'})`, 14, 28);
  doc.text(
    `Period: ${period?.start_date || 'All-time'} to ${period?.end_date || 'Present'}`,
    14,
    34
  );
  doc.text(
    `Generated: ${generated_at ? new Date(generated_at).toLocaleString() : new Date().toLocaleString()}`,
    14,
    40
  );

  // Summary Metrics Box
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(14, 46, 182, 22, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(`Total Income: ${currency} ${totals?.total_income ?? 0}`, 20, 56);
  doc.text(`Total Expense: ${currency} ${totals?.total_expense ?? 0}`, 80, 56);

  const netProfit = totals?.net_profit ?? 0;
  if (netProfit < 0) {
    doc.setTextColor(220, 38, 38); // Red 600
    doc.text(`Net Loss: ${currency} ${Math.abs(netProfit)}`, 140, 56);
  } else {
    doc.setTextColor(16, 185, 129); // Emerald 600
    doc.text(`Net Profit: ${currency} ${netProfit}`, 140, 56);
  }

  doc.setTextColor(71, 85, 105);
  doc.text(`Total Transactions: ${totals?.record_count ?? records.length}`, 20, 63);

  // Table of Records
  const tableHeaders = [['ID', 'Type', 'Date', `Amount (${currency})`, 'Description']];
  const tableData = records.map((r) => [
    r.record_id || '',
    r.type || '',
    r.date || '',
    r.amount !== undefined ? Number(r.amount).toFixed(2) : '0.00',
    r.description || '—',
  ]);

  doc.autoTable({
    startY: 74,
    head: tableHeaders,
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { top: 74, left: 14, right: 14 },
  });

  const startStr = period?.start_date || 'all';
  const endStr = period?.end_date || 'time';
  const filename = `financial_report_farm_${farm?.farm_id || 'unknown'}_${startStr}_to_${endStr}.pdf`;

  doc.save(filename);
}
