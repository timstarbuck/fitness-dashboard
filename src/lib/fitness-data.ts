import { db } from "../../db";
import { activities, activitySplits, hrvData, sleepData } from "../../db/schema";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";

export type DateRange = "week" | "month" | "all";

/** User's timezone for all date display/grouping (falls back to UTC). */
const TIME_ZONE = process.env.TIMEZONE || "UTC";

// ---------------------------------------------------------------------------
// Timezone-aware date helpers
// ---------------------------------------------------------------------------

function partsInTimeZone(d: Date): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(d);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Calendar date key (YYYY-MM-DD) in the user's timezone. */
export function calendarDateKey(d: Date): string {
  const { year, month, day } = partsInTimeZone(d);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** ISO week key (YYYY-Www) derived from the user's local calendar date. */
export function isoWeekKey(d: Date): string {
  const { year, month, day } = partsInTimeZone(d);
  // Rebuild as a UTC date so the ISO-week math is independent of server TZ.
  const target = new Date(Date.UTC(year, month - 1, day));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum); // Monday of the ISO week
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Month key (YYYY-MM) in the user's timezone. */
export function monthKey(d: Date): string {
  const { year, month } = partsInTimeZone(d);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** e.g. "Nov 20, 2026" in the user's timezone. */
export function formatDisplayDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/** e.g. "Nov 20, 2026, 6:30 PM" in the user's timezone. */
export function formatDisplayDateTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** e.g. "Mon" — short weekday label in the user's timezone. */
export function formatDayLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" }).format(d);
}

// ---------------------------------------------------------------------------
// Formatting helpers for display values
// ---------------------------------------------------------------------------

/** e.g. 5032 -> "1h 23m", 2700 -> "45m". */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Pace in min/km (e.g. "5:32") from distance (m) + duration (s); null when not computable. */
export function paceMinPerKm(distanceMeters: number | null, durationSeconds: number | null): string | null {
  if (!distanceMeters || !durationSeconds) return null;
  const secPerKm = durationSeconds / (distanceMeters / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const TYPE_ICONS: Array<[RegExp, string]> = [
  [/run|tread/i, "🏃"],
  [/bike|cycl/i, "🚴"],
  [/swim/i, "🏊"],
  [/strength|weight|gym/i, "💪"],
  [/yoga/i, "🧘"],
  [/walk/i, "🚶"],
  [/hik|trail/i, "🥾"],
];

/** Emoji icon for a Garmin activity type (e.g. "Run" -> 🏃). */
export function activityTypeIcon(type: string | null | undefined): string {
  if (!type) return "⏱️";
  for (const [pattern, icon] of TYPE_ICONS) {
    if (pattern.test(type)) return icon;
  }
  return "⏱️";
}

export function isRunningActivity(type: string | null | undefined): boolean {
  return !!type && /run|tread/i.test(type);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export type Activity = typeof activities.$inferSelect;
export type ActivitySplit = typeof activitySplits.$inferSelect;

/** Activity row without the (large) rawPayload jsonb — used for lists, KPIs and charts. */
export interface ActivitySummary {
  id: string;
  activityName: string;
  activityType: string;
  startTimeGmt: Date;
  distance: number;
  durationSeconds: number;
  elevationGain: number | null;
  elevationLoss: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  calories: number | null;
}

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

/** Activities whose start time falls in [since, until]. `since` null = all-time. */
export async function getActivitiesSince(since: Date | null, until: Date = new Date()): Promise<ActivitySummary[]> {
  const conditions = [lte(activities.startTimeGmt, until)];
  if (since) conditions.unshift(gte(activities.startTimeGmt, since));
  return db
    .select(SUMMARY_COLUMNS)
    .from(activities)
    .where(and(...conditions))
    .orderBy(desc(activities.startTimeGmt));
}

/** Most recent activities (newest first), capped at `limit`. */
export async function getRecentActivities(limit = 50): Promise<ActivitySummary[]> {
  return db
    .select(SUMMARY_COLUMNS)
    .from(activities)
    .orderBy(desc(activities.startTimeGmt))
    .limit(limit);
}

export async function getActivityWithSplits(id: string): Promise<{ activity: Activity; splits: ActivitySplit[] } | null> {
  const [activity] = await db.select().from(activities).where(eq(activities.id, id)).limit(1);
  if (!activity) return null;
  const splits = await db
    .select()
    .from(activitySplits)
    .where(eq(activitySplits.activityId, id))
    .orderBy(asc(activitySplits.splitNumber));
  return { activity, splits };
}

// ---------------------------------------------------------------------------
// Sleep + HRV queries (wellness data for the dashboard)
// ---------------------------------------------------------------------------

export interface SleepSummary {
  calendarDate: string; // YYYY-MM-DD (Garmin local date)
  sleepTimeSeconds: number | null;
}

export interface HrSummary {
  calendarDate: string; // YYYY-MM-DD (Garmin local date)
  weeklyAvg: number | null;
  lastNightAvg: number | null;
  baselineBalancedLow: number | null;
  baselineMarkerValue: number | null;
}

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

/** Sleep rows whose calendar date falls in [sinceKey, untilKey] (YYYY-MM-DD strings). `sinceKey` null = all-time. */
export async function getSleepSince(sinceKey: string | null, untilKey: string): Promise<SleepSummary[]> {
  const conditions = [lte(sleepData.calendarDate, untilKey)];
  if (sinceKey) conditions.unshift(gte(sleepData.calendarDate, sinceKey));
  return db
    .select(SLEEP_COLUMNS)
    .from(sleepData)
    .where(and(...conditions))
    .orderBy(desc(sleepData.calendarDate));
}

/** HRV rows whose calendar date falls in [sinceKey, untilKey] (YYYY-MM-DD strings). `sinceKey` null = all-time. */
export async function getHrvSince(sinceKey: string | null, untilKey: string): Promise<HrSummary[]> {
  const conditions = [lte(hrvData.calendarDate, untilKey)];
  if (sinceKey) conditions.unshift(gte(hrvData.calendarDate, sinceKey));
  return db
    .select(HRV_COLUMNS)
    .from(hrvData)
    .where(and(...conditions))
    .orderBy(desc(hrvData.calendarDate));
}

/** Most recent sleep row (by calendar date), or null. */
export async function getLatestSleep(): Promise<SleepSummary | null> {
  const [row] = await db.select(SLEEP_COLUMNS).from(sleepData).orderBy(desc(sleepData.calendarDate)).limit(1);
  return row ?? null;
}

/** Most recent HRV row (by calendar date), or null. */
export async function getLatestHrv(): Promise<HrSummary | null> {
  const [row] = await db.select(HRV_COLUMNS).from(hrvData).orderBy(desc(hrvData.calendarDate)).limit(1);
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Readiness (pure function over the latest sleep + HRV rows)
// ---------------------------------------------------------------------------

export interface Readiness {
  status: "ready" | "caution" | "rest" | "no-data";
  label: string;
  detail: string;
}

/**
 * Simple readiness heuristic from the latest HRV (vs baseline) and last night's sleep.
 * 2 points max: 1 for HRV at/above baseline, 0.5 if within 20% below; 1 for >=7h sleep, 0.5 for >=6h.
 */
export function computeReadiness(hrv: HrSummary | null, sleep: SleepSummary | null): Readiness {
  if (!hrv && !sleep) {
    return { status: "no-data", label: "NO DATA", detail: "Sync sleep and HRV to see readiness." };
  }

  let points = 0;
  const notes: string[] = [];

  if (hrv) {
    const value = hrv.lastNightAvg ?? hrv.weeklyAvg;
    const baseline = hrv.baselineMarkerValue ?? hrv.baselineBalancedLow;
    if (value != null && baseline != null && baseline > 0) {
      const ratio = value / baseline;
      if (ratio >= 1) {
        points += 1;
        notes.push(`HRV ${Math.round(value)}ms at/above baseline`);
      } else if (ratio >= 0.8) {
        points += 0.5;
        notes.push(`HRV ${Math.round(value)}ms slightly below baseline`);
      } else {
        notes.push(`HRV ${Math.round(value)}ms well below baseline`);
      }
    } else if (value != null) {
      points += 0.5; // no baseline to compare against — neutral
      notes.push(`HRV ${Math.round(value)}ms`);
    }
  }

  if (sleep?.sleepTimeSeconds != null) {
    const hours = sleep.sleepTimeSeconds / 3600;
    if (hours >= 7) {
      points += 1;
      notes.push(`${formatDuration(sleep.sleepTimeSeconds)} sleep`);
    } else if (hours >= 6) {
      points += 0.5;
      notes.push(`${formatDuration(sleep.sleepTimeSeconds)} sleep`);
    } else {
      notes.push(`only ${formatDuration(sleep.sleepTimeSeconds)} sleep`);
    }
  }

  if (points >= 1.5) {
    return { status: "ready", label: "READY TO TRAIN", detail: notes.join(" · ") || "Recovery looks good." };
  }
  if (points >= 0.75) {
    return { status: "caution", label: "EASY DAY SUGGESTED", detail: notes.join(" · ") || "Recovery is mixed." };
  }
  return { status: "rest", label: "REST UP", detail: notes.join(" · ") || "Recovery looks low." };
}

// ---------------------------------------------------------------------------
// Aggregations (pure functions over in-memory activity rows)
// ---------------------------------------------------------------------------

export interface Kpis {
  distanceKm: number;
  totalSeconds: number;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  elevationGainM: number;
  activityCount: number;
}

export function computeKpis(acts: ActivitySummary[]): Kpis {
  const avgHrs = acts.map((a) => a.avgHeartRate).filter((x): x is number => x != null);
  const maxHrs = acts.map((a) => a.maxHeartRate).filter((x): x is number => x != null);
  return {
    distanceKm: round1(sum(acts.map((a) => a.distance ?? 0)) / 1000),
    totalSeconds: sum(acts.map((a) => a.durationSeconds ?? 0)),
    avgHeartRate: avgHrs.length ? Math.round(avgHrs.reduce((s, x) => s + x, 0) / avgHrs.length) : null,
    maxHeartRate: maxHrs.length ? Math.max(...maxHrs) : null,
    elevationGainM: Math.round(sum(acts.map((a) => a.elevationGain ?? 0))),
    activityCount: acts.length,
  };
}

export interface SeriesPoint {
  name: string;
  value: number;
}

/** Group activities by key, sum a per-activity value, sorted chronologically. */
function toSeries(acts: ActivitySummary[], keyFn: (a: ActivitySummary) => string, valueFn: (a: ActivitySummary) => number): SeriesPoint[] {
  const totals = new Map<string, number>();
  for (const a of acts) {
    const key = keyFn(a);
    totals.set(key, (totals.get(key) ?? 0) + valueFn(a));
  }
  return [...totals.entries()]
    .sort((x, y) => (x[0] < y[0] ? -1 : 1))
    .map(([name, value]) => ({ name, value: round1(value) }));
}

/** Weekly distance in km. */
export function weeklyMileage(acts: ActivitySummary[]): SeriesPoint[] {
  return toSeries(acts, (a) => isoWeekKey(a.startTimeGmt), (a) => (a.distance ?? 0) / 1000);
}

/** Monthly distance in km. */
export function monthlyMileage(acts: ActivitySummary[]): SeriesPoint[] {
  return toSeries(acts, (a) => monthKey(a.startTimeGmt), (a) => (a.distance ?? 0) / 1000);
}

/** Weekly elevation gain in meters. */
export function weeklyElevation(acts: ActivitySummary[]): SeriesPoint[] {
  return toSeries(acts, (a) => isoWeekKey(a.startTimeGmt), (a) => a.elevationGain ?? 0);
}

/** Weekly average pace in min/km, running activities only. */
export function weeklyPaceTrend(acts: ActivitySummary[]): SeriesPoint[] {
  const totals = new Map<string, { timeSeconds: number; distanceMeters: number }>();
  for (const a of acts) {
    if (!isRunningActivity(a.activityType)) continue;
    const key = isoWeekKey(a.startTimeGmt);
    const cur = totals.get(key) ?? { timeSeconds: 0, distanceMeters: 0 };
    cur.timeSeconds += a.durationSeconds ?? 0;
    cur.distanceMeters += a.distance ?? 0;
    totals.set(key, cur);
  }
  return [...totals.entries()]
    .filter(([, v]) => v.distanceMeters > 0)
    .sort((x, y) => (x[0] < y[0] ? -1 : 1))
    .map(([name, { timeSeconds, distanceMeters }]) => ({
      name,
      value: round1(timeSeconds / 60 / (distanceMeters / 1000)),
    }));
}

/** Daily distance in km for the last `days` calendar days (user TZ), zero-filled. */
export function dailyDistanceSeries(acts: ActivitySummary[], days = 7, now: Date = new Date()): SeriesPoint[] {
  const byDay = new Map<string, number>();
  for (const a of acts) {
    const key = calendarDateKey(a.startTimeGmt);
    byDay.set(key, (byDay.get(key) ?? 0) + a.distance / 1000);
  }
  const out: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(now, -i);
    out.push({ name: formatDayLabel(d), value: round1(byDay.get(calendarDateKey(d)) ?? 0) });
  }
  return out;
}

/** Daily distance in km for the last 7 calendar days (user TZ), zero-filled. */
export function dailyTrainingLoad(acts: ActivitySummary[], now: Date = new Date()): SeriesPoint[] {
  return dailyDistanceSeries(acts, 7, now);
}

// ---------------------------------------------------------------------------
// Range + window helpers
// ---------------------------------------------------------------------------

/** Start of the selected KPI range; null for "all". */
export function rangeStartDate(range: DateRange, now: Date = new Date()): Date | null {
  switch (range) {
    case "week":
      return addDays(now, -7);
    case "month":
      return addDays(now, -30);
    case "all":
      return null;
  }
}

/** Start of the trailing window for trend charts (~6 months, covers weekly + monthly). */
export function trendWindowStart(now: Date = new Date()): Date {
  return addDays(now, -182);
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function sum(values: number[]): number {
  return values.reduce((s, x) => s + x, 0);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
