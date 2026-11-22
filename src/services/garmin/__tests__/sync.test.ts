import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { 
  syncGarminActivities, 
  syncGarminHRV, 
  syncGarminSleep,
  getRetryDelayFromError,
  delay
} from '../sync';
import { db } from '../../../../db';

// Import modules for spying
import * as tokenModule from '../token';
import * as activitiesModule from '../activities';
import * as hrvModule from '../hrv';
import * as sleepModule from '../sleep';

describe('Garmin Sync Service', () => {
  const mockToken = 'test-token-12345';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TIMEZONE = 'America/New_York';
  });

  describe('getRetryDelayFromError', () => {
    it('should extract retry delay from error message', () => {
      const error = new Error('Rate limit exceeded! Retry in 60 seconds');
      const retryDelay = getRetryDelayFromError(error);
      expect(retryDelay).toBe(60);
    });

    it('should return default delay for 429 errors without specific delay', () => {
      const error = new Error('HTTP error! status: 429');
      const retryDelay = getRetryDelayFromError(error);
      expect(retryDelay).toBe(60); // Default retry delay
    });

    it('should return null for errors without retry information', () => {
      const error = new Error('Some other error');
      const retryDelay = getRetryDelayFromError(error);
      expect(retryDelay).toBeNull();
    });

    it('should return null for non-Error objects', () => {
      const retryDelay = getRetryDelayFromError('string error');
      expect(retryDelay).toBeNull();
    });
  });

  describe('delay', () => {
    it('should wait for specified time', async () => {
      const start = Date.now();
      await delay(100); // 100ms
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(100);
    });
  });

  describe('syncGarminActivities', () => {
    it('should sync activities successfully', async () => {
      // Mock the token fetch
      jest.spyOn(tokenModule, 'getGarminToken').mockResolvedValue(mockToken);

      // Mock activity fetch
      const mockActivities = [
        {
          activityId: 12345,
          activityName: 'Test Activity',
          startTimeLocal: '2024-01-15 12:00:00',
          startTimeGMT: '2024-01-15 17:00:00',
          distance: 5.2,
          duration: 1800,
          activityType: { typeId: 1, typeKey: 'running', parentTypeId: 2 },
          calories: 300,
        },
      ] as const;

      jest.spyOn(activitiesModule, 'fetchGarminActivities').mockResolvedValue([...mockActivities]);

      // Mock database operations. The upsert chain ends in .returning() (the
      // repository needs the stored row's uuid to key split inserts); splits use
      // .onConflictDoNothing().
      const mockReturning = jest.fn<() => Promise<{ id: string }[]>>().mockResolvedValue([{ id: 'test-activity-uuid' }]);
      db.insert = jest.fn(() => ({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnThis(),
          onConflictDoNothing: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
          returning: mockReturning,
        }),
      })) as unknown as typeof db.insert;

      const result = await syncGarminActivities();

      expect(result.fetched).toBe(1);
      expect(result.synced).toBe(1);
    });

    it('should handle rate limit errors and retry', async () => {
      let callCount = 0;
      jest.spyOn(tokenModule, 'getGarminToken').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Rate limit exceeded! Retry in 1 seconds');
        }
        return mockToken;
      });

      const result = await syncGarminActivities();

      expect(result.fetched).toBe(1);
      expect(result.synced).toBe(1);
    }, 25000);

    it('should key split inserts by the stored activity uuid, not the Garmin numeric id', async () => {
      jest.spyOn(tokenModule, 'getGarminToken').mockResolvedValue(mockToken);

      const mockActivities = [
        {
          activityId: 12345,
          activityName: 'Test Activity',
          startTimeLocal: '2024-01-15 12:00:00',
          startTimeGMT: '2024-01-15 17:00:00',
          distance: 5.2,
          duration: 1800,
          activityType: { typeId: 1, typeKey: 'running', parentTypeId: 2 },
          calories: 300,
        },
      ] as const;

      jest.spyOn(activitiesModule, 'fetchGarminActivities').mockResolvedValue([...mockActivities]);
      jest.spyOn(activitiesModule, 'fetchGarminActivityDetails').mockResolvedValue({
        activityId: 12345,
        activityName: 'Test Activity',
        startTimeLocal: '2024-01-15 12:00:00',
        startTimeGMT: '2024-01-15 17:00:00',
        activityType: { typeId: 1, typeKey: 'running', parentTypeId: 2 },
        distance: 5.2,
        duration: 1800,
        calories: 300,
        splits: [
          { splitNumber: 1, distance: 2600, duration: 900, avgSpeed: 2.8 },
          { splitNumber: 2, distance: 2600, duration: 950 },
        ],
      });

      // The upsert's .returning() yields the stored row (uuid); splits must be
      // keyed by that uuid because activity_splits.activity_id is a uuid FK.
      const mockValues = jest.fn().mockReturnValue({
        onConflictDoUpdate: jest.fn().mockReturnThis(),
        onConflictDoNothing: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        returning: jest.fn<() => Promise<{ id: string }[]>>().mockResolvedValue([{ id: 'stored-activity-uuid' }]),
      });
      db.insert = jest.fn(() => ({ values: mockValues })) as unknown as typeof db.insert;

      await syncGarminActivities();

      // First values() call is the activity upsert; second is the splits insert.
      const splitValues = mockValues.mock.calls[1][0] as Array<{ activityId: string }>;
      expect(splitValues).toHaveLength(2);
      for (const split of splitValues) {
        expect(split.activityId).toBe('stored-activity-uuid');
      }
    });
  });

  describe('syncGarminHRV', () => {
    it('should sync HRV data successfully', async () => {
      jest.spyOn(tokenModule, 'getGarminToken').mockResolvedValue(mockToken);

      const mockHRVData = {
        userProfilePk: 12345,
        hrvSummary: {
          calendarDate: '2024-01-15',
          weeklyAvg: 60.5,
          lastNightAvg: 55.2,
          lastNight5MinHigh: 65.8,
          baseline: {
            lowUpper: 40.0,
            balancedLow: 35.0,
            balancedUpper: 45.0,
            markerValue: 38.5,
          },
          status: 'balanced',
          feedbackPhrase: 'Your HRV is balanced.',
          createTimeStamp: '2024-01-15 17:00:00',
        },
        hrvReadings: [],
        startTimestampGMT: '2024-01-15 00:00:00',
        endTimestampGMT: '2024-01-15 23:59:59',
        startTimestampLocal: '2024-01-15 00:00:00',
        endTimestampLocal: '2024-01-15 23:59:59',
        sleepStartTimestampGMT: '2024-01-15 23:00:00',
        sleepEndTimestampGMT: '2024-01-16 07:00:00',
        sleepStartTimestampLocal: '2024-01-15 23:00:00',
        sleepEndTimestampLocal: '2024-01-16 07:00:00',
      };

      jest.spyOn(hrvModule, 'fetchGarminHRV').mockResolvedValue(mockHRVData);

      const mockInsert = jest.fn<() => Promise<{ id: number }[]>>().mockResolvedValue([{ id: 1 }]);
      db.insert = jest.fn(() => ({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnThis(),
          returning: mockInsert,
        }),
      })) as unknown as typeof db.insert;

      const result = await syncGarminHRV();

      expect(result.fetched).toBe(2);
      expect(result.synced).toBe(2);
    });
  });

  describe('syncGarminSleep', () => {
    it('should sync sleep data successfully', async () => {
      jest.spyOn(tokenModule, 'getGarminToken').mockResolvedValue(mockToken);

      const mockSleepData = {
        id: 12345,
        userProfilePK: 67890,
        calendarDate: '2024-01-15',
        sleepTimeSeconds: 28800,
        napTimeSeconds: 0,
        sleepWindowConfirmed: true,
        unmeasurableSleepSeconds: 0,
        deepSleepSeconds: 7200,
        lightSleepSeconds: 14400,
        remSleepSeconds: 7200,
        awakeSleepSeconds: 0,
      };

      jest.spyOn(sleepModule, 'fetchGarminSleep').mockResolvedValue(mockSleepData);

      const mockInsert = jest.fn<() => Promise<unknown>>().mockResolvedValue({});
      db.insert = jest.fn(() => ({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            execute: mockInsert,
          }),
        }),
      })) as unknown as typeof db.insert;

      const result = await syncGarminSleep();

      expect(result.fetched).toBe(2);
      expect(result.synced).toBe(2);
    });
  });
});
