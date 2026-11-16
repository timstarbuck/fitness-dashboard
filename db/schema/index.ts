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