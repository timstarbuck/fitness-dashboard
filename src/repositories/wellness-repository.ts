import { and, desc, gte, lte } from "drizzle-orm";
import { db } from "../../db";
import { hrvData, hrvReadings, sleepData } from "../../db/schema";
import type { HrSummary, SleepSummary } from "../domain/types";
import type { HrvRecord, HrvReadingRecord, SleepRecord } from "../services/garmin/dto";

type Database = typeof db;

/** Placeholder owner until real user accounts exist (see UserRepository, future phase). */
const OWNER_ID = "system";

export type HrvDataRow = typeof hrvData.$inferSelect;

const SLEEP_COLUMNS = {
  calendarDate: sleepData.calendarDate,
  sleepTimeSeconds: sleepData.sleepTimeSeconds,
};

const HRV_COLUMNS = {
  calendarDate: hrvData.calendarDate,
  weeklyAvg: hrvData.weeklyAvg,
  lastNightAvg: hrvData.lastNightAvg,
  baselineBalancedLow: hrvData.baselineBalancedLow,
  baselineMarkerValue: hrvData.baselineMarkerValue,
};

/**
 * Single source of truth for all data access on the wellness tables
 * (`sleep_data`, `hrv_data`, `hrv_readings`). Inject a different database
 * instance (e.g. in unit tests) via the constructor; defaults to the app's
 * shared client.
 */
export class WellnessRepository {
  private readonly db: Database;

  // The parameter is deliberately not named `db`: a same-named parameter
  // shadows the import, and TypeScript elides the import in that case, turning
  // the default into a self-reference (TDZ crash at construction).
  constructor(database: Database = db) {
    this.db = database;
  }

  // -----------------------------------------------------------------------
  // Reads (dashboard / recovery pages)
  // -----------------------------------------------------------------------

  /** Sleep rows whose calendar date falls in [sinceKey, untilKey] (YYYY-MM-DD strings). `sinceKey` null = all-time. */
  findSleepSince(sinceKey: string | null, untilKey: string): Promise<SleepSummary[]> {
    const conditions = [lte(sleepData.calendarDate, untilKey)];
    if (sinceKey) conditions.unshift(gte(sleepData.calendarDate, sinceKey));
    return this.db.select(SLEEP_COLUMNS).from(sleepData).where(and(...conditions)).orderBy(desc(sleepData.calendarDate));
  }

  /** Most recent sleep row (by calendar date), or null. */
  async findLatestSleep(): Promise<SleepSummary | null> {
    const [row] = await this.db.select(SLEEP_COLUMNS).from(sleepData).orderBy(desc(sleepData.calendarDate)).limit(1);
    return row ?? null;
  }

  /** HRV rows whose calendar date falls in [sinceKey, untilKey] (YYYY-MM-DD strings). `sinceKey` null = all-time. */
  findHrvSince(sinceKey: string | null, untilKey: string): Promise<HrSummary[]> {
    const conditions = [lte(hrvData.calendarDate, untilKey)];
    if (sinceKey) conditions.unshift(gte(hrvData.calendarDate, sinceKey));
    return this.db.select(HRV_COLUMNS).from(hrvData).where(and(...conditions)).orderBy(desc(hrvData.calendarDate));
  }

  /** Most recent HRV row (by calendar date), or null. */
  async findLatestHrv(): Promise<HrSummary | null> {
    const [row] = await this.db.select(HRV_COLUMNS).from(hrvData).orderBy(desc(hrvData.calendarDate)).limit(1);
    return row ?? null;
  }

  // -----------------------------------------------------------------------
  // Writes (Garmin sync)
  // -----------------------------------------------------------------------

  /** Insert or update a night of sleep by calendar date. */
  async upsertSleep(record: SleepRecord, rawPayload?: unknown): Promise<void> {
    await this.db
      .insert(sleepData)
      .values({ ...record, ownerId: OWNER_ID, rawPayload })
      .onConflictDoUpdate({ target: sleepData.calendarDate, set: { ...record, ownerId: OWNER_ID, rawPayload } });
  }

  /** Insert or update a day of HRV by calendar date. Returns the stored row (its uuid keys reading inserts). */
  async upsertHrv(record: HrvRecord, rawPayload?: unknown): Promise<HrvDataRow> {
    const [row] = await this.db
      .insert(hrvData)
      .values({ ...record, ownerId: OWNER_ID, rawPayload })
      // On conflict, refresh everything except calendarDate (the conflict target) and ownerId.
      .onConflictDoUpdate({
        target: hrvData.calendarDate,
        set: {
          weeklyAvg: record.weeklyAvg,
          lastNightAvg: record.lastNightAvg,
          lastNight5MinHigh: record.lastNight5MinHigh,
          baselineLowUpper: record.baselineLowUpper,
          baselineBalancedLow: record.baselineBalancedLow,
          baselineBalancedUpper: record.baselineBalancedUpper,
          baselineMarkerValue: record.baselineMarkerValue,
          status: record.status,
          feedbackPhrase: record.feedbackPhrase,
          createTimeStamp: record.createTimeStamp,
          startTimestampGMT: record.startTimestampGMT,
          endTimestampGMT: record.endTimestampGMT,
          startTimestampLocal: record.startTimestampLocal,
          endTimestampLocal: record.endTimestampLocal,
          sleepStartTimestampGMT: record.sleepStartTimestampGMT,
          sleepEndTimestampGMT: record.sleepEndTimestampGMT,
          sleepStartTimestampLocal: record.sleepStartTimestampLocal,
          sleepEndTimestampLocal: record.sleepEndTimestampLocal,
          rawPayload,
        },
      })
      .returning();

    return row;
  }

  /** Insert HRV readings, skipping ones that already exist. */
  async insertHrvReadings(readings: HrvReadingRecord[]): Promise<void> {
    if (readings.length === 0) return;
    await this.db.insert(hrvReadings).values(readings).onConflictDoNothing();
  }
}

export const wellnessRepository = new WellnessRepository();
