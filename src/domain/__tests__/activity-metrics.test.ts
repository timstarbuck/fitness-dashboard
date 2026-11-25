import { describe, expect, it } from "@jest/globals";
import { dailyDistanceSeries, monthlyMileage, rangeStartDate, weeklyElevation, weeklyMileage, weeklyPaceTrend, yearlyMileage } from "../activity-metrics";
import { calendarDateKey } from "../../lib/dates";
import type { ActivitySummary } from "../types";

// jest.setup.ts sets TIMEZONE=America/New_York (EDT in November, UTC-4).
const NOW = new Date("2026-11-20T12:00:00Z"); // 7:00 AM Nov 20 in New York

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

describe("rangeStartDate", () => {
  // Inclusive calendar-day span between two YYYY-MM-DD keys (timezone-independent).
  function inclusiveDays(startKey: string, endKey: string): number {
    const start = Date.parse(`${startKey}T00:00:00Z`);
    const end = Date.parse(`${endKey}T00:00:00Z`);
    return Math.round((end - start) / 86400000) + 1;
  }

  it("week covers exactly 7 calendar days including today", () => {
    const start = rangeStartDate("week", NOW);
    expect(start).not.toBeNull();
    expect(inclusiveDays(calendarDateKey(start!), calendarDateKey(NOW))).toBe(7);
  });

  it("all is unbounded (null start)", () => {
    expect(rangeStartDate("all", NOW)).toBeNull();
  });
});

describe("dailyDistanceSeries", () => {
  it("zero-fills every day in the window and sums same-day activities", () => {
    const acts = [
      act({ startTimeGmt: new Date("2026-11-19T15:00:00Z"), distance: 8000 }), // Nov 19 NY
      act({ startTimeGmt: new Date("2026-11-19T18:00:00Z"), distance: 2000 }), // same NY day
      act({ startTimeGmt: new Date("2026-11-17T15:00:00Z"), distance: 5000 }), // Nov 17 NY
    ];
    const series = dailyDistanceSeries(acts, 30, NOW);
    expect(series).toHaveLength(30);
    // Nov 19 is the second-to-last slot (Nov 20 last)
    expect(series[28].value).toBe(6.2); // 10 km ≈ 6.2 mi
    expect(series[26].value).toBe(3.1); // Nov 17 (5 km ≈ 3.1 mi)
    // Days with no activity are zero-filled
    expect(series[0].value).toBe(0);
  });

  it("respects the requested number of days", () => {
    expect(dailyDistanceSeries([], 7, NOW)).toHaveLength(7);
    expect(dailyDistanceSeries([], 30, NOW)).toHaveLength(30);
  });
});

describe("weeklyMileage", () => {
  it("sums distance per ISO week in miles, sorted chronologically", () => {
    const acts = [
      act({ startTimeGmt: new Date("2026-11-19T15:00:00Z"), distance: 8000 }),
      act({ startTimeGmt: new Date("2026-11-17T15:00:00Z"), distance: 2000 }), // same week
      act({ startTimeGmt: new Date("2026-11-10T15:00:00Z"), distance: 12000 }), // previous week
    ];
    const series = weeklyMileage(acts);
    expect(series).toHaveLength(2);
    expect(series[0].value).toBe(7.5); // 12 km ≈ 7.5 mi, older week first
    expect(series[1].value).toBe(6.2); // 10 km ≈ 6.2 mi
  });

  it("returns raw meters when unit is 'meters' (rowing)", () => {
    const acts = [act({ startTimeGmt: new Date("2026-11-19T15:00:00Z"), distance: 8000 })];
    expect(weeklyMileage(acts, "meters")[0].value).toBe(8000); // meters pass through, not divided
  });
});

describe("monthlyMileage", () => {
  it("sums distance per calendar month, sorted chronologically", () => {
    const acts = [
      act({ startTimeGmt: new Date("2026-11-19T15:00:00Z"), distance: 8000 }),
      act({ startTimeGmt: new Date("2026-10-05T15:00:00Z"), distance: 4000 }),
    ];
    const series = monthlyMileage(acts);
    expect(series.map((p) => p.name)).toEqual(["2026-10", "2026-11"]);
    expect(series[1].value).toBe(5); // 8 km ≈ 5 mi
  });
});

describe("yearlyMileage", () => {
  it("sums distance per calendar year, sorted chronologically", () => {
    const acts = [
      act({ startTimeGmt: new Date("2026-11-19T15:00:00Z"), distance: 8000 }), // Nov 2026
      act({ startTimeGmt: new Date("2025-12-31T15:00:00Z"), distance: 4000 }), // Dec 2025
      act({ startTimeGmt: new Date("2026-01-05T15:00:00Z"), distance: 2000 }), // Jan 2026, same year
    ];
    const series = yearlyMileage(acts);
    expect(series.map((p) => p.name)).toEqual(["2025", "2026"]);
    expect(series[0].value).toBe(2.5); // 4 km ≈ 2.5 mi
    expect(series[1].value).toBe(6.2); // 8 km + 2 km = 10 km ≈ 6.2 mi
  });

  it("returns raw meters when unit is 'meters' (rowing)", () => {
    const acts = [act({ startTimeGmt: new Date("2026-11-19T15:00:00Z"), distance: 8000 })];
    expect(yearlyMileage(acts, "meters")[0].value).toBe(8000); // meters pass through, not divided
  });
});

describe("weeklyElevation", () => {
  it("sums elevation gain per week, ignoring nulls", () => {
    const acts = [
      act({ startTimeGmt: new Date("2026-11-19T15:00:00Z"), elevationGain: 320 }),
      act({ startTimeGmt: new Date("2026-11-18T15:00:00Z"), elevationGain: null }),
    ];
    const series = weeklyElevation(acts);
    expect(series).toHaveLength(1);
    expect(series[0].value).toBe(320);
  });
});

describe("weeklyPaceTrend", () => {
  it("averages pace over running activities only, per week", () => {
    const acts = [
      act({ startTimeGmt: new Date("2026-11-19T15:00:00Z"), distance: 8000, durationSeconds: 3600 }), // ~12.1 min/mi
      act({ startTimeGmt: new Date("2026-11-18T15:00:00Z"), activityType: "Bike", distance: 30000, durationSeconds: 5400 }), // excluded
    ];
    const series = weeklyPaceTrend(acts);
    expect(series).toHaveLength(1);
    expect(series[0].value).toBe(12.1);
  });

  it("excludes weeks with no runnable distance", () => {
    const acts = [act({ startTimeGmt: new Date("2026-11-19T15:00:00Z"), activityType: "Yoga", distance: 0, durationSeconds: 1800 })];
    expect(weeklyPaceTrend(acts)).toHaveLength(0);
  });
});
