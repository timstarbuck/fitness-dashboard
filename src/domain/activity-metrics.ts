import { addDays, calendarDateKey, formatDayLabel, isoWeekKey, monthKey } from "../lib/dates";
import { METERS_PER_MILE, isRunningActivity } from "../lib/formatting";
import type { ActivitySummary, DistanceUnit } from "./types";

// ---------------------------------------------------------------------------
// Aggregations (pure functions over in-memory activity rows)
// ---------------------------------------------------------------------------

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

/** Distance in the requested unit (meters pass through; miles divide by METERS_PER_MILE). */
function distanceInUnit(meters: number, unit: DistanceUnit): number {
  return unit === "miles" ? meters / METERS_PER_MILE : meters;
}

/** Weekly distance, in miles by default (meters for rowing). */
export function weeklyMileage(acts: ActivitySummary[], unit: DistanceUnit = "miles"): SeriesPoint[] {
  return toSeries(acts, (a) => isoWeekKey(a.startTimeGmt), (a) => distanceInUnit(a.distance ?? 0, unit));
}

/** Monthly distance, in miles by default (meters for rowing). */
export function monthlyMileage(acts: ActivitySummary[], unit: DistanceUnit = "miles"): SeriesPoint[] {
  return toSeries(acts, (a) => monthKey(a.startTimeGmt), (a) => distanceInUnit(a.distance ?? 0, unit));
}

/** Weekly elevation gain in meters. */
export function weeklyElevation(acts: ActivitySummary[]): SeriesPoint[] {
  return toSeries(acts, (a) => isoWeekKey(a.startTimeGmt), (a) => a.elevationGain ?? 0);
}

/** Weekly average pace in min/mi, running activities only. */
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
      value: round1(timeSeconds / 60 / (distanceMeters / METERS_PER_MILE)),
    }));
}

/** Daily distance in miles for the last `days` calendar days (user TZ), zero-filled. */
export function dailyDistanceSeries(acts: ActivitySummary[], days = 7, now: Date = new Date()): SeriesPoint[] {
  const byDay = new Map<string, number>();
  for (const a of acts) {
    const key = calendarDateKey(a.startTimeGmt);
    byDay.set(key, (byDay.get(key) ?? 0) + a.distance / METERS_PER_MILE);
  }
  const out: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(now, -i);
    out.push({ name: formatDayLabel(d), value: round1(byDay.get(calendarDateKey(d)) ?? 0) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Range + window helpers
// ---------------------------------------------------------------------------

export type DateRange = "week" | "month" | "all";

/** Start of the selected KPI range; null for "all". The dashboard queries an inclusive [start, today] window, so the offset is one less than the day count (e.g. -6 → 7 days). */
export function rangeStartDate(range: DateRange, now: Date = new Date()): Date | null {
  switch (range) {
    case "week":
      return addDays(now, -6); // 7 calendar days including today
    case "month":
      return addDays(now, -30); // trailing ~1 month including today
    case "all":
      return null;
  }
}

/** Start of the trailing window for trend charts (~6 months, covers weekly + monthly). */
export function trendWindowStart(now: Date = new Date()): Date {
  return addDays(now, -182);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
