import { describe, expect, it } from "@jest/globals";
import {
  computeReadiness,
  dailyDistanceSeries,
  formatDuration,
  isoWeekKey,
  monthKey,
  calendarDateKey,
  paceMinPerKm,
  weeklyElevation,
  weeklyMileage,
  weeklyPaceTrend,
  monthlyMileage,
  type ActivitySummary,
} from "../fitness-data";

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

describe("date helpers (America/New_York)", () => {
  it("calendarDateKey uses the user timezone", () => {
    expect(calendarDateKey(NOW)).toBe("2026-11-20");
    // 23:30 UTC Nov 19 is still Nov 19 in New York
    expect(calendarDateKey(new Date("2026-11-19T23:30:00Z"))).toBe("2026-11-19");
    // 01:30 UTC Nov 20 is still Nov 19 (9:30 PM) in New York
    expect(calendarDateKey(new Date("2026-11-20T01:30:00Z"))).toBe("2026-11-19");
  });

  it("isoWeekKey groups by ISO week", () => {
    // Nov 19, 2026 is a Thursday; Nov 17 (Tue) is in the same ISO week
    expect(isoWeekKey(new Date("2026-11-19T15:00:00Z"))).toBe(isoWeekKey(new Date("2026-11-17T15:00:00Z")));
    // Nov 24 is in the following ISO week -> different key
    expect(isoWeekKey(new Date("2026-11-24T15:00:00Z"))).not.toBe(isoWeekKey(new Date("2026-11-19T15:00:00Z")));
  });

  it("monthKey uses the user timezone", () => {
    expect(monthKey(new Date("2026-11-30T23:00:00Z"))).toBe("2026-11"); // 6 PM Nov 30 in NY
    expect(monthKey(new Date("2026-12-01T03:00:00Z"))).toBe("2026-11"); // 11 PM Nov 30 in NY
  });
});

describe("formatDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatDuration(5032)).toBe("1h 24m");
    expect(formatDuration(2700)).toBe("45m");
  });
});

describe("paceMinPerKm", () => {
  it("computes min/km pace", () => {
    expect(paceMinPerKm(1000, 332)).toBe("5:32");
  });

  it("returns null when inputs are missing", () => {
    expect(paceMinPerKm(null, 300)).toBeNull();
    expect(paceMinPerKm(1000, null)).toBeNull();
  });
});

describe("computeReadiness", () => {
  it("returns no-data when there is neither HRV nor sleep", () => {
    const r = computeReadiness(null, null);
    expect(r.status).toBe("no-data");
    expect(r.label).toBe("NO DATA");
  });

  it("is ready when HRV is above baseline and sleep is long", () => {
    const r = computeReadiness(
      { calendarDate: "2026-11-20", weeklyAvg: 90, lastNightAvg: 100, baselineBalancedLow: null, baselineMarkerValue: 80 },
      { calendarDate: "2026-11-20", sleepTimeSeconds: 7 * 3600 + 1200 },
    );
    expect(r.status).toBe("ready");
    expect(r.label).toBe("READY TO TRAIN");
  });

  it("suggests an easy day for mixed recovery", () => {
    const r = computeReadiness(
      { calendarDate: "2026-11-20", weeklyAvg: null, lastNightAvg: 70, baselineBalancedLow: null, baselineMarkerValue: 80 },
      { calendarDate: "2026-11-20", sleepTimeSeconds: 6 * 3600 + 1800 },
    );
    expect(r.status).toBe("caution");
  });

  it("recommends rest when HRV is well below baseline and sleep is short", () => {
    const r = computeReadiness(
      { calendarDate: "2026-11-20", weeklyAvg: null, lastNightAvg: 50, baselineBalancedLow: null, baselineMarkerValue: 80 },
      { calendarDate: "2026-11-20", sleepTimeSeconds: 5 * 3600 },
    );
    expect(r.status).toBe("rest");
  });

  it("treats HRV without a baseline as neutral", () => {
    const r = computeReadiness(
      { calendarDate: "2026-11-20", weeklyAvg: null, lastNightAvg: 90, baselineBalancedLow: null, baselineMarkerValue: null },
      { calendarDate: "2026-11-20", sleepTimeSeconds: 8 * 3600 },
    );
    expect(r.status).toBe("ready"); // 0.5 (no baseline) + 1 (8h sleep) = 1.5
  });

  it("falls back to weeklyAvg when lastNightAvg is missing", () => {
    const r = computeReadiness(
      { calendarDate: "2026-11-20", weeklyAvg: 85, lastNightAvg: null, baselineBalancedLow: null, baselineMarkerValue: 80 },
      { calendarDate: "2026-11-20", sleepTimeSeconds: 7 * 3600 },
    );
    expect(r.status).toBe("ready"); // 85/80 >= 1 -> +1, plus 7h sleep -> +1
  });

  it("handles missing sleep data with HRV only", () => {
    const r = computeReadiness(
      { calendarDate: "2026-11-20", weeklyAvg: null, lastNightAvg: 100, baselineBalancedLow: null, baselineMarkerValue: 80 },
      null,
    );
    expect(r.status).toBe("caution"); // 1 point from HRV only
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
    expect(series[28].value).toBe(10); // 8km + 2km
    expect(series[26].value).toBe(5); // Nov 17
    // Days with no activity are zero-filled
    expect(series[0].value).toBe(0);
  });

  it("respects the requested number of days", () => {
    expect(dailyDistanceSeries([], 7, NOW)).toHaveLength(7);
    expect(dailyDistanceSeries([], 30, NOW)).toHaveLength(30);
  });
});

describe("weeklyMileage", () => {
  it("sums distance per ISO week in km, sorted chronologically", () => {
    const acts = [
      act({ startTimeGmt: new Date("2026-11-19T15:00:00Z"), distance: 8000 }),
      act({ startTimeGmt: new Date("2026-11-17T15:00:00Z"), distance: 2000 }), // same week
      act({ startTimeGmt: new Date("2026-11-10T15:00:00Z"), distance: 12000 }), // previous week
    ];
    const series = weeklyMileage(acts);
    expect(series).toHaveLength(2);
    expect(series[0].value).toBe(12); // older week first
    expect(series[1].value).toBe(10);
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
    expect(series[1].value).toBe(8);
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
      act({ startTimeGmt: new Date("2026-11-19T15:00:00Z"), distance: 8000, durationSeconds: 3600 }), // 7.5 min/km
      act({ startTimeGmt: new Date("2026-11-18T15:00:00Z"), activityType: "Bike", distance: 30000, durationSeconds: 5400 }), // excluded
    ];
    const series = weeklyPaceTrend(acts);
    expect(series).toHaveLength(1);
    expect(series[0].value).toBeCloseTo(7.5, 5);
  });

  it("excludes weeks with no runnable distance", () => {
    const acts = [act({ startTimeGmt: new Date("2026-11-19T15:00:00Z"), activityType: "Yoga", distance: 0, durationSeconds: 1800 })];
    expect(weeklyPaceTrend(acts)).toHaveLength(0);
  });
});
