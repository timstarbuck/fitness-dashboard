import { formatDuration } from "../lib/formatting";
import type { HrSummary, SleepSummary } from "./types";

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
    // baselineBalancedLow is the ms reference (Garmin's balanced-zone lower bound).
    // baselineMarkerValue is a normalized chart position (0-1), not ms — never compare against it.
    const baseline = hrv.baselineBalancedLow;
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
