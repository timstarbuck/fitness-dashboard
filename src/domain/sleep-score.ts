import type { SleepSummary } from "./types";

// ---------------------------------------------------------------------------
// Derived sleep score (pure function over a stored sleep row)
// ---------------------------------------------------------------------------

/**
 * Garmin's dailySleep API returns only text feedback (no numeric score), so we
 * derive a 0-100 score from the stored components:
 *   - Duration:        40 pts, full at >=8h (linear below)
 *   - Deep sleep ratio: 25 pts, full in the 13-28% band
 *   - REM ratio:        20 pts, full in the 15-28% band
 *   - Awakenings:       15 pts, full at <=1, zero at >=9
 * Unmeasured components score neutral (half) rather than 0. Returns null when
 * the night has no measured duration at all.
 */
export function computeSleepScore(sleep: SleepSummary): number | null {
  const total = sleep.sleepTimeSeconds;
  if (total == null || total <= 0) return null;

  const hours = total / 3600;
  const durationPts = Math.min(hours / 8, 1) * 40;

  const deepRatio = sleep.deepSleepSeconds != null ? sleep.deepSleepSeconds / total : null;
  const remRatio = sleep.remSleepSeconds != null ? sleep.remSleepSeconds / total : null;

  const score =
    durationPts +
    ratioInBand(deepRatio, 0.13, 0.28) * 25 +
    ratioInBand(remRatio, 0.15, 0.28) * 20 +
    (sleep.awakeCount != null ? Math.max(0, 1 - Math.max(0, sleep.awakeCount - 1) / 8) : 0.5) * 15;

  return Math.round(Math.min(100, Math.max(0, score)));
}

/** 1 inside [lo, hi]; linear falloff to 0 one band-width outside; neutral (0.5) when unmeasured. */
function ratioInBand(ratio: number | null, lo: number, hi: number): number {
  if (ratio == null) return 0.5;
  if (ratio >= lo && ratio <= hi) return 1;
  const dist = ratio < lo ? lo - ratio : ratio - hi;
  return Math.max(0, 1 - dist / (hi - lo));
}
