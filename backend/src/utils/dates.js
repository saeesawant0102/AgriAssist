const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates if a string is a valid YYYY-MM-DD date.
 * @param {string} str
 * @returns {boolean}
 */
export function isValidDateString(str) {
  if (typeof str !== 'string' || !DATE_REGEX.test(str)) {
    return false;
  }
  const date = new Date(str + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(str);
}

/**
 * Formats a Date object or string into YYYY-MM-DD.
 * @param {Date | string} date
 * @returns {string}
 */
export function formatDate(date) {
  if (typeof date === 'string' && DATE_REGEX.test(date)) {
    return date;
  }
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Adds integer days to a YYYY-MM-DD string.
 * @param {string} dateStr
 * @param {number} days
 * @returns {string}
 */
export function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Calculates days between two YYYY-MM-DD dates (inclusive or difference).
 * @param {string} startStr
 * @param {string} endStr
 * @returns {number}
 */
export function daysBetween(startStr, endStr) {
  const start = new Date(startStr + 'T00:00:00Z');
  const end = new Date(endStr + 'T00:00:00Z');
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
