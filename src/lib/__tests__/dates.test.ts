import { describe, expect, it } from "@jest/globals";
import { calendarDateKey, isoWeekKey, monthKey, yearKey } from "../dates";

// jest.setup.ts sets TIMEZONE=America/New_York (EDT in November, UTC-4).
const NOW = new Date("2026-11-20T12:00:00Z"); // 7:00 AM Nov 20 in New York

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

  it("yearKey uses the user timezone", () => {
    expect(yearKey(new Date("2026-12-31T23:00:00Z"))).toBe("2026"); // 6 PM Dec 31 in NY
    expect(yearKey(new Date("2027-01-01T03:00:00Z"))).toBe("2026"); // 11 PM Dec 31 in NY
  });
});
