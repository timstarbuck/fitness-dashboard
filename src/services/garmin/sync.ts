import { GarminClient, garminClient } from './client';
import type { ActivityDateRange } from './activities';
import type { GarminHRVResponse } from './hrv';
import type { GarminSleepResponse } from './sleep';
import { toActivityRecord, toSplitRecords, toHrvRecord, toHrvReadingRecords, toSleepRecord } from './dto';
import { ActivityRepository, activityRepository } from '../../repositories/activity-repository';
import { WellnessRepository, wellnessRepository } from '../../repositories/wellness-repository';

// Re-exported for backward compatibility; the canonical implementations live in ./client.
export { getRetryDelayFromError, delay } from './client';

export interface SyncResult {
  fetched: number;
  synced: number;
}

export interface HRVSyncResult {
  fetched: number;
  synced: number;
}

export interface SleepSyncResult {
  fetched: number;
  synced: number;
}

export type SyncOptions = ActivityDateRange & {
  syncHRV?: boolean;
  syncSleep?: boolean;
};

// Calendar date (YYYY-MM-DD) of the given instant in the user's timezone.
// Vercel functions run on UTC, so without an explicit TIMEZONE the "current
// day" would be wrong for the user during part of every day. `en-CA`
// formats dates as YYYY-MM-DD. Pass undefined to use the system timezone.
function calendarDateInTimezone(now: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

// Calendar arithmetic on a YYYY-MM-DD string (DST-safe: no instants involved).
function previousCalendarDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Defaults: previous day through current day (both inclusive), in the user's
// timezone, so an hourly cron picks up yesterday's completed activities plus
// today's in-progress ones.
function resolveDateRange(options: SyncOptions): ActivityDateRange {
  const timeZone = process.env.TIMEZONE || undefined;
  const today = calendarDateInTimezone(new Date(), timeZone);
  return {
    startDate: options.startDate ?? previousCalendarDate(today),
    endDate: options.endDate ?? today,
  };
}

/**
 * Coordinates the Garmin sync workflow: fetches data through the GarminClient,
 * maps raw API responses to internal records (DTOs), and persists them through
 * the repositories. No HTTP or SQL happens directly in this class.
 */
class SyncOrchestrator {
  constructor(
    private readonly client: GarminClient = garminClient,
    private readonly activities: ActivityRepository = activityRepository,
    private readonly wellness: WellnessRepository = wellnessRepository,
  ) {}

  /** True when the error indicates Garmin has no data for this day (not a transient failure). */
  private isDataNotFoundError(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error.message.includes('404') ||
        error.message.includes('Empty response') ||
        error.message.includes('Invalid JSON'))
    );
  }

  async syncActivities(options: SyncOptions = {}): Promise<SyncResult> {
    const range = resolveDateRange(options);

    console.log(
      `Starting Garmin activities sync (startDate=${range.startDate}, endDate=${range.endDate})...`
    );

    const token = await this.client.getToken();

    let garminActivities;
    try {
      garminActivities = await this.client.fetchActivities(token, range);
    } catch (error) {
      // The client already retried rate limits; anything else is fatal for this sync.
      throw error;
    }

    console.log(`Fetched ${garminActivities.length} activities from Garmin.`);

    let synced = 0;
    for (const activity of garminActivities) {
      try {
        const record = toActivityRecord(activity);

        if (!record) {
          console.warn(`Skipping activity ${activity.activityId}: missing or invalid start date fields`);
          console.log(activity);
          continue;
        }

        // Insert or update the activity. The stored row's uuid is needed to key
        // the split inserts (activity_splits.activity_id references activities.id).
        const stored = await this.activities.upsertActivity(record, activity);

        // Fetch detailed activity data to get splits
        try {
          const detailedActivity = await this.client.fetchActivityDetails(token, activity.activityId);

          if (detailedActivity.splits && detailedActivity.splits.length > 0) {
            const splitRecords = toSplitRecords(stored.id, detailedActivity.splits);

            await this.activities.insertSplits(splitRecords);

            console.log(`Synced ${splitRecords.length} splits for activity ${activity.activityId}`);
          }
        } catch (error) {
          console.warn(`Could not fetch detailed activity data for ${activity.activityId}:`, error);
          continue; // don't count as synced when the details fetch failed
        }

        synced++;
        console.log(`Synced activity ${activity.activityId}`);
      } catch (err) {
        console.error(`Failed to sync activity ${activity.activityId}:`, err);
      }
    }

    console.log('Garmin activities sync completed.');
    return { fetched: garminActivities.length, synced };
  }

  async syncHrv(options: SyncOptions = {}): Promise<HRVSyncResult> {
    const range = resolveDateRange(options);

    console.log(
      `Starting Garmin HRV sync (startDate=${range.startDate}, endDate=${range.endDate})...`
    );

    const token = await this.client.getToken();

    let synced = 0;
    let fetched = 0;

    // Sync HRV data for each day in the range
    const currentDate = new Date(range.startDate as string);
    const endDate = new Date(range.endDate as string);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().slice(0, 10); // YYYY-MM-DD

      try {
        let hrvDataResponse: GarminHRVResponse;
        try {
          hrvDataResponse = await this.client.fetchHrv(token, dateStr);
        } catch (error) {
          // HRV data might not be available for all days, skip if not found
          // or if the response is empty/invalid
          if (this.isDataNotFoundError(error)) {
            console.log(`No HRV data available for ${dateStr}: ${(error as Error).message}`);
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            continue;
          }
          throw error;
        }

        fetched++;

        // Map the raw API response to our internal record, then persist it
        const hrvRecord = toHrvRecord(hrvDataResponse);
        const stored = await this.wellness.upsertHrv(hrvRecord, hrvDataResponse);

        // Insert HRV readings for this day (keyed by the stored row's uuid)
        const readingRecords = toHrvReadingRecords(stored.id, hrvDataResponse.hrvReadings);
        await this.wellness.insertHrvReadings(readingRecords);

        if (readingRecords.length > 0) {
          console.log(`Synced ${readingRecords.length} HRV readings for ${dateStr}`);
        }

        synced++;
        console.log(`Synced HRV data for ${dateStr}`);
      } catch (err) {
        console.error(`Failed to sync HRV data for ${dateStr}:`, err);
      }

      // Move to the next day
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    console.log('Garmin HRV sync completed.');
    return { fetched, synced };
  }

  async syncSleep(options: SyncOptions = {}): Promise<SleepSyncResult> {
    const range = resolveDateRange(options);

    console.log(
      `Starting Garmin sleep sync (startDate=${range.startDate}, endDate=${range.endDate})...`
    );

    const token = await this.client.getToken();

    let synced = 0;
    let fetched = 0;

    // Sync sleep data for each day in the range
    const currentDate = new Date(range.startDate as string);
    const endDate = new Date(range.endDate as string);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().slice(0, 10); // YYYY-MM-DD

      try {
        let sleepDataResponse: GarminSleepResponse;
        try {
          sleepDataResponse = await this.client.fetchSleep(token, dateStr);
        } catch (error) {
          // Sleep data might not be available for all days, skip if not found
          // or if the response is empty/invalid
          if (this.isDataNotFoundError(error)) {
            console.log(`No sleep data available for ${dateStr}: ${(error as Error).message}`);
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            continue;
          }
          throw error;
        }

        fetched++;

        // Map the raw API response to our internal record (falls back to the
        // requested date when the response has no calendarDate)
        const sleepRecord = toSleepRecord(sleepDataResponse, dateStr);

        // Skip if calendarDate is still null (shouldn't happen with the fallback)
        if (!sleepRecord) {
          console.log(`Skipping sleep data for ${dateStr}: no calendar date available`);
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
          continue;
        }

        await this.wellness.upsertSleep(sleepRecord, sleepDataResponse);

        synced++;
        console.log(`Synced sleep data for ${dateStr}`);
      } catch (err) {
        console.error(`Failed to sync sleep data for ${dateStr}:`, err);
      }

      // Move to the next day
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    console.log('Garmin sleep sync completed.');
    return { fetched, synced };
  }
}

/** Shared orchestrator instance (stateless; safe to reuse across sync runs). */
const syncOrchestrator = new SyncOrchestrator();

export async function syncGarminActivities(options: SyncOptions = {}): Promise<SyncResult> {
  return syncOrchestrator.syncActivities(options);
}

export async function syncGarminHRV(options: SyncOptions = {}): Promise<HRVSyncResult> {
  return syncOrchestrator.syncHrv(options);
}

export async function syncGarminSleep(options: SyncOptions = {}): Promise<SleepSyncResult> {
  return syncOrchestrator.syncSleep(options);
}
