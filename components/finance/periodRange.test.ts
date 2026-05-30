import { describe, expect, it } from "vitest";
import { isAtLatest, labelFor, rangeFor, shiftAnchor, todayIso } from "./periodRange";

// A fixed "now" so cap-at-today behavior is deterministic.
const NOW = new Date(2026, 4, 30); // 2026-05-30 (local)

describe("rangeFor", () => {
  it("month: full calendar month for a past month (no cap)", () => {
    expect(rangeFor("month", new Date(2026, 2, 15), NOW)).toEqual({ from: "2026-03-01", to: "2026-03-31" });
  });

  it("month: caps the current month at today", () => {
    expect(rangeFor("month", new Date(2026, 4, 10), NOW)).toEqual({ from: "2026-05-01", to: "2026-05-30" });
  });

  it("quarter: Q2 from a May anchor, capped at today", () => {
    expect(rangeFor("quarter", new Date(2026, 4, 10), NOW)).toEqual({ from: "2026-04-01", to: "2026-05-30" });
  });

  it("quarter: full past quarter Q1", () => {
    expect(rangeFor("quarter", new Date(2026, 0, 5), NOW)).toEqual({ from: "2026-01-01", to: "2026-03-31" });
  });

  it("year: current year accumulates to-date (Jan 1 -> today)", () => {
    expect(rangeFor("year", new Date(2026, 7, 1), NOW)).toEqual({ from: "2026-01-01", to: "2026-05-30" });
  });

  it("year: full past year is not capped", () => {
    expect(rangeFor("year", new Date(2025, 7, 1), NOW)).toEqual({ from: "2025-01-01", to: "2025-12-31" });
  });

  it("never produces a future `to` and never from > to across reachable states", () => {
    for (const g of ["month", "quarter", "year"] as const) {
      let anchor = new Date(NOW);
      // Walk backward and forward (forward only where isAtLatest permits stepping).
      for (let i = 0; i < 18; i++) {
        const r = rangeFor(g, anchor, NOW);
        expect(r.to <= todayIso(NOW)).toBe(true);
        expect(r.from <= r.to).toBe(true);
        anchor = shiftAnchor(g, anchor, -1);
      }
    }
  });
});

describe("shiftAnchor", () => {
  it("normalizes to day 1 so a day-31 anchor does not skip a short month", () => {
    const prev = shiftAnchor("month", new Date(2026, 2, 31), -1); // from Mar 31 back one month
    expect([prev.getFullYear(), prev.getMonth()]).toEqual([2026, 1]); // February, not skipped
  });

  it("steps a quarter by three months and rolls the year", () => {
    const next = shiftAnchor("quarter", new Date(2026, 10, 1), 1); // Nov -> +1 quarter
    expect([next.getFullYear(), next.getMonth()]).toEqual([2027, 1]); // Feb 2027
  });

  it("steps a year", () => {
    expect(shiftAnchor("year", new Date(2026, 4, 1), -1).getFullYear()).toBe(2025);
  });
});

describe("isAtLatest (disables the next arrow)", () => {
  it("month: current month is latest, past month is not", () => {
    expect(isAtLatest("month", new Date(2026, 4, 1), NOW)).toBe(true);
    expect(isAtLatest("month", new Date(2026, 3, 1), NOW)).toBe(false);
  });
  it("quarter: current quarter latest, prior quarter not", () => {
    expect(isAtLatest("quarter", new Date(2026, 4, 1), NOW)).toBe(true); // Q2
    expect(isAtLatest("quarter", new Date(2026, 2, 1), NOW)).toBe(false); // Q1
  });
  it("year: current/future year latest, past year not", () => {
    expect(isAtLatest("year", new Date(2026, 0, 1), NOW)).toBe(true);
    expect(isAtLatest("year", new Date(2025, 0, 1), NOW)).toBe(false);
  });
});

describe("labelFor", () => {
  it("formats month, quarter, year in Spanish", () => {
    expect(labelFor("month", new Date(2026, 4, 1))).toBe("Mayo 2026");
    expect(labelFor("quarter", new Date(2026, 4, 1))).toBe("T2 2026");
    expect(labelFor("year", new Date(2026, 4, 1))).toBe("2026");
  });
});
