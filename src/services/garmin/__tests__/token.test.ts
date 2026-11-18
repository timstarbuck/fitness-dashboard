import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { getGarminToken } from '../token';

describe('Garmin Token Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGarminToken', () => {
    it('should return an access token when API call succeeds', async () => {
      const mockToken = 'mock-access-token-12345';
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockToken),
      } as Response);

      const token = await getGarminToken();
      expect(token).toBe(mockToken);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'ApiKey test-api-key',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle JSON response format', async () => {
      const mockResponse = {
        access_token: 'json-token-67890',
        expires_in: 3600,
        token_type: 'bearer',
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      } as Response);

      const token = await getGarminToken();
      expect(token).toBe(mockResponse.access_token);
    });

    it('should throw error when GARMIN_API_KEY is not set', async () => {
      const originalKey = process.env.GARMIN_API_KEY;
      delete process.env.GARMIN_API_KEY;

      await expect(getGarminToken()).rejects.toThrow('GARMIN_API_KEY is not defined in environment variables');

      process.env.GARMIN_API_KEY = originalKey;
    });

    it('should throw error when API returns 429 (rate limit)', async () => {
      const mockError = {
        retryInSeconds: 60,
        message: 'Rate limit exceeded',
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve(JSON.stringify(mockError)),
      } as Response);

      await expect(getGarminToken()).rejects.toThrow('Failed to fetch Garmin token: Rate limit exceeded! Retry in 60 seconds');
    });

    it('should throw error when API returns non-200 status', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      } as Response);

      await expect(getGarminToken()).rejects.toThrow('HTTP error! status: 401');
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'));

      await expect(getGarminToken()).rejects.toThrow('Failed to fetch Garmin token: Network error');
    });
  });
});