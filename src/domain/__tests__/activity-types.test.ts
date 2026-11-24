import { describe, expect, it } from "@jest/globals";
import { activityTypeLabel, canonicalActivityType, distanceUnitForType, distinctActivityTypes, filterByActivityType } from "../activity-types";
import type { ActivitySummary } from "../types";

let idCounter = 0;
function act(overrides: Partial<ActivitySummary> = {}): ActivitySummary {
  idCounter += 1;
  return {
    id: `act-${idCounter}`,
    activityName: "Activity",
    activityType: "running",
    startTimeGmt: new Date("2026-11-19T15:00:00Z"),
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

describe("canonicalActivityType", () => {
  it("groups treadmill_running with running", () => {
    expect(canonicalActivityType("treadmill_running")).toBe("running");
  });

  it("is case-insensitive", () => {
    expect(canonicalActivityType("Running")).toBe("running");
    expect(canonicalActivityType("ROWING")).toBe("rowing");
  });

  it("passes through other types unchanged", () => {
    expect(canonicalActivityType("cycling")).toBe("cycling");
  });

  it("returns an empty string for null/blank input", () => {
    expect(canonicalActivityType(null)).toBe("");
    expect(canonicalActivityType("   ")).toBe("");
  });
});

describe("activityTypeLabel", () => {
  it("uses proper case for single-word keys", () => {
    expect(activityTypeLabel("running")).toBe("Running");
    expect(activityTypeLabel("rowing")).toBe("Rowing");
  });

  it("title-cases each word of snake_case keys", () => {
    expect(activityTypeLabel("indoor_cycling")).toBe("Indoor Cycling");
  });

  it("labels grouped aliases by their canonical name", () => {
    expect(activityTypeLabel("treadmill_running")).toBe("Running");
  });
});

describe("distanceUnitForType", () => {
  it("uses meters for rowing", () => {
    expect(distanceUnitForType("rowing")).toBe("meters");
  });

  it("uses miles for other types and the default (null)", () => {
    expect(distanceUnitForType("running")).toBe("miles");
    expect(distanceUnitForType(null)).toBe("miles");
  });
});

describe("filterByActivityType", () => {
  it("returns all activities for null / 'all'", () => {
    const acts = [act({ activityType: "running" }), act({ activityType: "rowing" })];
    expect(filterByActivityType(acts, null)).toHaveLength(2);
    expect(filterByActivityType(acts, "all")).toHaveLength(2);
  });

  it("groups treadmill_running with running", () => {
    const acts = [act({ activityType: "running" }), act({ activityType: "treadmill_running" }), act({ activityType: "rowing" })];
    expect(filterByActivityType(acts, "running")).toHaveLength(2); // both running variants, not rowing
  });

  it("excludes non-matching types", () => {
    const acts = [act({ activityType: "running" }), act({ activityType: "rowing" })];
    expect(filterByActivityType(acts, "rowing")).toHaveLength(1);
  });
});

describe("distinctActivityTypes", () => {
  it("dedupes aliases and sorts the result", () => {
    const acts = [act({ activityType: "treadmill_running" }), act({ activityType: "running" }), act({ activityType: "rowing" })];
    // lexicographic sort: "rowing" < "running"; the two running variants collapse to one
    expect(distinctActivityTypes(acts)).toEqual(["rowing", "running"]);
  });

  it("omits activities with no type", () => {
    const acts = [act({ activityType: "running" }), act({ activityType: "" })];
    expect(distinctActivityTypes(acts)).toEqual(["running"]);
  });
});
