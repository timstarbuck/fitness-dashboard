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
// Range + window helpers
// ---------------------------------------------------------------------------

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}
