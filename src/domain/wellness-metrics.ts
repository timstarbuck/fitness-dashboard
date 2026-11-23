import { addDays, calendarDateKey, formatDayLabel } from "../lib/dates";
import { METERS_PER_MILE, isRunningActivity } from "../lib/formatting";
import type { ActivitySummary, DailySummary, HrSummary, SleepSummary } from "./types";
import { computeSleepScore } from "./sleep-score";

// ---------------------------------------------------------------------------
// Wellness series (pure functions over in-memory wellness rows)
// ---------------------------------------------------------------------------

/** One day of a wellness trend chart; `value` null = no data that day (chart renders a gap). */
export interface WellnessPoint {
  name: string;
  value: number | null;
}

/** One point of a correlation chart (e.g. sleep score vs pace). */
export interface CorrelationPoint {
  x: number;
  y: number;
  date?: string; // YYYY-MM-DD, for tooltips
  name?: string; // e.g. activity name, for tooltips
}

/**
 * Daily series over the trailing `days` calendar days (user TZ), oldest first.
 * Days without a row are null — wellness metrics have no meaningful zero, so
 * charts render gaps instead of dropping to the axis.
 */
export function dailyWellnessSeries(
  rows: Array<{ calendarDate: string; value: number | null }>,
  days = 30,
  now: Date = new Date(),
): WellnessPoint[] {
  const byDay = new Map<string, number | null>();
  for (const row of rows) byDay.set(row.calendarDate, row.value);

  const out: WellnessPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(now, -i);
    out.push({ name: formatDayLabel(d), value: byDay.get(calendarDateKey(d)) ?? null });
  }
  return out;
}

/** Derived sleep score per day (null where the night is unmeasured). */
export function sleepScoreSeries(sleepRows: SleepSummary[], days = 30, now: Date = new Date()): WellnessPoint[] {
  return dailyWellnessSeries(
    sleepRows.map((r) => ({ calendarDate: r.calendarDate, value: computeSleepScore(r) })),
    days,
    now,
  );
}

/** HRV per day (last-night value, falling back to the weekly average). */
export function hrvSeries(hrvRows: HrSummary[], days = 30, now: Date = new Date()): WellnessPoint[] {
  return dailyWellnessSeries(
    hrvRows.map((r) => ({ calendarDate: r.calendarDate, value: r.lastNightAvg ?? r.weeklyAvg })),
    days,
    now,
  );
}

/** Body battery (most recent value of the day) per day. */
export function bodyBatterySeries(rows: DailySummary[], days = 30, now: Date = new Date()): WellnessPoint[] {
  return dailyWellnessSeries(
    rows.map((r) => ({ calendarDate: r.calendarDate, value: r.bodyBatteryMostRecentValue })),
    days,
    now,
  );
}

/** Average stress level per day. */
export function stressSeries(rows: DailySummary[], days = 30, now: Date = new Date()): WellnessPoint[] {
  return dailyWellnessSeries(
    rows.map((r) => ({ calendarDate: r.calendarDate, value: r.averageStressLevel })),
    days,
    now,
  );
}

// ---------------------------------------------------------------------------
// Correlations (pure functions pairing wellness rows with activities)
// ---------------------------------------------------------------------------

/**
 * Pair each run with the sleep from the night before (a sleep row's calendar
 * date is the day its window ends, i.e. the morning of the run). Pace is in
 * min/mi; runs without distance/duration or a matching measured sleep are skipped.
 */
export function sleepVsPace(sleepRows: SleepSummary[], acts: ActivitySummary[]): CorrelationPoint[] {
  const sleepByDay = new Map(sleepRows.map((r) => [r.calendarDate, r]));
  const points: CorrelationPoint[] = [];

  for (const a of acts) {
    if (!isRunningActivity(a.activityType)) continue;
    if (!a.distance || !a.durationSeconds) continue;

    const sleep = sleepByDay.get(calendarDateKey(a.startTimeGmt));
    if (!sleep) continue;
    const score = computeSleepScore(sleep);
    if (score == null) continue;

    const pace = a.durationSeconds / 60 / (a.distance / METERS_PER_MILE);
    points.push({ x: score, y: round1(pace), date: calendarDateKey(a.startTimeGmt), name: a.activityName });
  }

  return points;
}

/** One day of the HRV-vs-training-load overlay. */
export interface HrvLoadPoint {
  name: string;
  load: number | null; // miles (0 = no activity that day)
  hrv: number | null; // ms
}

/**
 * Merge daily training load (miles) with HRV over the trailing `days` days,
 * plus the most recent HRV baseline for a reference line.
 */
export function hrvVsTrainingLoad(
  hrvRows: HrSummary[],
  acts: ActivitySummary[],
  days = 30,
  now: Date = new Date(),
): { points: HrvLoadPoint[]; baseline: number | null } {
  const loadByDay = new Map<string, number>();
  for (const a of acts) {
    const key = calendarDateKey(a.startTimeGmt);
    loadByDay.set(key, (loadByDay.get(key) ?? 0) + a.distance / METERS_PER_MILE);
  }

  const hrvByDay = new Map(hrvRows.map((r) => [r.calendarDate, r.lastNightAvg ?? r.weeklyAvg]));

  const points: HrvLoadPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(now, -i);
    const key = calendarDateKey(d);
    points.push({ name: formatDayLabel(d), load: round1(loadByDay.get(key) ?? 0), hrv: hrvByDay.get(key) ?? null });
  }

  // Rows arrive newest-first, so the first row with a baseline is the most recent.
  // balancedLow is the ms reference (Garmin's balanced-zone lower bound); markerValue is a normalized chart position.
  const baseline = hrvRows.map((r) => r.baselineBalancedLow).find((v) => v != null) ?? null;

  return { points, baseline };
}

/** Daily stress vs body battery (both from the same day's user summary). */
export function stressVsBodyBattery(rows: DailySummary[]): CorrelationPoint[] {
  return rows
    .filter((r) => r.averageStressLevel != null && r.bodyBatteryMostRecentValue != null)
    .map((r) => ({ x: r.averageStressLevel!, y: r.bodyBatteryMostRecentValue!, date: r.calendarDate }));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
