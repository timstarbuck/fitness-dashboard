import { describe, expect, it } from "@jest/globals";
import { bodyBatterySeries, dailyWellnessSeries, hrvVsTrainingLoad, sleepScoreSeries, sleepVsPace, stressSeries, stressVsBodyBattery } from "../wellness-metrics";
import type { ActivitySummary, DailySummary, HrSummary, SleepSummary } from "../types";

// jest.setup.ts sets TIMEZONE=America/New_York (EDT in November, UTC-4).
const NOW = new Date("2026-11-20T12:00:00Z"); // 7:00 AM Nov 20 in New York

function sleepRow(calendarDate: string, overrides: Partial<SleepSummary> = {}): SleepSummary {
  return { calendarDate, sleepTimeSeconds: null, deepSleepSeconds: null, remSleepSeconds: null, awakeCount: null, sleepScoreFeedback: null, ...overrides };
}

function hrvRow(calendarDate: string, overrides: Partial<HrSummary> = {}): HrSummary {
  return { calendarDate, weeklyAvg: null, lastNightAvg: null, baselineBalancedLow: null, baselineMarkerValue: null, ...overrides };
}

function summaryRow(calendarDate: string, overrides: Partial<DailySummary> = {}): DailySummary {
  return { calendarDate, totalSteps: null, dailyStepGoal: null, totalKilocalories: null, activeKilocalories: null, restingHeartRate: null, bodyBatteryMostRecentValue: null, averageStressLevel: null, stressQualifier: null, ...overrides };
}

let idCounter = 0;
function act(overrides: Partial<ActivitySummary> = {}): ActivitySummary {
  idCounter += 1;
  return {
    id: `act-${idCounter}`,
    activityName: "Morning Run",
    activityType: "Run",
    startTimeGmt: new Date("2026-11-19T15:00:00Z"), // 10:00 AM Nov 19 in New York
    distance: 8000,
    durationSeconds: 3600,
    elevationGain: null,
    elevationLoss: null,
    avgHeartRate: 150,
    maxHeartRate: 170,
    calories: null,
    ...overrides,
  };
}

describe("dailyWellnessSeries", () => {
  it("fills every day in the window, oldest first, with null for missing days", () => {
    const series = dailyWellnessSeries(
      [
        { calendarDate: "2026-11-20", value: 5 },
        { calendarDate: "2026-11-18", value: 7 },
      ],
      3,
      NOW,
    );
    expect(series).toHaveLength(3);
    // Nov 18 -> 7, Nov 19 (no row) -> null, Nov 20 -> 5
    expect(series.map((p) => p.value)).toEqual([7, null, 5]);
    expect(series[0].name).not.toBe(series[2].name); // distinct day labels
  });

  it("keeps explicit null values as gaps (not zeros)", () => {
    const series = dailyWellnessSeries([{ calendarDate: "2026-11-20", value: null }], 1, NOW);
    expect(series[0].value).toBeNull();
  });
});

describe("sleepScoreSeries", () => {
  it("derives a score per day and nulls unmeasured nights", () => {
    const total = 8 * 3600;
    const series = sleepScoreSeries(
      [
        // 8h, ideal ratios -> 100
        sleepRow("2026-11-20", { sleepTimeSeconds: total, deepSleepSeconds: total * 0.2, remSleepSeconds: total * 0.22, awakeCount: 1 }),
        // No duration -> null
        sleepRow("2026-11-19"),
      ],
      3,
      NOW,
    );
    expect(series.map((p) => p.value)).toEqual([null, null, 100]);
  });
});

describe("hrvVsTrainingLoad", () => {
  it("merges daily miles with HRV and picks the most recent baseline", () => {
    const acts = [
      act({ startTimeGmt: new Date("2026-11-19T15:00:00Z"), distance: 8000 }), // Nov 19 NY
      act({ startTimeGmt: new Date("2026-11-19T18:00:00Z"), distance: 2000 }), // same day
    ];
    const hrvRows = [
      hrvRow("2026-11-20", { lastNightAvg: 95, baselineBalancedLow: 80 }), // newest first
      hrvRow("2026-11-19", { lastNightAvg: 70, baselineBalancedLow: 75 }),
    ];

    const { points, baseline } = hrvVsTrainingLoad(hrvRows, acts, 3, NOW);

    expect(points).toHaveLength(3);
    // Nov 18: no activity (0 mi), no HRV; Nov 19: ~6.2 mi + 70ms; Nov 20: no activity + 95ms
    expect(points[1].load).toBe(6.2);
    expect(points[1].hrv).toBe(70);
    expect(points[2].load).toBe(0);
    expect(points[2].hrv).toBe(95);
    expect(baseline).toBe(80); // from the most recent row
  });

  it("returns a null baseline when no row has one", () => {
    const { baseline } = hrvVsTrainingLoad([hrvRow("2026-11-20", { lastNightAvg: 90 })], [], 7, NOW);
    expect(baseline).toBeNull();
  });
});

