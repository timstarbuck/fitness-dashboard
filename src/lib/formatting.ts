// ---------------------------------------------------------------------------
// Formatting helpers for display values
// ---------------------------------------------------------------------------

/** e.g. 5032 -> "1h 23m", 2700 -> "45m". */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Meters in one statute mile. */
export const METERS_PER_MILE = 1609.344;

/** Pace in min/mi (e.g. "9:12") from distance (m) + duration (s); null when not computable. */
export function paceMinPerMile(distanceMeters: number | null, durationSeconds: number | null): string | null {
  if (!distanceMeters || !durationSeconds) return null;
  const secPerMile = durationSeconds / (distanceMeters / METERS_PER_MILE);
  const m = Math.floor(secPerMile / 60);
  const s = Math.round(secPerMile % 60);
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
