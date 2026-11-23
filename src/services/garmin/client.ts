import { getGarminToken } from './token';
import { fetchGarminActivities, fetchGarminActivityDetails, type ActivityDateRange, type GarminActivity } from './activities';
import { fetchGarminHRV, type GarminHRVResponse } from './hrv';
import { fetchGarminSleep, type GarminSleepResponse } from './sleep';
import { fetchGarminUserDailySummary, type GarminUserDailySummaryResponse } from './usersummary';

/** Default retry delay in seconds when no specific Retry-After value is present. */
const RETRY_DELAY_DEFAULT = 60;

/**
 * Extract the retry delay (in seconds) from a rate-limit error.
 * Returns null if the error carries no retry information.
 */
export function getRetryDelayFromError(error: unknown): number | null {
  if (error instanceof Error) {
    const match = error.message.match(/Retry in (\d+) seconds/);
    if (match) {
      return parseInt(match[1], 10);
    } else if (error.message.includes('429')) {
      return RETRY_DELAY_DEFAULT;
    }
  }
  return null;
}

/** Sleep for the given number of milliseconds. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Low-level Garmin Connect API client.
 *
 * Wraps the raw HTTP fetch functions (token, activities, HRV, sleep, user
 * daily summary) with rate-limit retry handling. No database access happens
 * here — persistence is the SyncOrchestrator's job (see sync.ts).
 */
export class GarminClient {
  /**
   * Get a valid Garmin token, retrying once after the requested delay if the
   * request hits a rate limit. Non-rate-limit errors are rethrown.
   */
  async getToken(): Promise<string> {
    try {
      return await getGarminToken();
    } catch (error) {
      const retryDelay = getRetryDelayFromError(error);
      if (!retryDelay) {
        console.error(`Error occurred while getting Garmin token:`, error);
        throw error;
      }

      console.log(`Rate limit hit. Waiting ${retryDelay} seconds before retrying...`);
      await delay(retryDelay * 1000);

      return getGarminToken();
    }
  }

  /** Fetch activities for a date range, retrying once on rate limit. */
  async fetchActivities(
    token: string,
    range?: ActivityDateRange,
  ): Promise<GarminActivity[]> {
    try {
      return await fetchGarminActivities(token, range);
    } catch (error) {
      const retryDelay = getRetryDelayFromError(error);
      if (!retryDelay) {
        throw error;
      }

      console.log(`Rate limit hit while fetching activities. Waiting ${retryDelay} seconds before retrying...`);
      await delay(RETRY_DELAY_DEFAULT * 1000);

      return fetchGarminActivities(token, range);
    }
  }

  /** Fetch full details (including splits) for a single activity, retrying once on rate limit. */
  async fetchActivityDetails(
    token: string,
    activityId: number,
  ): Promise<GarminActivity> {
    try {
      return await fetchGarminActivityDetails(token, activityId);
    } catch (error) {
      const retryDelay = getRetryDelayFromError(error);
      if (!retryDelay) {
        throw error;
      }

      console.log(`Rate limit hit while fetching activity details. Waiting ${retryDelay} seconds before retrying...`);
      await delay(RETRY_DELAY_DEFAULT * 1000);

      return fetchGarminActivityDetails(token, activityId);
    }
  }

  /** Fetch HRV data for a single calendar date (YYYY-MM-DD), retrying once on rate limit. */
  async fetchHrv(token: string, date: string): Promise<GarminHRVResponse> {
    try {
      return await fetchGarminHRV(token, date);
    } catch (error) {
      const retryDelay = getRetryDelayFromError(error);
      if (!retryDelay) {
        throw error;
      }

      console.log(`Rate limit hit while fetching HRV data. Waiting ${retryDelay} seconds before retrying...`);
      await delay(RETRY_DELAY_DEFAULT * 1000);

      return fetchGarminHRV(token, date);
    }
  }

  /** Fetch sleep data for a single calendar date (YYYY-MM-DD), retrying once on rate limit. */
  async fetchSleep(token: string, date: string): Promise<GarminSleepResponse> {
    try {
      return await fetchGarminSleep(token, date);
    } catch (error) {
      const retryDelay = getRetryDelayFromError(error);
      if (!retryDelay) {
        throw error;
      }

      console.log(`Rate limit hit while fetching sleep data. Waiting ${retryDelay} seconds before retrying...`);
      await delay(RETRY_DELAY_DEFAULT * 1000);

      return fetchGarminSleep(token, date);
    }
  }

  /** Fetch the user daily summary for a single calendar date (YYYY-MM-DD), retrying once on rate limit. */
  async fetchUserDailySummary(token: string, date: string): Promise<GarminUserDailySummaryResponse> {
    try {
      return await fetchGarminUserDailySummary(token, date);
    } catch (error) {
      const retryDelay = getRetryDelayFromError(error);
      if (!retryDelay) {
        throw error;
      }

      console.log(`Rate limit hit while fetching user daily summary. Waiting ${retryDelay} seconds before retrying...`);
      await delay(RETRY_DELAY_DEFAULT * 1000);

      return fetchGarminUserDailySummary(token, date);
    }
  }
}

/** Shared Garmin API client instance. */
export const garminClient = new GarminClient();
