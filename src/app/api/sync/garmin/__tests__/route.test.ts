import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

// Mock the database module before importing anything else
jest.mock('../../../../../services/garmin/syncLock', () => ({
  acquireSyncLock: jest.fn(),
  releaseSyncLock: jest.fn(),
}));

jest.mock('../../../../../services/garmin/sync', () => ({
  // Keep the real resolveSyncTypes/SYNC_TYPES so the route's type-selection
  // logic is exercised; only mock the sync functions themselves.
  ...jest.requireActual<typeof import('../../../../../services/garmin/sync')>(
    '../../../../../services/garmin/sync'
  ),
  syncGarminActivities: jest.fn(),
  syncGarminHRV: jest.fn(),
  syncGarminSleep: jest.fn(),
  syncGarminUserDailySummary: jest.fn(),
}));

// Import mocked modules after mocking them
const syncLock = require('../../../../../services/garmin/syncLock');
const sync = require('../../../../../services/garmin/sync');

describe('Garmin Sync API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
  });

  describe('GET and POST handlers', () => {
    it('should return 401 when no authorization is provided', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/sync/garmin'));
      
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should return 503 when CRON_SECRET is not configured', async () => {
      delete process.env.CRON_SECRET;
      const request = new NextRequest(new URL('http://localhost:3000/api/sync/garmin'));
      
      const response = await GET(request);
      expect(response.status).toBe(503);
    });

    it('should return 401 when incorrect secret is provided', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/sync/garmin?token=wrong-secret'));
      
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should return 409 when sync lock cannot be acquired', async () => {
      jest.spyOn(syncLock, 'acquireSyncLock').mockResolvedValue(null);
      
      const request = new NextRequest(new URL('http://localhost:3000/api/sync/garmin?token=test-secret'));
      
      const response = await GET(request);
      expect(response.status).toBe(409);
    });

    it('should successfully sync when all conditions are met', async () => {
      jest.spyOn(syncLock, 'acquireSyncLock').mockResolvedValue('test-lock-token');
      jest.spyOn(syncLock, 'releaseSyncLock').mockResolvedValue(undefined);
      
      jest.spyOn(sync, 'syncGarminActivities').mockResolvedValue({
        fetched: 2,
        synced: 2,
      });

      const request = new NextRequest(new URL('http://localhost:3000/api/sync/garmin?token=test-secret'));
      
      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it('should handle date range parameters', async () => {
      jest.spyOn(syncLock, 'acquireSyncLock').mockResolvedValue('test-lock-token');
      jest.spyOn(syncLock, 'releaseSyncLock').mockResolvedValue(undefined);
      
      jest.spyOn(sync, 'syncGarminActivities').mockResolvedValue({
        fetched: 1,
        synced: 1,
      });

      const request = new NextRequest(new URL('http://localhost:3000/api/sync/garmin?token=test-secret&startDate=2024-01-01&endDate=2024-01-31'));
      
      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it('should handle HRV and sleep sync options', async () => {
      jest.spyOn(syncLock, 'acquireSyncLock').mockResolvedValue('test-lock-token');
      jest.spyOn(syncLock, 'releaseSyncLock').mockResolvedValue(undefined);

      jest.spyOn(sync, 'syncGarminHRV').mockResolvedValue({
        fetched: 1,
        synced: 1,
      });

      jest.spyOn(sync, 'syncGarminSleep').mockResolvedValue({
        fetched: 1,
        synced: 1,
      });

      const request = new NextRequest(new URL('http://localhost:3000/api/sync/garmin?token=test-secret&syncHRV=true&syncSleep=true'));

      const response = await GET(request);
      expect(response.status).toBe(200);

      // Legacy booleans keep their previous behavior: only the flagged types run.
      expect(sync.syncGarminActivities).not.toHaveBeenCalled();
      expect(sync.syncGarminHRV).toHaveBeenCalled();
      expect(sync.syncGarminSleep).toHaveBeenCalled();
    });

    it('should sync all types by default when no type params are given', async () => {
      jest.spyOn(syncLock, 'acquireSyncLock').mockResolvedValue('test-lock-token');
      jest.spyOn(syncLock, 'releaseSyncLock').mockResolvedValue(undefined);

      const request = new NextRequest(new URL('http://localhost:3000/api/sync/garmin?token=test-secret'));

      const response = await GET(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.results.map((r: { type: string }) => r.type)).toEqual(
        expect.arrayContaining(['activities', 'hrv', 'sleep', 'usersummary'])
      );
    });

    it('should sync only the requested type when syncType is given', async () => {
      jest.spyOn(syncLock, 'acquireSyncLock').mockResolvedValue('test-lock-token');
      jest.spyOn(syncLock, 'releaseSyncLock').mockResolvedValue(undefined);

      jest.spyOn(sync, 'syncGarminUserDailySummary').mockResolvedValue({
        fetched: 1,
        synced: 1,
      });

      const request = new NextRequest(new URL('http://localhost:3000/api/sync/garmin?token=test-secret&syncType=usersummary'));

      const response = await GET(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.results).toHaveLength(1);
      expect(body.results[0].type).toBe('usersummary');

      expect(sync.syncGarminActivities).not.toHaveBeenCalled();
      expect(sync.syncGarminHRV).not.toHaveBeenCalled();
      expect(sync.syncGarminSleep).not.toHaveBeenCalled();
      expect(sync.syncGarminUserDailySummary).toHaveBeenCalled();
    });

    it('should return 400 for an invalid syncType', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/sync/garmin?token=test-secret&syncType=bogus'));

      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid date format', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/sync/garmin?token=test-secret&startDate=invalid-date'));
      
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it('should return 400 when startDate is after endDate', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/sync/garmin?token=test-secret&startDate=2024-12-31&endDate=2024-01-01'));
      
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it('should handle POST requests the same as GET', async () => {
      jest.spyOn(syncLock, 'acquireSyncLock').mockResolvedValue('test-lock-token');
      jest.spyOn(syncLock, 'releaseSyncLock').mockResolvedValue(undefined);
      
      jest.spyOn(sync, 'syncGarminActivities').mockResolvedValue({
        fetched: 1,
        synced: 1,
      });

      const request = new NextRequest(new URL('http://localhost:3000/api/sync/garmin?token=test-secret'));
      
      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });
});
