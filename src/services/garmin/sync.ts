import { getGarminToken } from './token';
import { fetchGarminActivities, fetchGarminActivityDetails, type ActivityDateRange } from './activities';
import { fetchGarminHRV, parseGarminDate, parseGarminDateOrUndefined, type GarminHRVResponse } from './hrv';
import { fetchGarminSleep, type GarminSleepResponse } from './sleep';
import { db } from '../../../db';
import { activities, activitySplits, hrvData, hrvReadings, sleepData } from '../../../db/schema'

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

export async function syncGarminSleep(options: SyncOptions = {}): Promise<SleepSyncResult> {
  const range = resolveDateRange(options);

  console.log(
    `Starting Garmin sleep sync (startDate=${range.startDate}, endDate=${range.endDate})...`
  );

  let token: string;
  try {
    token = await getGarminToken();
  } catch (error) {
    const retryDelay = getRetryDelayFromError(error);
    if (retryDelay) {
      console.log(`Rate limit hit. Waiting ${retryDelay} seconds before retrying...`);
      await delay(RETRY_DELAY_DEFAULT * 1000);
      token = await getGarminToken();
    } else {
      console.error(`Error occurred while getting Garmin token:`, error);
      throw error;
    }
  }

  let synced = 0;
  let fetched = 0;

  // Sync sleep data for each day in the range
  let currentDate = new Date(range.startDate as string);
  const endDate = new Date(range.endDate as string);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().slice(0, 10); // YYYY-MM-DD
    
    try {
      let sleepDataResponse: GarminSleepResponse;
      try {
        sleepDataResponse = await fetchGarminSleep(token, dateStr);
      } catch (error) {
        const retryDelay = getRetryDelayFromError(error);
        if (retryDelay) {
          console.log(`Rate limit hit while fetching sleep data. Waiting ${retryDelay} seconds before retrying...`);
          await delay(RETRY_DELAY_DEFAULT * 1000);
          sleepDataResponse = await fetchGarminSleep(token, dateStr);
        } else {
          // Sleep data might not be available for all days, skip if not found
          // or if the response is empty/invalid
          if (error instanceof Error && 
              (error.message.includes('404') || 
               error.message.includes('Empty response') ||
               error.message.includes('Invalid JSON'))) {
            console.log(`No sleep data available for ${dateStr}: ${error.message}`);
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            continue;
          }
          throw error;
        }
      }

      fetched++;

      // Parse timestamps from the response
      const sleepStartTimestampGMT = parseGarminDateOrUndefined(sleepDataResponse.sleepStartTimestampGMT);
      const sleepEndTimestampGMT = parseGarminDateOrUndefined(sleepDataResponse.sleepEndTimestampGMT);
      const sleepStartTimestampLocal = parseGarminDateOrUndefined(sleepDataResponse.sleepStartTimestampLocal);
      const sleepEndTimestampLocal = parseGarminDateOrUndefined(sleepDataResponse.sleepEndTimestampLocal);
      const autoSleepStartTimestampGMT = parseGarminDateOrUndefined(sleepDataResponse.autoSleepStartTimestampGMT);
      const autoSleepEndTimestampGMT = parseGarminDateOrUndefined(sleepDataResponse.autoSleepEndTimestampGMT);

      // Insert or update sleep data
      // Use the requested date if calendarDate is null in the response
      const calendarDate = sleepDataResponse.calendarDate || dateStr;
      
      // Skip if calendarDate is still null (shouldn't happen with the fallback)
      if (!calendarDate) {
        console.log(`Skipping sleep data for ${dateStr}: no calendar date available`);
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        continue;
      }
      
      await db
        .insert(sleepData)
        .values({
          calendarDate: calendarDate,
          sleepTimeSeconds: sleepDataResponse.sleepTimeSeconds,
          napTimeSeconds: sleepDataResponse.napTimeSeconds,
          sleepWindowConfirmed: sleepDataResponse.sleepWindowConfirmed,
          sleepWindowConfirmationType: sleepDataResponse.sleepWindowConfirmationType,
          sleepStartTimestampGMT: sleepStartTimestampGMT,
          sleepEndTimestampGMT: sleepEndTimestampGMT,
          sleepStartTimestampLocal: sleepStartTimestampLocal,
          sleepEndTimestampLocal: sleepEndTimestampLocal,
          autoSleepStartTimestampGMT: autoSleepStartTimestampGMT,
          autoSleepEndTimestampGMT: autoSleepEndTimestampGMT,
          sleepQualityTypePK: sleepDataResponse.sleepQualityTypePK,
          sleepResultTypePK: sleepDataResponse.sleepResultTypePK,
          unmeasurableSleepSeconds: sleepDataResponse.unmeasurableSleepSeconds,
          deepSleepSeconds: sleepDataResponse.deepSleepSeconds,
          lightSleepSeconds: sleepDataResponse.lightSleepSeconds,
          remSleepSeconds: sleepDataResponse.remSleepSeconds,
          awakeSleepSeconds: sleepDataResponse.awakeSleepSeconds,
          deviceRemCapable: sleepDataResponse.deviceRemCapable,
          sleepFromDevice: sleepDataResponse.sleepFromDevice,
          averageSpO2Value: sleepDataResponse.averageSpO2Value,
          lowestSpO2Value: sleepDataResponse.lowestSpO2Value,
          highestSpO2Value: sleepDataResponse.highestSpO2Value,
          numberOfEventsBelowThreshold: sleepDataResponse.numberOfEventsBelowThreshold,
          averageSpO2HRSleep: sleepDataResponse.averageSpO2HRSleep,
          spo2Threshold: sleepDataResponse.spo2Threshold,
          averageRespirationValue: sleepDataResponse.averageRespirationValue,
          lowestRespirationValue: sleepDataResponse.lowestRespirationValue,
          highestRespirationValue: sleepDataResponse.highestRespirationValue,
          awakeCount: sleepDataResponse.awakeCount,
          avgSleepStress: sleepDataResponse.avgSleepStress,
          ageGroup: sleepDataResponse.ageGroup,
          avgHeartRate: sleepDataResponse.avgHeartRate,
          sleepScoreFeedback: sleepDataResponse.sleepScoreFeedback,
          sleepScoreInsight: sleepDataResponse.sleepScoreInsight,
          sleepScorePersonalizedInsight: sleepDataResponse.sleepScorePersonalizedInsight,
          userNote: sleepDataResponse.userNote,
          kidSleepNote: sleepDataResponse.kidSleepNote,
          sleepVersion: sleepDataResponse.sleepVersion,
          breathingDisruptionSeverity: sleepDataResponse.breathingDisruptionSeverity,
          ownerId: 'system', // Placeholder for actual user ID logic
          rawPayload: sleepDataResponse,
        })
        .onConflictDoUpdate({
          target: sleepData.calendarDate,
          set: {
            calendarDate: calendarDate,
            sleepTimeSeconds: sleepDataResponse.sleepTimeSeconds,
            napTimeSeconds: sleepDataResponse.napTimeSeconds,
            sleepWindowConfirmed: sleepDataResponse.sleepWindowConfirmed,
            sleepWindowConfirmationType: sleepDataResponse.sleepWindowConfirmationType,
            sleepStartTimestampGMT: sleepStartTimestampGMT,
            sleepEndTimestampGMT: sleepEndTimestampGMT,
            sleepStartTimestampLocal: sleepStartTimestampLocal,
            sleepEndTimestampLocal: sleepEndTimestampLocal,
            autoSleepStartTimestampGMT: autoSleepStartTimestampGMT,
            autoSleepEndTimestampGMT: autoSleepEndTimestampGMT,
            sleepQualityTypePK: sleepDataResponse.sleepQualityTypePK,
            sleepResultTypePK: sleepDataResponse.sleepResultTypePK,
            unmeasurableSleepSeconds: sleepDataResponse.unmeasurableSleepSeconds,
            deepSleepSeconds: sleepDataResponse.deepSleepSeconds,
            lightSleepSeconds: sleepDataResponse.lightSleepSeconds,
            remSleepSeconds: sleepDataResponse.remSleepSeconds,
            awakeSleepSeconds: sleepDataResponse.awakeSleepSeconds,
            deviceRemCapable: sleepDataResponse.deviceRemCapable,
            sleepFromDevice: sleepDataResponse.sleepFromDevice,
            averageSpO2Value: sleepDataResponse.averageSpO2Value,
            lowestSpO2Value: sleepDataResponse.lowestSpO2Value,
            highestSpO2Value: sleepDataResponse.highestSpO2Value,
            numberOfEventsBelowThreshold: sleepDataResponse.numberOfEventsBelowThreshold,
            averageSpO2HRSleep: sleepDataResponse.averageSpO2HRSleep,
            spo2Threshold: sleepDataResponse.spo2Threshold,
            averageRespirationValue: sleepDataResponse.averageRespirationValue,
            lowestRespirationValue: sleepDataResponse.lowestRespirationValue,
            highestRespirationValue: sleepDataResponse.highestRespirationValue,
            awakeCount: sleepDataResponse.awakeCount,
            avgSleepStress: sleepDataResponse.avgSleepStress,
            ageGroup: sleepDataResponse.ageGroup,
            avgHeartRate: sleepDataResponse.avgHeartRate,
            sleepScoreFeedback: sleepDataResponse.sleepScoreFeedback,
            sleepScoreInsight: sleepDataResponse.sleepScoreInsight,
            sleepScorePersonalizedInsight: sleepDataResponse.sleepScorePersonalizedInsight,
            userNote: sleepDataResponse.userNote,
            kidSleepNote: sleepDataResponse.kidSleepNote,
            sleepVersion: sleepDataResponse.sleepVersion,
            breathingDisruptionSeverity: sleepDataResponse.breathingDisruptionSeverity,
            ownerId: 'system',
            rawPayload: sleepDataResponse,
          },
        });

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

export async function syncGarminHRV(options: SyncOptions = {}): Promise<HRVSyncResult> {
  const range = resolveDateRange(options);

  console.log(
    `Starting Garmin HRV sync (startDate=${range.startDate}, endDate=${range.endDate})...`
  );

  let token: string;
  try {
    token = await getGarminToken();
  } catch (error) {
    const retryDelay = getRetryDelayFromError(error);
    if (retryDelay) {
      console.log(`Rate limit hit. Waiting ${retryDelay} seconds before retrying...`);
      await delay(RETRY_DELAY_DEFAULT * 1000);
      token = await getGarminToken();
    } else {
      console.error(`Error occurred while getting Garmin token:`, error);
      throw error;
    }
  }

  let synced = 0;
  let fetched = 0;

  // Sync HRV data for each day in the range
  let currentDate = new Date(range.startDate as string);
  const endDate = new Date(range.endDate as string);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().slice(0, 10); // YYYY-MM-DD
    
    try {
      let hrvDataResponse: GarminHRVResponse;
      try {
        hrvDataResponse = await fetchGarminHRV(token, dateStr);
      } catch (error) {
        const retryDelay = getRetryDelayFromError(error);
        if (retryDelay) {
          console.log(`Rate limit hit while fetching HRV data. Waiting ${retryDelay} seconds before retrying...`);
          await delay(RETRY_DELAY_DEFAULT * 1000);
          hrvDataResponse = await fetchGarminHRV(token, dateStr);
        } else {
          // HRV data might not be available for all days, skip if not found
          // or if the response is empty/invalid
          if (error instanceof Error && 
              (error.message.includes('404') || 
               error.message.includes('Empty response') ||
               error.message.includes('Invalid JSON'))) {
            console.log(`No HRV data available for ${dateStr}: ${error.message}`);
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            continue;
          }
          throw error;
        }
      }

      fetched++;

      // Parse timestamps from the response
      const createTimestamp = parseGarminDateOrUndefined(hrvDataResponse.hrvSummary.createTimeStamp);
      const startTimestampGMT = parseGarminDateOrUndefined(hrvDataResponse.startTimestampGMT);
      const endTimestampGMT = parseGarminDateOrUndefined(hrvDataResponse.endTimestampGMT);
      const startTimestampLocal = parseGarminDateOrUndefined(hrvDataResponse.startTimestampLocal);
      const endTimestampLocal = parseGarminDateOrUndefined(hrvDataResponse.endTimestampLocal);
      const sleepStartTimestampGMT = parseGarminDateOrUndefined(hrvDataResponse.sleepStartTimestampGMT);
      const sleepEndTimestampGMT = parseGarminDateOrUndefined(hrvDataResponse.sleepEndTimestampGMT);
      const sleepStartTimestampLocal = parseGarminDateOrUndefined(hrvDataResponse.sleepStartTimestampLocal);
      const sleepEndTimestampLocal = parseGarminDateOrUndefined(hrvDataResponse.sleepEndTimestampLocal);

      // Ensure timestamps are defined before using them
      const createTimeStampValue = createTimestamp || new Date();
      const startTimestampGMTValue = startTimestampGMT || new Date();
      const endTimestampGMTValue = endTimestampGMT || new Date();
      const startTimestampLocalValue = startTimestampLocal || new Date();
      const endTimestampLocalValue = endTimestampLocal || new Date();
      const sleepStartTimestampGMTValue = sleepStartTimestampGMT || new Date();
      const sleepEndTimestampGMTValue = sleepEndTimestampGMT || new Date();
      const sleepStartTimestampLocalValue = sleepStartTimestampLocal || new Date();
      const sleepEndTimestampLocalValue = sleepEndTimestampLocal || new Date();

      // Insert or update HRV data
      const [hrvRecord] = await db
        .insert(hrvData)
        .values({
          calendarDate: hrvDataResponse.hrvSummary.calendarDate,
          weeklyAvg: hrvDataResponse.hrvSummary.weeklyAvg,
          lastNightAvg: hrvDataResponse.hrvSummary.lastNightAvg,
          lastNight5MinHigh: hrvDataResponse.hrvSummary.lastNight5MinHigh,
          baselineLowUpper: hrvDataResponse.hrvSummary.baseline.lowUpper,
          baselineBalancedLow: hrvDataResponse.hrvSummary.baseline.balancedLow,
          baselineBalancedUpper: hrvDataResponse.hrvSummary.baseline.balancedUpper,
          baselineMarkerValue: hrvDataResponse.hrvSummary.baseline.markerValue,
          status: hrvDataResponse.hrvSummary.status,
          feedbackPhrase: hrvDataResponse.hrvSummary.feedbackPhrase,
          createTimeStamp: createTimeStampValue,
          startTimestampGMT: startTimestampGMTValue,
          endTimestampGMT: endTimestampGMTValue,
          startTimestampLocal: startTimestampLocalValue,
          endTimestampLocal: endTimestampLocalValue,
          sleepStartTimestampGMT: sleepStartTimestampGMTValue,
          sleepEndTimestampGMT: sleepEndTimestampGMTValue,
          sleepStartTimestampLocal: sleepStartTimestampLocalValue,
          sleepEndTimestampLocal: sleepEndTimestampLocalValue,
          ownerId: 'system', // Placeholder for actual user ID logic
          rawPayload: hrvDataResponse,
        })
        .onConflictDoUpdate({
          target: hrvData.calendarDate,
          set: {
            weeklyAvg: hrvDataResponse.hrvSummary.weeklyAvg,
            lastNightAvg: hrvDataResponse.hrvSummary.lastNightAvg,
            lastNight5MinHigh: hrvDataResponse.hrvSummary.lastNight5MinHigh,
            baselineLowUpper: hrvDataResponse.hrvSummary.baseline.lowUpper,
            baselineBalancedLow: hrvDataResponse.hrvSummary.baseline.balancedLow,
            baselineBalancedUpper: hrvDataResponse.hrvSummary.baseline.balancedUpper,
            baselineMarkerValue: hrvDataResponse.hrvSummary.baseline.markerValue,
            status: hrvDataResponse.hrvSummary.status,
            feedbackPhrase: hrvDataResponse.hrvSummary.feedbackPhrase,
            createTimeStamp: createTimeStampValue,
            startTimestampGMT: startTimestampGMTValue,
            endTimestampGMT: endTimestampGMTValue,
            startTimestampLocal: startTimestampLocalValue,
            endTimestampLocal: endTimestampLocalValue,
            sleepStartTimestampGMT: sleepStartTimestampGMTValue,
            sleepEndTimestampGMT: sleepEndTimestampGMTValue,
            sleepStartTimestampLocal: sleepStartTimestampLocalValue,
            sleepEndTimestampLocal: sleepEndTimestampLocalValue,
            rawPayload: hrvDataResponse,
          },
        })
        .returning();

      // Insert HRV readings for this day
      if (hrvDataResponse.hrvReadings && hrvDataResponse.hrvReadings.length > 0) {
        const readingRecords = hrvDataResponse.hrvReadings.map((reading) => ({
          hrvDataId: hrvRecord.id,
          hrvValue: reading.hrvValue,
          readingTimeGMT: parseGarminDateOrUndefined(reading.readingTimeGMT) || new Date(),
          readingTimeLocal: parseGarminDateOrUndefined(reading.readingTimeLocal) || new Date(),
        }));

        await db.insert(hrvReadings).values(readingRecords).onConflictDoNothing();

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