import React from 'react';

/**
 * Table container component. Supports both compound composition:
 *   <Table>
 *     <TableHeader><TableRow><TableHead>...</TableHead></TableRow></TableHeader>
 *     <TableBody><TableRow><TableCell>...</TableCell></TableRow></TableBody>
 *   </Table>
 * and data-driven configuration:
 *   <Table columns={columns} data={data} />
 */
export function Table({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'No data available',
  className = '',
  children,
  ...props
}) {
  if (children) {
    return (
      <div className={`overflow-x-auto rounded-lg border border-slate-200 ${className}`}>
        <table className="w-full text-left text-sm text-slate-700" {...props}>
          {children}
        </table>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto rounded-lg border border-slate-200 ${className}`}>
      <table className="w-full text-left text-sm text-slate-700" {...props}>
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-slate-400 italic"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={row[keyField] ?? idx} className="hover:bg-slate-50/75 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.cellClassName || ''}`}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TableHeader({ className = '', children, ...props }) {
  return (
    <thead
      className={`bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({ className = '', children, ...props }) {
  return (
    <tbody className={`divide-y divide-slate-100 bg-white ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className = '', children, ...props }) {
  return (
    <tr className={`hover:bg-slate-50/75 transition-colors ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ className = '', children, ...props }) {
  return (
    <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ className = '', children, ...props }) {
  return (
    <td className={`px-4 py-3 text-slate-700 ${className}`} {...props}>
      {children}
    </td>
  );
}
