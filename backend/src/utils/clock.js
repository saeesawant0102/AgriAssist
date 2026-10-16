/**
 * Clock base contract
 */
export class Clock {
  /**
   * Returns current Date
   * @returns {Date}
   */
  now() {
    throw new Error('Not implemented');
  }

  /**
   * Returns ISO 8601 UTC string
   * @returns {string}
   */
  iso() {
    return this.now().toISOString();
  }

  /**
   * Returns YYYY-MM-DD date string
   * @returns {string}
   */
  today() {
    return this.iso().split('T')[0];
  }
}

/**
 * System clock using real machine time
 */
export class SystemClock extends Clock {
  now() {
    return new Date();
  }
}

/**
 * Fixed clock for deterministic tests
 */
export class FixedClock extends Clock {
  /**
   * @param {Date | string} fixedDate
   */
  constructor(fixedDate = new Date()) {
    super();
    this._current = fixedDate instanceof Date ? fixedDate : new Date(fixedDate);
  }

  now() {
    return new Date(this._current.getTime());
  }

  /**
   * Advances the clock by milliseconds
   * @param {number} ms
   */
  advance(ms) {
    this._current = new Date(this._current.getTime() + ms);
  }

  /**
   * Sets the clock to a specific date/time
   * @param {Date | string} date
   */
  set(date) {
    this._current = date instanceof Date ? date : new Date(date);
  }
}
