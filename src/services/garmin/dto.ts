import type { GarminActivity, GarminSplit } from './activities';
import type { GarminHRVReading, GarminHRVResponse } from './hrv';
import type { GarminSleepResponse } from './sleep';
import type { GarminUserDailySummaryResponse } from './usersummary';
import { parseGarminDate, parseGarminDateOrUndefined } from './dates';

// ---------------------------------------------------------------------------
// Data Transfer Objects (internal domain models)
//
// Raw Garmin API responses are mapped to these shapes immediately upon receipt,
// so API-specific structures (field names, rawPayload) never leak past this
// boundary into the repositories or the rest of the app. The raw response is
// still persisted as `rawPayload` by the repositories, but only as an audit
// trail at the persistence edge.
// ---------------------------------------------------------------------------

/** An activity as stored in `activities` (minus id/ownerId/rawPayload). */
export interface ActivityRecord {
  garminActivityId: number;
  activityName: string;
  activityType: string;
  startTimeLocal: Date;
  startTimeGmt: Date;
  endTimeGmt: Date;
  distance: number;
  durationSeconds: number;
  elevationGain: number | null;
  elevationLoss: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  calories: number | null;
  avgSpeed: number | null;
  maxSpeed: number | null;
}

/** A split as stored in `activity_splits` (keyed by our activities.id uuid). */
export interface SplitRecord {
  activityId: string;
  splitNumber: number;
  distance: number;
  durationSeconds: number;
  avgSpeed: number | null;
}

/** A night of sleep as stored in `sleep_data` (minus id/ownerId/rawPayload). */
export interface SleepRecord {
  calendarDate: string; // YYYY-MM-DD (Garmin local date)
  sleepTimeSeconds: number | null;
  napTimeSeconds: number | null;
  sleepWindowConfirmed: boolean | null;
  sleepWindowConfirmationType: string | null;
  sleepStartTimestampGMT: Date | null;
  sleepEndTimestampGMT: Date | null;
  sleepStartTimestampLocal: Date | null;
  sleepEndTimestampLocal: Date | null;
  autoSleepStartTimestampGMT: Date | null;
  autoSleepEndTimestampGMT: Date | null;
  sleepQualityTypePK: string | null;
  sleepResultTypePK: string | null;
  unmeasurableSleepSeconds: number | null;
  deepSleepSeconds: number | null;
  lightSleepSeconds: number | null;
  remSleepSeconds: number | null;
  awakeSleepSeconds: number | null;
  deviceRemCapable: boolean | null;
  sleepFromDevice: boolean | null;
  averageSpO2Value: number | null;
  lowestSpO2Value: number | null;
  highestSpO2Value: number | null;
  numberOfEventsBelowThreshold: number | null;
  averageSpO2HRSleep: number | null;
  spo2Threshold: number | null;
  averageRespirationValue: number | null;
  lowestRespirationValue: number | null;
  highestRespirationValue: number | null;
  awakeCount: number | null;
  avgSleepStress: number | null;
  ageGroup: string | null;
  avgHeartRate: number | null;
  sleepScoreFeedback: string | null;
  sleepScoreInsight: string | null;
  sleepScorePersonalizedInsight: string | null;
  userNote: string | null;
  kidSleepNote: string | null;
  sleepVersion: number | null;
  breathingDisruptionSeverity: string | null;
}

/** A day of HRV as stored in `hrv_data` (minus id/ownerId/rawPayload). */
export interface HrvRecord {
  calendarDate: string; // YYYY-MM-DD (Garmin local date)
  weeklyAvg: number | null;
  lastNightAvg: number | null;
  lastNight5MinHigh: number | null;
  baselineLowUpper: number | null;
  baselineBalancedLow: number | null;
  baselineBalancedUpper: number | null;
  baselineMarkerValue: number | null;
  status: string | null;
  feedbackPhrase: string | null;
  createTimeStamp: Date;
  startTimestampGMT: Date;
  endTimestampGMT: Date;
  startTimestampLocal: Date;
  endTimestampLocal: Date;
  sleepStartTimestampGMT: Date;
  sleepEndTimestampGMT: Date;
  sleepStartTimestampLocal: Date;
  sleepEndTimestampLocal: Date;
}

/** An individual HRV reading as stored in `hrv_readings` (minus id). */
export interface HrvReadingRecord {
  hrvDataId: string; // our hrv_data.id uuid
  hrvValue: number;
  readingTimeGMT: Date;
  readingTimeLocal: Date;
}

