import { describe, expect, it } from "@jest/globals";
import { formatDuration, paceMinPerMile } from "../formatting";

describe("formatDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatDuration(5032)).toBe("1h 24m");
    expect(formatDuration(2700)).toBe("45m");
  });
});

describe("paceMinPerMile", () => {
  it("computes min/mi pace", () => {
    expect(paceMinPerMile(1609.344, 552)).toBe("9:12");
  });

  it("returns null when inputs are missing", () => {
    expect(paceMinPerMile(null, 300)).toBeNull();
    expect(paceMinPerMile(1609.344, null)).toBeNull();
  });
});
