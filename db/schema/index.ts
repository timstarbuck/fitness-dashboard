import { sql } from "drizzle-orm";
import { pgTable, uuid, bigint, varchar, timestamp, doublePrecision, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  garminActivityId: bigint("garmin_activity_id", { mode: "number" }).notNull().unique(),
  activityName: varchar("activity_name", { length: 255 }).notNull(),
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  startTimeLocal: timestamp("start_time_local").notNull(),
  startTimeGmt: timestamp("start_time_gmt").notNull(),
  endTimeGmt: timestamp("end_time_gmt").notNull(),
  distance: doublePrecision("distance").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  elevationGain: doublePrecision("elevation_gain"),
  elevationLoss: doublePrecision("elevation_loss"),
  avgHeartRate: integer("avg_heart_rate"),
  maxHeartRate: integer("max_heart_rate"),
  calories: doublePrecision("calories"),
  avgSpeed: doublePrecision("avg_speed"),
  maxSpeed: doublePrecision("max_speed"),
  ownerId: varchar("owner_id", { length: 255 }).notNull(),
  isFavorite: boolean("is_favorite").default(false),
  isPr: boolean("is_pr").default(false),
  rawPayload: jsonb("raw_payload"),
});

export const activitySplits = pgTable("activity_splits", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: uuid("activity_id").references(() => activities.id, { onDelete: "cascade" }).notNull(),
  splitNumber: integer("split_number").notNull(),
  distance: doublePrecision("distance").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  avgSpeed: doublePrecision("avg_speed"),
});

// Named locks used to ensure only one instance of a sync process runs at a time.
// Works across serverless function instances (unlike in-memory flags) because the
// state lives in the database. Stale locks (crashed/timed-out functions) expire
// via expires_at and can be re-claimed.
export const syncLocks = pgTable("sync_locks", {
  name: varchar("name", { length: 100 }).primaryKey(),
  lockToken: uuid("lock_token").notNull().default(sql`gen_random_uuid()`),
  lockedAt: timestamp("locked_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// HRV (Heart Rate Variability) data from Garmin
export const hrvData = pgTable("hrv_data", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  calendarDate: varchar("calendar_date", { length: 10 }).notNull().unique(), // YYYY-MM-DD
  weeklyAvg: doublePrecision("weekly_avg"),
  lastNightAvg: doublePrecision("last_night_avg"),
  lastNight5MinHigh: doublePrecision("last_night_5min_high"),
  baselineLowUpper: doublePrecision("baseline_low_upper"),
  baselineBalancedLow: doublePrecision("baseline_balanced_low"),
  baselineBalancedUpper: doublePrecision("baseline_balanced_upper"),
  baselineMarkerValue: doublePrecision("baseline_marker_value"),
  status: varchar("status", { length: 50 }),
  feedbackPhrase: varchar("feedback_phrase", { length: 255 }),
  createTimeStamp: timestamp("create_timestamp"),
  startTimestampGMT: timestamp("start_timestamp_gmt"),
  endTimestampGMT: timestamp("end_timestamp_gmt"),
  startTimestampLocal: timestamp("start_timestamp_local"),
  endTimestampLocal: timestamp("end_timestamp_local"),
  sleepStartTimestampGMT: timestamp("sleep_start_timestamp_gmt"),
  sleepEndTimestampGMT: timestamp("sleep_end_timestamp_gmt"),
  sleepStartTimestampLocal: timestamp("sleep_start_timestamp_local"),
  sleepEndTimestampLocal: timestamp("sleep_end_timestamp_local"),
  ownerId: varchar("owner_id", { length: 255 }).notNull(),
  rawPayload: jsonb("raw_payload"),
});

// HRV readings for each night
export const hrvReadings = pgTable("hrv_readings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  hrvDataId: uuid("hrv_data_id").references(() => hrvData.id, { onDelete: "cascade" }).notNull(),
  hrvValue: doublePrecision("hrv_value").notNull(),
  readingTimeGMT: timestamp("reading_time_gmt").notNull(),
  readingTimeLocal: timestamp("reading_time_local"),
});

// Sleep data from Garmin
export const sleepData = pgTable("sleep_data", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  calendarDate: varchar("calendar_date", { length: 10 }).notNull().unique(), // YYYY-MM-DD
  sleepTimeSeconds: integer("sleep_time_seconds"),
  napTimeSeconds: integer("nap_time_seconds"),
  sleepWindowConfirmed: boolean("sleep_window_confirmed"),
  sleepWindowConfirmationType: varchar("sleep_window_confirmation_type", { length: 50 }),
  sleepStartTimestampGMT: timestamp("sleep_start_timestamp_gmt"),
  sleepEndTimestampGMT: timestamp("sleep_end_timestamp_gmt"),
  sleepStartTimestampLocal: timestamp("sleep_start_timestamp_local"),
  sleepEndTimestampLocal: timestamp("sleep_end_timestamp_local"),
  autoSleepStartTimestampGMT: timestamp("auto_sleep_start_timestamp_gmt"),
  autoSleepEndTimestampGMT: timestamp("auto_sleep_end_timestamp_gmt"),
  sleepQualityTypePK: varchar("sleep_quality_type_pk", { length: 50 }),
  sleepResultTypePK: varchar("sleep_result_type_pk", { length: 50 }),
  unmeasurableSleepSeconds: integer("unmeasurable_sleep_seconds"),
  deepSleepSeconds: integer("deep_sleep_seconds"),
  lightSleepSeconds: integer("light_sleep_seconds"),
  remSleepSeconds: integer("rem_sleep_seconds"),
  awakeSleepSeconds: integer("awake_sleep_seconds"),
  deviceRemCapable: boolean("device_rem_capable"),
  sleepFromDevice: boolean("sleep_from_device"),
  averageSpO2Value: integer("average_spo2_value"),
  lowestSpO2Value: integer("lowest_spo2_value"),
  highestSpO2Value: integer("highest_spo2_value"),
  numberOfEventsBelowThreshold: integer("number_of_events_below_threshold"),
  averageSpO2HRSleep: integer("average_spo2_hr_sleep"),
  spo2Threshold: integer("spo2_threshold"),
  averageRespirationValue: integer("average_respiration_value"),
  lowestRespirationValue: integer("lowest_respiration_value"),
  highestRespirationValue: integer("highest_respiration_value"),
  awakeCount: integer("awake_count"),
  avgSleepStress: integer("avg_sleep_stress"),
  ageGroup: varchar("age_group", { length: 20 }),
  avgHeartRate: integer("avg_heart_rate"),
  sleepScoreFeedback: varchar("sleep_score_feedback", { length: 50 }),
  sleepScoreInsight: varchar("sleep_score_insight", { length: 50 }),
  sleepScorePersonalizedInsight: varchar("sleep_score_personalized_insight", { length: 50 }),
  userNote: varchar("user_note", { length: 255 }),
  kidSleepNote: varchar("kid_sleep_note", { length: 255 }),
  sleepVersion: integer("sleep_version"),
  breathingDisruptionSeverity: varchar("breathing_disruption_severity", { length: 50 }),
  ownerId: varchar("owner_id", { length: 255 }).notNull(),
  rawPayload: jsonb("raw_payload"),
});

