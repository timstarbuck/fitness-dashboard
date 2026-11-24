import { describe, expect, it } from "@jest/globals";
import { computeReadiness } from "../readiness";
import type { SleepSummary } from "../types";

function sleep(seconds: number): SleepSummary {
  return { calendarDate: "2026-11-20", sleepTimeSeconds: seconds, deepSleepSeconds: null, remSleepSeconds: null, awakeCount: null, sleepScoreFeedback: null };
}

describe("computeReadiness", () => {
  it("returns no-data when there is neither HRV nor sleep", () => {
    const r = computeReadiness(null, null);
    expect(r.status).toBe("no-data");
    expect(r.label).toBe("NO DATA");
  });

  it("is ready when HRV is above baseline and sleep is long", () => {
    const r = computeReadiness(
      // 100/80 >= 1 -> +1, plus 7h20m sleep -> +1
      { calendarDate: "2026-11-20", weeklyAvg: 90, lastNightAvg: 100, baselineBalancedLow: 80, baselineMarkerValue: null },
      sleep(7 * 3600 + 1200),
    );
    expect(r.status).toBe("ready");
    expect(r.label).toBe("READY TO TRAIN");
  });

  it("suggests an easy day for mixed recovery", () => {
    const r = computeReadiness(
      // 70/80 within 20% below -> +0.5, plus 6h30m sleep -> +0.5
      { calendarDate: "2026-11-20", weeklyAvg: null, lastNightAvg: 70, baselineBalancedLow: 80, baselineMarkerValue: null },
      sleep(6 * 3600 + 1800),
    );
    expect(r.status).toBe("caution");
  });

  it("recommends rest when HRV is well below baseline and sleep is short", () => {
    const r = computeReadiness(
      // 50/80 more than 20% below -> 0, plus <6h sleep -> 0
      { calendarDate: "2026-11-20", weeklyAvg: null, lastNightAvg: 50, baselineBalancedLow: 80, baselineMarkerValue: null },
      sleep(5 * 3600),
    );
    expect(r.status).toBe("rest");
  });

  it("treats HRV without a baseline as neutral", () => {
    const r = computeReadiness(
      { calendarDate: "2026-11-20", weeklyAvg: null, lastNightAvg: 90, baselineBalancedLow: null, baselineMarkerValue: null },
      sleep(8 * 3600),
    );
    expect(r.status).toBe("ready"); // 0.5 (no baseline) + 1 (8h sleep) = 1.5
  });

  it("falls back to weeklyAvg when lastNightAvg is missing", () => {
    const r = computeReadiness(
      // 85/80 >= 1 -> +1, plus 7h sleep -> +1
      { calendarDate: "2026-11-20", weeklyAvg: 85, lastNightAvg: null, baselineBalancedLow: 80, baselineMarkerValue: null },
      sleep(7 * 3600),
    );
    expect(r.status).toBe("ready");
  });

  it("handles missing sleep data with HRV only", () => {
    const r = computeReadiness(
      // 100/80 >= 1 -> +1 from HRV only
      { calendarDate: "2026-11-20", weeklyAvg: null, lastNightAvg: 100, baselineBalancedLow: 80, baselineMarkerValue: null },
      null,
    );
    expect(r.status).toBe("caution"); // 1 point from HRV only
  });

  it("ignores the normalized markerValue (a chart position, not ms)", () => {
    const r = computeReadiness(
      // markerValue 0.625 must not be treated as a 0.6ms baseline; balancedLow is the ms reference.
      { calendarDate: "2026-11-20", weeklyAvg: null, lastNightAvg: 47, baselineBalancedLow: 39, baselineMarkerValue: 0.625 },
      sleep(7 * 3600),
    );
    expect(r.status).toBe("ready"); // 47/39 >= 1 -> +1, plus 7h sleep -> +1
    expect(r.detail).toContain("at/above baseline");
  });
});
