import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fetchGarminActivities, fetchGarminActivityDetails, type GarminActivity } from '../activities';

// Mock the global fetch function
global.fetch = jest.fn<typeof fetch>();

describe('Garmin Activities Service', () => {
  const mockToken = 'test-token-12345';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchGarminActivities', () => {
    it('should fetch activities without date range', async () => {
      const mockActivities: GarminActivity[] = [
        {
          activityId: 12345,
          activityName: 'Morning Run',
          distance: 5.2,
          duration: 1800,
          activityType: {
            typeId: 1,
            typeKey: 'running',
            parentTypeId: 2,
          },
          calories: 0,
        },
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockActivities),
      } as unknown as Response);

      const activities = await fetchGarminActivities(mockToken);
      expect(activities).toEqual(mockActivities);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://personal.connectapi.garmin.com/activitylist-service/activities/search/activities',
        expect.objectContaining({
          headers: {
            'Authorization': `Bearer ${mockToken}`,
          },
        })
      );
    });

    it('should fetch activities with date range', async () => {
      const mockActivities: GarminActivity[] = [];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockActivities),
      } as unknown as Response);

      await fetchGarminActivities(mockToken, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2024-01-01'),
        expect.anything()
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('endDate=2024-01-31'),
        expect.anything()
      );
    });

    it('should throw error when API returns non-200 status', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not found',
      } as unknown as Response);

      await expect(fetchGarminActivities(mockToken)).rejects.toThrow('HTTP error! status: 404');
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchGarminActivities(mockToken)).rejects.toThrow('Failed to fetch Garmin activities: Network error');
    });
  });

  describe('fetchGarminActivityDetails', () => {
    it('should fetch activity details by ID', async () => {
      const mockActivity: GarminActivity = {
        activityId: 12345,
        activityName: 'Detailed Run',
        distance: 10.5,
        duration: 3600,
        activityType: {
          typeId: 1,
          typeKey: 'running',
          parentTypeId: 2,
        },
        calories: 0,
        splits: [
          { splitNumber: 1, distance: 5.2, duration: 1800 },
          { splitNumber: 2, distance: 5.3, duration: 1800 },
        ],
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockActivity,
      } as unknown as Response);

      const activity = await fetchGarminActivityDetails(mockToken, 12345);
      expect(activity).toEqual(mockActivity);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://personal.connectapi.garmin.com/activity-service/activity/12345',
        expect.objectContaining({
          headers: {
            'Authorization': `Bearer ${mockToken}`,
          },
        })
      );
    });

    it('should throw error when API returns non-200 status', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Activity not found',
      } as unknown as Response);

      await expect(fetchGarminActivityDetails(mockToken, 99999)).rejects.toThrow('HTTP error! status: 404');
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchGarminActivityDetails(mockToken, 12345)).rejects.toThrow('Failed to fetch Garmin activity details: Network error');
    });
  });
});