// Daily user summary from Garmin (steps, calories, stress, body battery, etc.)
export const userDailySummary = pgTable("user_daily_summaries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userProfileId: bigint("user_profile_id", { mode: "number" }),
  userDailySummaryId: bigint("user_daily_summary_id", { mode: "number" }),
  uuid: varchar("uuid", { length: 255 }),
  calendarDate: varchar("calendar_date", { length: 10 }).notNull().unique(), // YYYY-MM-DD
  wellnessStartTimeGmt: timestamp("wellness_start_time_gmt"),
  wellnessStartTimeLocal: timestamp("wellness_start_time_local"),
  wellnessEndTimeGmt: timestamp("wellness_end_time_gmt"),
  wellnessEndTimeLocal: timestamp("wellness_end_time_local"),
  durationInMilliseconds: doublePrecision("duration_in_milliseconds"),
  wellnessDescription: varchar("wellness_description", { length: 255 }),

  // Calories
  totalKilocalories: doublePrecision("total_kilocalories"),
  activeKilocalories: doublePrecision("active_kilocalories"),
  bmrKilocalories: doublePrecision("bmr_kilocalories"),
  consumedKilocalories: doublePrecision("consumed_kilocalories"),
  remainingKilocalories: doublePrecision("remaining_kilocalories"),

  // Steps & distance
  totalSteps: integer("total_steps"),
  dailyStepGoal: integer("daily_step_goal"),
  totalDistanceMeters: doublePrecision("total_distance_meters"),
  wellnessDistanceMeters: doublePrecision("wellness_distance_meters"),

  // Activity time (seconds)
  highlyActiveSeconds: doublePrecision("highly_active_seconds"),
  activeSeconds: doublePrecision("active_seconds"),
  sedentarySeconds: doublePrecision("sedentary_seconds"),
  sleepingSeconds: doublePrecision("sleeping_seconds"),

  // Intensity & floors
  moderateIntensityMinutes: doublePrecision("moderate_intensity_minutes"),
  vigorousIntensityMinutes: doublePrecision("vigorous_intensity_minutes"),
  intensityMinutesGoal: doublePrecision("intensity_minutes_goal"),
  floorsAscendedInMeters: doublePrecision("floors_ascended_in_meters"),
  floorsDescendedInMeters: doublePrecision("floors_descended_in_meters"),
  floorsAscended: doublePrecision("floors_ascended"),
  floorsDescended: doublePrecision("floors_descended"),
  userFloorsAscendedGoal: doublePrecision("user_floors_ascended_goal"),

  // Heart rate
  minHeartRate: integer("min_heart_rate"),
  maxHeartRate: integer("max_heart_rate"),
  restingHeartRate: integer("resting_heart_rate"),
  lastSevenDaysAvgRestingHeartRate: integer("last_seven_days_avg_resting_heart_rate"),
  minAvgHeartRate: integer("min_avg_heart_rate"),
  maxAvgHeartRate: integer("max_avg_heart_rate"),

  // Stress (levels, durations in seconds, percentages)
  averageStressLevel: integer("average_stress_level"),
  maxStressLevel: integer("max_stress_level"),
  stressDuration: doublePrecision("stress_duration"),
  restStressDuration: doublePrecision("rest_stress_duration"),
  activityStressDuration: doublePrecision("activity_stress_duration"),
  uncategorizedStressDuration: doublePrecision("uncategorized_stress_duration"),
  totalStressDuration: doublePrecision("total_stress_duration"),
  lowStressDuration: doublePrecision("low_stress_duration"),
  mediumStressDuration: doublePrecision("medium_stress_duration"),
  highStressDuration: doublePrecision("high_stress_duration"),
  stressPercentage: doublePrecision("stress_percentage"),
  restStressPercentage: doublePrecision("rest_stress_percentage"),
  activityStressPercentage: doublePrecision("activity_stress_percentage"),
  uncategorizedStressPercentage: doublePrecision("uncategorized_stress_percentage"),
  lowStressPercentage: doublePrecision("low_stress_percentage"),
  mediumStressPercentage: doublePrecision("medium_stress_percentage"),
  highStressPercentage: doublePrecision("high_stress_percentage"),
  stressQualifier: varchar("stress_qualifier", { length: 50 }),

  // Sleep/awake (seconds)
  measurableAwakeDuration: doublePrecision("measurable_awake_duration"),
  measurableAsleepDuration: doublePrecision("measurable_asleep_duration"),

  // Body battery (0-100)
  bodyBatteryChargedValue: integer("body_battery_charged_value"),
  bodyBatteryDrainedValue: integer("body_battery_drained_value"),
  bodyBatteryHighestValue: integer("body_battery_highest_value"),
  bodyBatteryLowestValue: integer("body_battery_lowest_value"),
  bodyBatteryMostRecentValue: integer("body_battery_most_recent_value"),
  bodyBatteryDuringSleep: integer("body_battery_during_sleep"),
  bodyBatteryAtWakeTime: integer("body_battery_at_wake_time"),
  bodyBatteryVersion: integer("body_battery_version"),

  // SpO2, respiration & environment
  abnormalHeartRateAlertsCount: integer("abnormal_heart_rate_alerts_count"),
  averageSpo2: doublePrecision("average_spo2"),
  lowestSpo2: doublePrecision("lowest_spo2"),
  latestSpo2: doublePrecision("latest_spo2"),
  latestSpo2ReadingTimeGmt: timestamp("latest_spo2_reading_time_gmt"),
  latestSpo2ReadingTimeLocal: timestamp("latest_spo2_reading_time_local"),
  averageMonitoringEnvironmentAltitude: doublePrecision("average_monitoring_environment_altitude"),
  avgWakingRespirationValue: doublePrecision("avg_waking_respiration_value"),
  highestRespirationValue: doublePrecision("highest_respiration_value"),
  lowestRespirationValue: doublePrecision("lowest_respiration_value"),
  latestRespirationValue: doublePrecision("latest_respiration_value"),
  latestRespirationTimeGMT: timestamp("latest_respiration_time_gmt"),

  // Flags & metadata
  includesWellnessData: boolean("includes_wellness_data"),
  includesActivityData: boolean("includes_activity_data"),
  includesCalorieConsumedData: boolean("includes_calorie_consumed_data"),
  source: varchar("source", { length: 50 }),
  lastSyncTimestampGMT: timestamp("last_sync_timestamp_gmt"),
  ownerId: varchar("owner_id", { length: 255 }).notNull(),
  rawPayload: jsonb("raw_payload"),
});