describe("sleepVsPace", () => {
  it("pairs each run with the sleep from the night before (run's calendar day)", () => {
    const total = 8 * 3600;
    // Sleep recorded for Nov 19 (the night ending on the morning of the run).
    const sleepRows = [sleepRow("2026-11-19", { sleepTimeSeconds: total, deepSleepSeconds: total * 0.2, remSleepSeconds: total * 0.22, awakeCount: 1 })];
    // 8 km in 60 min -> pace = 60 / (8/1.60934) ≈ 12.1 min/mi
    const acts = [act({ startTimeGmt: new Date("2026-11-19T15:00:00Z"), distance: 8000, durationSeconds: 3600 })];

    const points = sleepVsPace(sleepRows, acts);
    expect(points).toHaveLength(1);
    expect(points[0].x).toBe(100); // textbook sleep score
    expect(points[0].y).toBeCloseTo(12.1, 1);
    expect(points[0].date).toBe("2026-11-19");
  });

  it("skips non-running activities, runs without a matching sleep, and unmeasured sleeps", () => {
    const total = 8 * 3600;
    const sleepRows = [sleepRow("2026-11-19", { sleepTimeSeconds: total, deepSleepSeconds: total * 0.2, remSleepSeconds: total * 0.22, awakeCount: 1 })];
    const acts = [
      act({ activityType: "Bike" }), // not a run
      act({ startTimeGmt: new Date("2026-11-18T15:00:00Z") }), // no sleep row for Nov 18
      act({ startTimeGmt: new Date("2026-11-19T15:00:00Z"), distance: 8000, durationSeconds: 3600 }), // matches
    ];

    const points = sleepVsPace(sleepRows, acts);
    expect(points).toHaveLength(1);
    expect(points[0].date).toBe("2026-11-19");
  });

  it("skips runs with missing distance or duration", () => {
    const total = 8 * 3600;
    const sleepRows = [sleepRow("2026-11-19", { sleepTimeSeconds: total, deepSleepSeconds: total * 0.2, remSleepSeconds: total * 0.22, awakeCount: 1 })];
    const acts = [act({ distance: 0 }), act({ durationSeconds: 0 })];
    expect(sleepVsPace(sleepRows, acts)).toHaveLength(0);
  });
});

describe("stressVsBodyBattery", () => {
  it("keeps only days that have both values", () => {
    const rows = [
      summaryRow("2026-11-20", { averageStressLevel: 45, bodyBatteryMostRecentValue: 62 }),
      summaryRow("2026-11-19", { averageStressLevel: 30 }), // no battery
      summaryRow("2026-11-18", { bodyBatteryMostRecentValue: 80 }), // no stress
    ];

    const points = stressVsBodyBattery(rows);
    expect(points).toHaveLength(1);
    expect(points[0]).toEqual({ x: 45, y: 62, date: "2026-11-20" });
  });
});

describe("bodyBatterySeries / stressSeries", () => {
  it("maps the right column per day, null where missing", () => {
    const rows = [summaryRow("2026-11-20", { bodyBatteryMostRecentValue: 55, averageStressLevel: 40 })];
    expect(bodyBatterySeries(rows, 2, NOW).map((p) => p.value)).toEqual([null, 55]);
    expect(stressSeries(rows, 2, NOW).map((p) => p.value)).toEqual([null, 40]);
  });

  it("uses the user's timezone for day boundaries", () => {
    // 03:00 UTC is still Nov 19 in New York (UTC-4), so the 1-day window ends on Nov 19.
    const nyEvening = new Date("2026-11-20T03:00:00Z");
    const rows = [summaryRow("2026-11-19", { bodyBatteryMostRecentValue: 55 })];
    const series = bodyBatterySeries(rows, 1, nyEvening);
    expect(series[0].value).toBe(55);
  });
});