/** A day of user summary as stored in `user_daily_summaries` (minus id/ownerId/rawPayload). */
export interface UserDailySummaryRecord {
  userProfileId: number | null;
  userDailySummaryId: number | null;
  uuid: string | null;
  calendarDate: string; // YYYY-MM-DD (Garmin local date)
  wellnessStartTimeGmt: Date | null;
  wellnessStartTimeLocal: Date | null;
  wellnessEndTimeGmt: Date | null;
  wellnessEndTimeLocal: Date | null;
  durationInMilliseconds: number | null;
  wellnessDescription: string | null;

  // Calories
  totalKilocalories: number | null;
  activeKilocalories: number | null;
  bmrKilocalories: number | null;
  consumedKilocalories: number | null;
  remainingKilocalories: number | null;

  // Steps & distance
  totalSteps: number | null;
  dailyStepGoal: number | null;
  totalDistanceMeters: number | null;
  wellnessDistanceMeters: number | null;

  // Activity time (seconds)
  highlyActiveSeconds: number | null;
  activeSeconds: number | null;
  sedentarySeconds: number | null;
  sleepingSeconds: number | null;

  // Intensity & floors
  moderateIntensityMinutes: number | null;
  vigorousIntensityMinutes: number | null;
  intensityMinutesGoal: number | null;
  floorsAscendedInMeters: number | null;
  floorsDescendedInMeters: number | null;
  floorsAscended: number | null;
  floorsDescended: number | null;
  userFloorsAscendedGoal: number | null;

  // Heart rate
  minHeartRate: number | null;
  maxHeartRate: number | null;
  restingHeartRate: number | null;
  lastSevenDaysAvgRestingHeartRate: number | null;
  minAvgHeartRate: number | null;
  maxAvgHeartRate: number | null;

  // Stress (levels, durations in seconds, percentages)
  averageStressLevel: number | null;
  maxStressLevel: number | null;
  stressDuration: number | null;
  restStressDuration: number | null;
  activityStressDuration: number | null;
  uncategorizedStressDuration: number | null;
  totalStressDuration: number | null;
  lowStressDuration: number | null;
  mediumStressDuration: number | null;
  highStressDuration: number | null;
  stressPercentage: number | null;
  restStressPercentage: number | null;
  activityStressPercentage: number | null;
  uncategorizedStressPercentage: number | null;
  lowStressPercentage: number | null;
  mediumStressPercentage: number | null;
  highStressPercentage: number | null;
  stressQualifier: string | null;

  // Sleep/awake (seconds)
  measurableAwakeDuration: number | null;
  measurableAsleepDuration: number | null;

  // Body battery (0-100)
  bodyBatteryChargedValue: number | null;
  bodyBatteryDrainedValue: number | null;
  bodyBatteryHighestValue: number | null;
  bodyBatteryLowestValue: number | null;
  bodyBatteryMostRecentValue: number | null;
  bodyBatteryDuringSleep: number | null;
  bodyBatteryAtWakeTime: number | null;
  bodyBatteryVersion: number | null;

  // SpO2, respiration & environment
  abnormalHeartRateAlertsCount: number | null;
  averageSpo2: number | null;
  lowestSpo2: number | null;
  latestSpo2: number | null;
  latestSpo2ReadingTimeGmt: Date | null;
  latestSpo2ReadingTimeLocal: Date | null;
  averageMonitoringEnvironmentAltitude: number | null;
  avgWakingRespirationValue: number | null;
  highestRespirationValue: number | null;
  lowestRespirationValue: number | null;
  latestRespirationValue: number | null;
  latestRespirationTimeGMT: Date | null;

  // Flags & metadata
  includesWellnessData: boolean | null;
  includesActivityData: boolean | null;
  includesCalorieConsumedData: boolean | null;
  source: string | null;
  lastSyncTimestampGMT: Date | null;
}

// ---------------------------------------------------------------------------
// Mappers (raw Garmin API shape -> internal domain model)
// ---------------------------------------------------------------------------

