import axios from 'axios';
import { env } from '../config/env.js';

export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} code
   * @param {string} message
   * @param {Array<any>} [details=[]]
   */
  constructor(status, code, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let tokenProvider = null;

/**
 * Configure a custom token provider function (e.g. from Firebase Auth).
 * @param {() => Promise<string | null>} fn
 */
export function setTokenProvider(fn) {
  tokenProvider = fn;
}

// Request interceptor: attach Firebase ID token when available
apiClient.interceptors.request.use(
  async (config) => {
    if (tokenProvider) {
      try {
        const token = await tokenProvider();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.error('[ApiClient] Failed to acquire auth token:', err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: map Section 12.1 error format into ApiError
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      if (data && data.error) {
        return Promise.reject(
          new ApiError(
            status,
            data.error.code || 'UNKNOWN_ERROR',
            data.error.message || 'An unexpected server error occurred',
            data.error.details || []
          )
        );
      }
      return Promise.reject(
        new ApiError(status, 'HTTP_ERROR', `Request failed with status ${status}`)
      );
    }
    return Promise.reject(
      new ApiError(0, 'NETWORK_ERROR', error.message || 'Network connection failed')
    );
  }
);
