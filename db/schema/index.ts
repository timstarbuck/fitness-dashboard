import { pgTable, uuid, bigint, varchar, timestamp, doublePrecision, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
});

export const activitySplits = pgTable("activity_splits", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: uuid("activity_id").references(() => activities.id, { onDelete: "cascade" }).notNull(),
  splitNumber: integer("split_number").notNull(),
  distance: doublePrecision("distance").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  avgSpeed: doublePrecision("avg_speed"),
});