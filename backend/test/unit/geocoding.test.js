import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { geocodeLocation } from '../../src/weather/geocoding.js';

describe('Geocoding Unit Tests (Feature 2)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('Farm.Add: successfully geocodes a location name', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            name: 'Nagpur',
            latitude: 21.1458,
            longitude: 79.0882,
          },
        ],
      }),
    });

    const res = await geocodeLocation('Nagpur', 'https://geocoding-api.open-meteo.com', 3000);
    expect(res).toEqual({
      latitude: 21.1458,
      longitude: 79.0882,
      name: 'Nagpur',
    });
  });

  it('Farm.Validate: throws 400 LOCATION_NOT_FOUND when location is empty', async () => {
    await expect(geocodeLocation('')).rejects.toMatchObject({
      status: 400,
      code: 'LOCATION_NOT_FOUND',
    });
    await expect(geocodeLocation('   ')).rejects.toMatchObject({
      status: 400,
      code: 'LOCATION_NOT_FOUND',
    });
  });

  it('PE-3: throws 400 LOCATION_NOT_FOUND when geocoding returns no results', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await expect(
      geocodeLocation('NowhereLandXyz', 'https://geocoding-api.open-meteo.com', 3000)
    ).rejects.toMatchObject({
      status: 400,
      code: 'LOCATION_NOT_FOUND',
    });
  });

  it('PE-3: throws 502 WEATHER_UNAVAILABLE when geocoding service returns non-200', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    await expect(
      geocodeLocation('Pune', 'https://geocoding-api.open-meteo.com', 3000)
    ).rejects.toMatchObject({
      status: 502,
      code: 'WEATHER_UNAVAILABLE',
    });
  });

  it('PE-3: throws 502 WEATHER_UNAVAILABLE when fetch aborts or times out', async () => {
    global.fetch = vi.fn().mockRejectedValue(new (class AbortError extends Error {
      constructor() {
        super('The operation was aborted');
        this.name = 'AbortError';
      }
    })());

    await expect(
      geocodeLocation('Pune', 'https://geocoding-api.open-meteo.com', 3000)
    ).rejects.toMatchObject({
      status: 502,
      code: 'WEATHER_UNAVAILABLE',
    });
  });
});
