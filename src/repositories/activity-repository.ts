import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db";
import { activities, activitySplits } from "../../db/schema";
import type { ActivitySummary } from "../domain/types";
import type { ActivityRecord, SplitRecord } from "../services/garmin/dto";

type Database = typeof db;

/** Placeholder owner until real user accounts exist (see UserRepository, future phase). */
const OWNER_ID = "system";

export type Activity = typeof activities.$inferSelect;
export type ActivitySplit = typeof activitySplits.$inferSelect;

/** Activity row without the (large) rawPayload jsonb — used for lists, KPIs and charts. */
const SUMMARY_COLUMNS = {
  id: activities.id,
  activityName: activities.activityName,
  activityType: activities.activityType,
  startTimeGmt: activities.startTimeGmt,
  distance: activities.distance,
  durationSeconds: activities.durationSeconds,
  elevationGain: activities.elevationGain,
  elevationLoss: activities.elevationLoss,
  avgHeartRate: activities.avgHeartRate,
  maxHeartRate: activities.maxHeartRate,
  calories: activities.calories,
};

/**
 * Single source of truth for all data access on the `activities` and
 * `activity_splits` tables. Inject a different database instance (e.g. in unit
 * tests) via the constructor; defaults to the app's shared client.
 */
export class ActivityRepository {
  private readonly db: Database;

  // The parameter is deliberately not named `db`: a same-named parameter
  // shadows the import, and TypeScript elides the import in that case, turning
  // the default into a self-reference (TDZ crash at construction).
  constructor(database: Database = db) {
    this.db = database;
  }

  /** Activities whose start time falls in [since, until]. `since` null = all-time. */
  findSince(since: Date | null, until: Date = new Date()): Promise<ActivitySummary[]> {
    const conditions = [lte(activities.startTimeGmt, until)];
    if (since) conditions.unshift(gte(activities.startTimeGmt, since));
    return this.db
      .select(SUMMARY_COLUMNS)
      .from(activities)
      .where(and(...conditions))
      .orderBy(desc(activities.startTimeGmt));
  }

  /** Most recent activities (newest first), capped at `limit`. */
  findRecent(limit = 50): Promise<ActivitySummary[]> {
    return this.db.select(SUMMARY_COLUMNS).from(activities).orderBy(desc(activities.startTimeGmt)).limit(limit);
  }

  /** Full activity row + splits, or null when not found. */
  async findByIdWithSplits(id: string): Promise<{ activity: Activity; splits: ActivitySplit[] } | null> {
    const [activity] = await this.db.select().from(activities).where(eq(activities.id, id)).limit(1);
    if (!activity) return null;
    const splits = await this.db
      .select()
      .from(activitySplits)
      .where(eq(activitySplits.activityId, id))
      .orderBy(asc(activitySplits.splitNumber));
    return { activity, splits };
  }

  /**
   * Insert or update an activity by Garmin id. `rawPayload` (the raw API
   * response) is written on insert only, preserving the original snapshot —
   * matching the previous upsert behavior. Returns the stored row (its uuid is
   * needed to key split inserts).
   */
  async upsertActivity(record: ActivityRecord, rawPayload?: unknown): Promise<Activity> {
    const [row] = await this.db
      .insert(activities)
      .values({ ...record, ownerId: OWNER_ID, rawPayload })
      // On conflict, refresh the mutable fields only — not garminActivityId (the
      // conflict target), ownerId, or rawPayload (keeps the original snapshot).
      .onConflictDoUpdate({
        target: activities.garminActivityId,
        set: {
          activityName: record.activityName,
          activityType: record.activityType,
          startTimeLocal: record.startTimeLocal,
          startTimeGmt: record.startTimeGmt,
          endTimeGmt: record.endTimeGmt,
          distance: record.distance,
          durationSeconds: record.durationSeconds,
          elevationGain: record.elevationGain,
          elevationLoss: record.elevationLoss,
          avgHeartRate: record.avgHeartRate,
          maxHeartRate: record.maxHeartRate,
          calories: record.calories,
          avgSpeed: record.avgSpeed,
          maxSpeed: record.maxSpeed,
        },
      })
      .returning();

    return row;
  }

  /** Insert splits, skipping ones that already exist. */
  async insertSplits(splits: SplitRecord[]): Promise<void> {
    if (splits.length === 0) return;
    await this.db.insert(activitySplits).values(splits).onConflictDoNothing();
  }
}

export const activityRepository = new ActivityRepository();