/** Map a raw Garmin activity to our record; null when start dates are missing/invalid. */
export function toActivityRecord(activity: GarminActivity): ActivityRecord | null {
  const startTimeLocal = parseGarminDate(activity.startTimeLocal);
  const startTimeGmt = parseGarminDate(activity.startTimeGMT);

  if (!startTimeLocal || !startTimeGmt) {
    return null; // orchestrator logs the skip
  }

  // Compute endTimeGmt if missing by adding duration to startTimeGmt.
  const endTimeGmt =
    parseGarminDate(activity.endTimeGMT) ?? new Date(startTimeGmt.getTime() + activity.duration * 1000);

  return {
    garminActivityId: activity.activityId,
    activityName: activity.activityName || activity.activityType.typeKey,
    activityType: activity.activityType.typeKey,
    startTimeLocal,
    startTimeGmt,
    endTimeGmt,
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
}

/** Map raw Garmin splits to our records, keyed by the stored activity id (uuid). */
export function toSplitRecords(activityId: string, splits?: GarminSplit[]): SplitRecord[] {
  if (!splits || splits.length === 0) return [];

  return splits.map((split, index) => ({
    activityId,
    splitNumber: split.splitNumber || index + 1,
    distance: split.distance,
    durationSeconds: Math.round(split.duration),
    avgSpeed: split.avgSpeed ?? null,
  }));
}

/**
 * Map a raw Garmin sleep response to our record. Uses the requested date when
 * the response has no calendarDate; null when neither is available.
 */
export function toSleepRecord(response: GarminSleepResponse, requestedDate: string): SleepRecord | null {
  // Use the requested date if calendarDate is missing in the response.
  const calendarDate = response.calendarDate || requestedDate;

  if (!calendarDate) {
    return null; // orchestrator logs the skip
  }

  return {
    calendarDate,
    sleepTimeSeconds: response.sleepTimeSeconds ?? null,
    napTimeSeconds: response.napTimeSeconds ?? null,
    sleepWindowConfirmed: response.sleepWindowConfirmed ?? null,
    sleepWindowConfirmationType: response.sleepWindowConfirmationType ?? null,
    sleepStartTimestampGMT: parseGarminDateOrUndefined(response.sleepStartTimestampGMT) ?? null,
    sleepEndTimestampGMT: parseGarminDateOrUndefined(response.sleepEndTimestampGMT) ?? null,
    sleepStartTimestampLocal: parseGarminDateOrUndefined(response.sleepStartTimestampLocal) ?? null,
    sleepEndTimestampLocal: parseGarminDateOrUndefined(response.sleepEndTimestampLocal) ?? null,
    autoSleepStartTimestampGMT: parseGarminDateOrUndefined(response.autoSleepStartTimestampGMT) ?? null,
    autoSleepEndTimestampGMT: parseGarminDateOrUndefined(response.autoSleepEndTimestampGMT) ?? null,
    sleepQualityTypePK: response.sleepQualityTypePK ?? null,
    sleepResultTypePK: response.sleepResultTypePK ?? null,
    unmeasurableSleepSeconds: response.unmeasurableSleepSeconds ?? null,
    deepSleepSeconds: response.deepSleepSeconds ?? null,
    lightSleepSeconds: response.lightSleepSeconds ?? null,
    remSleepSeconds: response.remSleepSeconds ?? null,
    awakeSleepSeconds: response.awakeSleepSeconds ?? null,
    deviceRemCapable: response.deviceRemCapable ?? null,
    sleepFromDevice: response.sleepFromDevice ?? null,
    averageSpO2Value: response.averageSpO2Value ?? null,
    lowestSpO2Value: response.lowestSpO2Value ?? null,
    highestSpO2Value: response.highestSpO2Value ?? null,
    numberOfEventsBelowThreshold: response.numberOfEventsBelowThreshold ?? null,
    averageSpO2HRSleep: response.averageSpO2HRSleep ?? null,
    spo2Threshold: response.spo2Threshold ?? null,
    averageRespirationValue: response.averageRespirationValue ?? null,
    lowestRespirationValue: response.lowestRespirationValue ?? null,
    highestRespirationValue: response.highestRespirationValue ?? null,
    awakeCount: response.awakeCount ?? null,
    avgSleepStress: response.avgSleepStress ?? null,
    ageGroup: response.ageGroup ?? null,
    avgHeartRate: response.avgHeartRate ?? null,
    sleepScoreFeedback: response.sleepScoreFeedback ?? null,
    sleepScoreInsight: response.sleepScoreInsight ?? null,
    sleepScorePersonalizedInsight: response.sleepScorePersonalizedInsight ?? null,
    userNote: response.userNote ?? null,
    kidSleepNote: response.kidSleepNote ?? null,
    sleepVersion: response.sleepVersion ?? null,
    breathingDisruptionSeverity: response.breathingDisruptionSeverity ?? null,
  };
}

/** Map a raw Garmin HRV response to our record (missing timestamps fall back to now). */
export function toHrvRecord(response: GarminHRVResponse): HrvRecord {
  const summary = response.hrvSummary;

  return {
    calendarDate: summary.calendarDate,
    weeklyAvg: summary.weeklyAvg ?? null,
    lastNightAvg: summary.lastNightAvg ?? null,
    lastNight5MinHigh: summary.lastNight5MinHigh ?? null,
    baselineLowUpper: summary.baseline.lowUpper ?? null,
    baselineBalancedLow: summary.baseline.balancedLow ?? null,
    baselineBalancedUpper: summary.baseline.balancedUpper ?? null,
    baselineMarkerValue: summary.baseline.markerValue ?? null,
    status: summary.status ?? null,
    feedbackPhrase: summary.feedbackPhrase ?? null,
    createTimeStamp: parseGarminDateOrUndefined(summary.createTimeStamp) || new Date(),
    startTimestampGMT: parseGarminDateOrUndefined(response.startTimestampGMT) || new Date(),
    endTimestampGMT: parseGarminDateOrUndefined(response.endTimestampGMT) || new Date(),
    startTimestampLocal: parseGarminDateOrUndefined(response.startTimestampLocal) || new Date(),
    endTimestampLocal: parseGarminDateOrUndefined(response.endTimestampLocal) || new Date(),
    sleepStartTimestampGMT: parseGarminDateOrUndefined(response.sleepStartTimestampGMT) || new Date(),
    sleepEndTimestampGMT: parseGarminDateOrUndefined(response.sleepEndTimestampGMT) || new Date(),
    sleepStartTimestampLocal: parseGarminDateOrUndefined(response.sleepStartTimestampLocal) || new Date(),
    sleepEndTimestampLocal: parseGarminDateOrUndefined(response.sleepEndTimestampLocal) || new Date(),
  };
}

/** Map raw Garmin HRV readings to our records, keyed by the stored hrv_data id. */
export function toHrvReadingRecords(hrvDataId: string, readings?: GarminHRVReading[]): HrvReadingRecord[] {
  if (!readings || readings.length === 0) return [];

  return readings.map((reading) => ({
    hrvDataId,
    hrvValue: reading.hrvValue,
    readingTimeGMT: parseGarminDateOrUndefined(reading.readingTimeGMT) || new Date(),
    readingTimeLocal: parseGarminDateOrUndefined(reading.readingTimeLocal) || new Date(),
  }));
}

/**
 * Map a raw Garmin user daily summary response to our record. Uses the
 * requested date when the response has no calendarDate; null when neither is
 * available.
 */
export function toUserDailySummaryRecord(
  response: GarminUserDailySummaryResponse,
  requestedDate: string
): UserDailySummaryRecord | null {
  // Use the requested date if calendarDate is missing in the response.
  const calendarDate = response.calendarDate || requestedDate;

  if (!calendarDate) {
    return null; // orchestrator logs the skip
  }

  return {
    userProfileId: response.userProfileId ?? null,
    userDailySummaryId: response.userDailySummaryId ?? null,
    uuid: response.uuid ?? null,
    calendarDate,
    wellnessStartTimeGmt: parseGarminDateOrUndefined(response.wellnessStartTimeGmt) ?? null,
    wellnessStartTimeLocal: parseGarminDateOrUndefined(response.wellnessStartTimeLocal) ?? null,
    wellnessEndTimeGmt: parseGarminDateOrUndefined(response.wellnessEndTimeGmt) ?? null,
    wellnessEndTimeLocal: parseGarminDateOrUndefined(response.wellnessEndTimeLocal) ?? null,
    durationInMilliseconds: response.durationInMilliseconds ?? null,
    wellnessDescription: response.wellnessDescription ?? null,

    // Calories
    totalKilocalories: response.totalKilocalories ?? null,
    activeKilocalories: response.activeKilocalories ?? null,
    bmrKilocalories: response.bmrKilocalories ?? null,
    consumedKilocalories: response.consumedKilocalories ?? null,
    remainingKilocalories: response.remainingKilocalories ?? null,

    // Steps & distance
    totalSteps: response.totalSteps ?? null,
    dailyStepGoal: response.dailyStepGoal ?? null,
    totalDistanceMeters: response.totalDistanceMeters ?? null,
    wellnessDistanceMeters: response.wellnessDistanceMeters ?? null,

    // Activity time (seconds)
    highlyActiveSeconds: response.highlyActiveSeconds ?? null,
    activeSeconds: response.activeSeconds ?? null,
    sedentarySeconds: response.sedentarySeconds ?? null,
    sleepingSeconds: response.sleepingSeconds ?? null,

    // Intensity & floors
    moderateIntensityMinutes: response.moderateIntensityMinutes ?? null,
    vigorousIntensityMinutes: response.vigorousIntensityMinutes ?? null,
    intensityMinutesGoal: response.intensityMinutesGoal ?? null,
    floorsAscendedInMeters: response.floorsAscendedInMeters ?? null,
    floorsDescendedInMeters: response.floorsDescendedInMeters ?? null,
    floorsAscended: response.floorsAscended ?? null,
    floorsDescended: response.floorsDescended ?? null,
    userFloorsAscendedGoal: response.userFloorsAscendedGoal ?? null,

    // Heart rate
    minHeartRate: response.minHeartRate ?? null,
    maxHeartRate: response.maxHeartRate ?? null,
    restingHeartRate: response.restingHeartRate ?? null,
    lastSevenDaysAvgRestingHeartRate: response.lastSevenDaysAvgRestingHeartRate ?? null,
    minAvgHeartRate: response.minAvgHeartRate ?? null,
    maxAvgHeartRate: response.maxAvgHeartRate ?? null,

    // Stress (levels, durations in seconds, percentages)
    averageStressLevel: response.averageStressLevel ?? null,
    maxStressLevel: response.maxStressLevel ?? null,
    stressDuration: response.stressDuration ?? null,
    restStressDuration: response.restStressDuration ?? null,
    activityStressDuration: response.activityStressDuration ?? null,
    uncategorizedStressDuration: response.uncategorizedStressDuration ?? null,
    totalStressDuration: response.totalStressDuration ?? null,
    lowStressDuration: response.lowStressDuration ?? null,
    mediumStressDuration: response.mediumStressDuration ?? null,
    highStressDuration: response.highStressDuration ?? null,
    stressPercentage: response.stressPercentage ?? null,
    restStressPercentage: response.restStressPercentage ?? null,
    activityStressPercentage: response.activityStressPercentage ?? null,
    uncategorizedStressPercentage: response.uncategorizedStressPercentage ?? null,
    lowStressPercentage: response.lowStressPercentage ?? null,
    mediumStressPercentage: response.mediumStressPercentage ?? null,
    highStressPercentage: response.highStressPercentage ?? null,
    stressQualifier: response.stressQualifier ?? null,

    // Sleep/awake (seconds)
    measurableAwakeDuration: response.measurableAwakeDuration ?? null,
    measurableAsleepDuration: response.measurableAsleepDuration ?? null,

    // Body battery (0-100)
    bodyBatteryChargedValue: response.bodyBatteryChargedValue ?? null,
    bodyBatteryDrainedValue: response.bodyBatteryDrainedValue ?? null,
    bodyBatteryHighestValue: response.bodyBatteryHighestValue ?? null,
    bodyBatteryLowestValue: response.bodyBatteryLowestValue ?? null,
    bodyBatteryMostRecentValue: response.bodyBatteryMostRecentValue ?? null,
    bodyBatteryDuringSleep: response.bodyBatteryDuringSleep ?? null,
    bodyBatteryAtWakeTime: response.bodyBatteryAtWakeTime ?? null,
    bodyBatteryVersion: response.bodyBatteryVersion ?? null,

    // SpO2, respiration & environment
    abnormalHeartRateAlertsCount: response.abnormalHeartRateAlertsCount ?? null,
    averageSpo2: response.averageSpo2 ?? null,
    lowestSpo2: response.lowestSpo2 ?? null,
    latestSpo2: response.latestSpo2 ?? null,
    latestSpo2ReadingTimeGmt: parseGarminDateOrUndefined(response.latestSpo2ReadingTimeGmt) ?? null,
    latestSpo2ReadingTimeLocal: parseGarminDateOrUndefined(response.latestSpo2ReadingTimeLocal) ?? null,
    averageMonitoringEnvironmentAltitude: response.averageMonitoringEnvironmentAltitude ?? null,
    avgWakingRespirationValue: response.avgWakingRespirationValue ?? null,
    highestRespirationValue: response.highestRespirationValue ?? null,
    lowestRespirationValue: response.lowestRespirationValue ?? null,
    latestRespirationValue: response.latestRespirationValue ?? null,
    latestRespirationTimeGMT: parseGarminDateOrUndefined(response.latestRespirationTimeGMT) ?? null,

    // Flags & metadata
    includesWellnessData: response.includesWellnessData ?? null,
    includesActivityData: response.includesActivityData ?? null,
    includesCalorieConsumedData: response.includesCalorieConsumedData ?? null,
    source: response.source ?? null,
    lastSyncTimestampGMT: parseGarminDateOrUndefined(response.lastSyncTimestampGMT) ?? null,
  };
}
