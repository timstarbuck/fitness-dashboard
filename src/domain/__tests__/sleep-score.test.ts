import { describe, expect, it } from "@jest/globals";
import { computeSleepScore } from "../sleep-score";
import type { SleepSummary } from "../types";

function sleep(overrides: Partial<SleepSummary> = {}): SleepSummary {
  return {
    calendarDate: "2026-11-20",
    sleepTimeSeconds: 8 * 3600,
    deepSleepSeconds: null,
    remSleepSeconds: null,
    awakeCount: null,
    sleepScoreFeedback: null,
    ...overrides,
  };
}

describe("computeSleepScore", () => {
  it("returns null when the night has no measured duration", () => {
    expect(computeSleepScore(sleep({ sleepTimeSeconds: null }))).toBeNull();
    expect(computeSleepScore(sleep({ sleepTimeSeconds: 0 }))).toBeNull();
    expect(computeSleepScore(sleep({ sleepTimeSeconds: -10 }))).toBeNull();
  });

  it("scores a textbook night (8h, ideal deep/REM ratios, few awakenings) at 100", () => {
    const total = 8 * 3600;
    const score = computeSleepScore(
      sleep({ deepSleepSeconds: total * 0.2, remSleepSeconds: total * 0.22, awakeCount: 1 }),
    );
    expect(score).toBe(100); // 40 duration + 25 deep + 20 rem + 15 awake
  });

  it("scores a short, fragmented night much lower", () => {
    const total = 4 * 3600;
    const score = computeSleepScore(
      sleep({ sleepTimeSeconds: total, deepSleepSeconds: total * 0.1, remSleepSeconds: total * 0.12, awakeCount: 5 }),
    );
    // duration 20 + deep 20 (ratio 10%, one step outside band) + rem ~15.4 + awake 7.5 = 62.9
    expect(score).toBe(63);
  });

  it("treats unmeasured components as neutral (half credit)", () => {
    const score = computeSleepScore(sleep()); // 8h, everything else null
    expect(score).toBe(70); // 40 duration + 12.5 deep + 10 rem + 7.5 awake
  });

  it("falls off to zero for ratios one band-width outside the ideal range", () => {
    const total = 8 * 3600;
    // Deep ratio 43% is exactly one band-width (15pp) above the 13-28% band -> 0 pts.
    const score = computeSleepScore(
      sleep({ deepSleepSeconds: total * 0.43, remSleepSeconds: total * 0.2, awakeCount: 1 }),
    );
    expect(score).toBe(75); // 40 duration + 0 deep + 20 rem + 15 awake
  });

  it("never exceeds 100 or drops below 0", () => {
    const total = 12 * 3600; // long night, ideal ratios
    expect(computeSleepScore(sleep({ sleepTimeSeconds: total, deepSleepSeconds: total * 0.2, remSleepSeconds: total * 0.2, awakeCount: 0 }))).toBe(100);
    // 1h -> 5 duration pts; deep ratio 0% is just outside the band (~3.3); REM 0% and 20 awakenings -> 0
    expect(computeSleepScore(sleep({ sleepTimeSeconds: 3600, deepSleepSeconds: 0, remSleepSeconds: 0, awakeCount: 20 }))).toBe(8);
  });
});
