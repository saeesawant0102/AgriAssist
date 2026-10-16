import { FixedClock } from '../../src/utils/clock.js';

export function createFixedClock(initialDate = '2026-04-15T10:00:00.000Z') {
  return new FixedClock(initialDate);
}
