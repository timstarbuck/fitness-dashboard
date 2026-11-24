import type { ActivitySummary, DistanceUnit } from "./types";

// ---------------------------------------------------------------------------
// Activity-type normalization for filtering + display.
//
// Garmin reports a sport `typeKey` (e.g. "running", "treadmill_running"). Some
// keys are the same user-facing activity, so we collapse them to one canonical
// key for filtering and derive a proper-case label for the UI.
// ---------------------------------------------------------------------------

/** Garmin typeKeys that map to the same user-facing activity as another key. */
const TYPE_ALIASES: Record<string, string> = {
  treadmill_running: "running",
  indoor_rowing: "rowing",
};

/** Canonical activity-type key, case-insensitive (e.g. running + treadmill_running -> "running"). */
export function canonicalActivityType(type: string | null | undefined): string {
  const key = (type ?? "").trim().toLowerCase();
  return TYPE_ALIASES[key] ?? key;
}

/** Proper-case display label for a type (e.g. "indoor_cycling" -> "Indoor Cycling"). */
export function activityTypeLabel(type: string | null | undefined): string {
  return canonicalActivityType(type)
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Distance unit for a type: rowing is measured in meters, everything else in miles. */
export function distanceUnitForType(type: string | null): DistanceUnit {
  return canonicalActivityType(type) === "rowing" ? "meters" : "miles";
}

/** Activities of one canonical type; null / "" / "all" returns the input unchanged. */
export function filterByActivityType(acts: ActivitySummary[], type: string | null): ActivitySummary[] {
  if (!type || type === "all") return acts;
  return acts.filter((a) => canonicalActivityType(a.activityType) === type);
}

/** Distinct canonical types present in the data, sorted for a stable dropdown order. */
export function distinctActivityTypes(acts: ActivitySummary[]): string[] {
  const set = new Set<string>();
  for (const a of acts) {
    const key = canonicalActivityType(a.activityType);
    if (key) set.add(key);
  }
  return [...set].sort();
}
