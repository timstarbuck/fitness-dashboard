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