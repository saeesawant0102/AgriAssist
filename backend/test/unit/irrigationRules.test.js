import { describe, expect, it } from 'vitest';
import {
  generateIrrigationPlan,
  isRainyDay,
  RAIN_MM_SKIP,
  RAIN_PROB_SKIP,
} from '../../src/config/irrigationRules.js';

describe('Irrigation Rules & Thresholds Unit Tests (Feature 5)', () => {
  const baseForecast = [
    { date: '2026-05-01', rainfall_probability: 10, rainfall: 0 },
    { date: '2026-05-02', rainfall_probability: 20, rainfall: 0 },
    { date: '2026-05-03', rainfall_probability: 15, rainfall: 1.0 },
    { date: '2026-05-04', rainfall_probability: 30, rainfall: 2.0 },
    { date: '2026-05-05', rainfall_probability: 10, rainfall: 0 },
    { date: '2026-05-06', rainfall_probability: 40, rainfall: 3.0 },
    { date: '2026-05-07', rainfall_probability: 25, rainfall: 0.5 },
  ];

  it('Irrigation.Skip: evaluates rain probability exactly at 60% threshold as rainy', () => {
    expect(isRainyDay({ rainfall_probability: RAIN_PROB_SKIP, rainfall: 0 })).toBe(true);
    expect(isRainyDay({ rainfall_probability: 60, rainfall: 2 })).toBe(true);
  });

  it('Irrigation.Skip: evaluates rainfall exactly at 5 mm threshold as rainy', () => {
    expect(isRainyDay({ rainfall_probability: 20, rainfall: RAIN_MM_SKIP })).toBe(true);
    expect(isRainyDay({ rainfall_probability: 10, rainfall: 5 })).toBe(true);
  });

  it('Irrigation.Skip: evaluates values strictly below both thresholds as non-rainy', () => {
    expect(isRainyDay({ rainfall_probability: 59, rainfall: 4.9 })).toBe(false);
    expect(isRainyDay({ rainfall_probability: 0, rainfall: 0 })).toBe(false);
    expect(isRainyDay(null)).toBe(false);
  });

  it('Irrigation.Skip: verifies logical OR operator when only one threshold is satisfied', () => {
    // Only probability >= 60, rainfall = 0 mm
    expect(isRainyDay({ rainfall_probability: 75, rainfall: 0 })).toBe(true);
    // Probability < 60, but rainfall >= 5 mm
    expect(isRainyDay({ rainfall_probability: 25, rainfall: 8.5 })).toBe(true);
  });

  it('Irrigation.Generate: uses default crop requirements (interval_days: 5, water_mm: 25) for default or unknown crops', () => {
    const planDefault = generateIrrigationPlan('UnknownCrop', baseForecast);
    expect(planDefault.frequency).toBe('Every 5 days');
    expect(planDefault.water_required).toBe('25 mm per irrigation');
    expect(planDefault.start_date).toBe('2026-05-01');
    expect(planDefault.end_date).toBe('2026-05-07');
    // Candidate dates: D[0] (May 1) and D[5] (May 6)
    expect(planDefault.dates).toHaveLength(2);
    expect(planDefault.dates[0].date).toBe('2026-05-01');
    expect(planDefault.dates[1].date).toBe('2026-05-06');
    expect(planDefault.skip_recommended).toBe(0);
    expect(planDefault.note).toBe('');
    expect(planDefault.irrigation_dates).toEqual(['2026-05-01', '2026-05-06']);
    expect(planDefault.skipped_dates).toEqual([]);
  });

  it('Irrigation.Skip: generates skip recommendations and exact note format when candidate date is rainy', () => {
    const rainyForecast = [
      { date: '2026-05-01', rainfall_probability: 10, rainfall: 0 },
      { date: '2026-05-02', rainfall_probability: 20, rainfall: 0 },
      { date: '2026-05-03', rainfall_probability: 15, rainfall: 1.0 },
      { date: '2026-05-04', rainfall_probability: 30, rainfall: 2.0 },
      { date: '2026-05-05', rainfall_probability: 10, rainfall: 0 },
      // D[5] is candidate date: rain >= 5 mm
      { date: '2026-05-06', rainfall_probability: 45, rainfall: 12.0 },
      { date: '2026-05-07', rainfall_probability: 25, rainfall: 0.5 },
    ];

    const plan = generateIrrigationPlan('Wheat', rainyForecast);
    expect(plan.skip_recommended).toBe(1);
    expect(plan.irrigation_dates).toEqual(['2026-05-01']);
    expect(plan.skipped_dates).toEqual(['2026-05-06']);
    expect(plan.note).toBe('Rainfall expected on 2026-05-06; skip irrigation on these dates.');
  });

  it('Irrigation.Generate: handles multiple skipped candidate dates in note format', () => {
    // interval = 5 days: D[0] and D[5]
    const heavyRainForecast = [
      { date: '2026-05-01', rainfall_probability: 65, rainfall: 2.0 }, // D[0] rainy
      { date: '2026-05-02', rainfall_probability: 20, rainfall: 0 },
      { date: '2026-05-03', rainfall_probability: 15, rainfall: 1.0 },
      { date: '2026-05-04', rainfall_probability: 30, rainfall: 2.0 },
      { date: '2026-05-05', rainfall_probability: 10, rainfall: 0 },
      { date: '2026-05-06', rainfall_probability: 20, rainfall: 6.0 }, // D[5] rainy
      { date: '2026-05-07', rainfall_probability: 25, rainfall: 0.5 },
    ];

    const plan = generateIrrigationPlan('Wheat', heavyRainForecast);
    expect(plan.skip_recommended).toBe(1);
    expect(plan.irrigation_dates).toEqual([]);
    expect(plan.skipped_dates).toEqual(['2026-05-01', '2026-05-06']);
    expect(plan.note).toBe('Rainfall expected on 2026-05-01, 2026-05-06; skip irrigation on these dates.');
  });

  it('Irrigation.Generate: throws error if forecast days array is empty', () => {
    expect(() => generateIrrigationPlan('Wheat', [])).toThrow();
  });
});
