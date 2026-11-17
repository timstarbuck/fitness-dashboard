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