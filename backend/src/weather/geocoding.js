import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

/**
 * Geocodes a location name to latitude and longitude using Open-Meteo Geocoding API.
 * Requirement: R1, Farm.Add, PE-3
 * @param {string} locationName
 * @param {string} [baseUrl]
 * @param {number} [timeoutMs]
 * @returns {Promise<{ latitude: number, longitude: number, name: string }>}
 */
export async function geocodeLocation(
  locationName,
  baseUrl = env.OPEN_METEO_GEOCODING_URL,
  timeoutMs = env.WEATHER_TIMEOUT_MS
) {
  if (!locationName || typeof locationName !== 'string' || !locationName.trim()) {
    throw AppError.locationNotFound('Location name is required for geocoding');
  }

  const trimmed = locationName.trim();
  const url = `${baseUrl.replace(/\/$/, '')}/v1/search?name=${encodeURIComponent(
    trimmed
  )}&count=1&language=en&format=json`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw AppError.weatherUnavailable(`Geocoding service returned status ${response.status}`);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.results) || data.results.length === 0) {
      throw AppError.locationNotFound(`Location "${trimmed}" could not be geocoded`);
    }

    const first = data.results[0];
    return {
      latitude: Number(first.latitude),
      longitude: Number(first.longitude),
      name: first.name || trimmed,
    };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    if (err.name === 'AbortError') {
      throw AppError.weatherUnavailable('Geocoding request timed out');
    }
    throw AppError.weatherUnavailable(err.message || 'Geocoding service is unavailable');
  } finally {
    clearTimeout(timeoutId);
  }
}
