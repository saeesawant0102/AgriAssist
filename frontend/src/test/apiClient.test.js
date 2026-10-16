import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { apiClient, ApiError, setTokenProvider } from '../services/apiClient.js';

const server = setupServer(
  http.get('*/api/v1/success-test', () => {
    return HttpResponse.json({ data: { message: 'hello' } });
  }),
  http.get('*/api/v1/error-test', () => {
    return HttpResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input parameters',
          details: [{ field: 'name', issue: 'Required' }],
        },
      },
      { status: 400 }
    );
  }),
  http.get('*/api/v1/auth-header-test', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    return HttpResponse.json({ data: { authHeader } });
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  setTokenProvider(null);
});
afterAll(() => server.close());

describe('Frontend API Client (apiClient.js)', () => {
  it('ApiClient.Success: unwraps standard response data successfully', async () => {
    const data = await apiClient.get('/success-test');
    expect(data).toEqual({ data: { message: 'hello' } });
  });

  it('ApiClient.ErrorMapping: maps Section 12.1 error JSON into ApiError instance', async () => {
    try {
      await apiClient.get('/error-test');
      expect.fail('Should have thrown an ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.message).toBe('Invalid input parameters');
      expect(err.details).toEqual([{ field: 'name', issue: 'Required' }]);
    }
  });

  it('ApiClient.TokenAttachment: attaches Bearer token from token provider', async () => {
    setTokenProvider(async () => 'mock-id-token-xyz');
    const res = await apiClient.get('/auth-header-test');
    expect(res.data.authHeader).toBe('Bearer mock-id-token-xyz');
  });
});
