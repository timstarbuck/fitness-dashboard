import { getGarminToken } from './token';
import { fetchGarminActivities, fetchGarminActivityDetails, type ActivityDateRange } from './activities';
import { db } from '../../../db';
import { activities, activitySplits } from '../../../db/schema'

export interface SyncResult {
  fetched: number;
  synced: number;
}

export type SyncOptions = ActivityDateRange;

const RETRY_DELAY_DEFAULT = 60;

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

// Garmin returns dates as "YYYY-MM-DD HH:mm:ss" without a timezone designator.
// Parse as UTC so the stored wall-clock value is identical regardless of the
// server's timezone (the DB columns are timestamp without time zone).
function parseGarminDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value.trim().replace(' ', 'T') + 'Z');
  return Number.isNaN(date.getTime()) ? null : date;
}

// Helper function to extract retry delay from error message
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

// Helper function to wait for a specified time
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function syncGarminActivities(options: SyncOptions = {}): Promise<SyncResult> {
  const range = resolveDateRange(options);

  console.log(
    `Starting Garmin activities sync (startDate=${range.startDate}, endDate=${range.endDate})...`
  );

  let token: string;
  try {
    token = await getGarminToken();
  } catch (error) {
    const retryDelay = getRetryDelayFromError(error);
    if (retryDelay) {
      console.log(`Rate limit hit. Waiting ${retryDelay} seconds before retrying...`);
      //await delay(retryDelay * 1000);
      await delay(RETRY_DELAY_DEFAULT * 1000);
      token = await getGarminToken();
    } else {
      console.error(`Error occurred while getting Garmin token:`, error);
      throw error;
    }
  }
  
  let garminActivities;
  try {
    garminActivities = await fetchGarminActivities(token, range);
  } catch (error) {
    const retryDelay = getRetryDelayFromError(error);
    if (retryDelay) {
      console.log(`Rate limit hit while fetching activities. Waiting ${retryDelay} seconds before retrying...`);
      //await delay(retryDelay * 1000);
      await delay(RETRY_DELAY_DEFAULT * 1000);
      garminActivities = await fetchGarminActivities(token, range);
    } else {
      throw error;
    }
  }

  console.log(`Fetched ${garminActivities.length} activities from Garmin.`);

  let synced = 0;
  for (const activity of garminActivities) {
    try {
      const startTimeLocal = parseGarminDate(activity.startTimeLocal);
      const startTimeGmt = parseGarminDate(activity.startTimeGMT);
      const endTimeGmt = parseGarminDate(activity.endTimeGMT);

      if (!startTimeLocal || !startTimeGmt) {
        console.warn(`Skipping activity ${activity.activityId}: missing or invalid start date fields`);
        console.log(activity);
        continue;
      }

      // Compute endTimeGmt if missing by adding duration to startTimeGmt
      const computedEndTimeGmt = endTimeGmt 
        ? endTimeGmt
        : new Date(startTimeGmt.getTime() + (activity.duration * 1000));

      if (!computedEndTimeGmt) {
        console.warn(`Skipping activity ${activity.activityId}: could not determine end time`);
        console.log(activity);
        continue;
      }

      // Map Garmin data to our schema (shared between insert and upsert)
      const record = {
        activityName: activity.activityName || activity.activityType.typeKey,
        activityType: activity.activityType.typeKey,
        startTimeLocal,
        startTimeGmt,
        endTimeGmt: computedEndTimeGmt,
        distance: activity.distance,
        durationSeconds: Math.round(activity.duration),
        elevationGain: activity.elevationGain ?? null,
        elevationLoss: activity.elevationLoss ?? null,
        avgHeartRate: activity.averageHR ?? null,
        maxHeartRate: activity.maxHR ?? null,
        calories: activity.calories,
        avgSpeed: activity.averageSpeed ?? null,
        maxSpeed: activity.maxSpeed ?? null,
      };

      // Insert or update the activity
      await db.insert(activities)
        .values({
          garminActivityId: activity.activityId,
          ...record,
          ownerId: 'system', // Placeholder for actual user ID logic
          rawPayload: activity,
        })
        .onConflictDoUpdate({
          target: activities.garminActivityId,
          set: record,
        });

      // Fetch detailed activity data to get splits
      try {
        let detailedActivity;
        try {
          detailedActivity = await fetchGarminActivityDetails(token, activity.activityId);
        } catch (error) {
          const retryDelay = getRetryDelayFromError(error);
          if (retryDelay) {
            console.log(`Rate limit hit while fetching activity details. Waiting ${retryDelay} seconds before retrying...`);
            //await delay(retryDelay * 1000);
            await delay(RETRY_DELAY_DEFAULT * 1000);
            detailedActivity = await fetchGarminActivityDetails(token, activity.activityId);
          } else {
            console.warn(`Could not fetch detailed activity data for ${activity.activityId}:`, error);
            continue;
          }
        }
        
        if (detailedActivity.splits && detailedActivity.splits.length > 0) {
          // Insert splits for this activity
          const splitRecords = detailedActivity.splits.map((split, index) => ({
            activityId: activity.activityId.toString(),
            splitNumber: split.splitNumber || index + 1,
            distance: split.distance,
            durationSeconds: Math.round(split.duration),
            avgSpeed: split.avgSpeed ?? null,
          }));

          await db.insert(activitySplits)
            .values(splitRecords)
            .onConflictDoNothing();

          console.log(`Synced ${splitRecords.length} splits for activity ${activity.activityId}`);
        }
      } catch (error) {
        console.warn(`Could not fetch detailed activity data for ${activity.activityId}:`, error);
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