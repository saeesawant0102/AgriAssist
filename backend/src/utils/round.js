/**
 * Round a number to a specified number of decimal places accurately.
 * @param {number | string} value
 * @param {number} [decimals=2]
 * @returns {number}
 */
export function round(value, decimals = 2) {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
}

/**
 * Round financial values to two decimal places.
 * @param {number | string} value
 * @returns {number}
 */
export function round2(value) {
  return round(value, 2);
}

/**
 * Round weather values (humidity mean, temperatures) to one decimal place.
 * @param {number | string} value
 * @returns {number}
 */
export function round1(value) {
  return round(value, 1);
}
