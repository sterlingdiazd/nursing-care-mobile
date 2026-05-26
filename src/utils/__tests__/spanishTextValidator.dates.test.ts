import { describe, expect, it } from "vitest";
import { formatDateES, formatDateTimeES } from "../spanishTextValidator";

// These assertions hold in ANY timezone: a date-only "YYYY-MM-DD" must render as that
// exact calendar day. Before the fix, `new Date("YYYY-MM-DD")` parsed as UTC midnight and
// printed the previous day in negative offsets (DR = UTC-4), e.g. "2026-05-15" -> "14-05-2026".
describe("formatDateES — date-only strings are local, not UTC-shifted", () => {
  it("renders the exact calendar day", () => {
    expect(formatDateES("2026-05-15")).toBe("15-05-2026");
    expect(formatDateES("2026-03-01")).toBe("01-03-2026");
    expect(formatDateES("2026-03-31")).toBe("31-03-2026");
    expect(formatDateES("2026-01-01")).toBe("01-01-2026");
  });

  it("returns empty for invalid input", () => {
    expect(formatDateES("not-a-date")).toBe("");
  });

  it("still formats a Date object by its local parts", () => {
    expect(formatDateES(new Date(2026, 4, 15))).toBe("15-05-2026"); // month is 0-based
  });
});

describe("formatDateTimeES — date portion is the local calendar day", () => {
  it("does not shift a date-only string back a day", () => {
    expect(formatDateTimeES("2026-05-15").startsWith("15-05-2026")).toBe(true);
  });
});

// These assertions are TZ-pinned to America/Santo_Domingo (DR = UTC-4, no DST) and require
// the suite to run with TZ=America/Santo_Domingo. They LOCK the INTENTIONAL behavior that a
// full UTC timestamp renders BOTH the local calendar date AND the local time-of-day. Showing
// the local DR date+time of a UTC instant is correct, NOT a day-shift bug: an instant late in
// the UTC day genuinely belongs to the previous DR calendar day, and the rendered time-of-day
// makes that day unambiguous (e.g. "...10:00:00 PM" the night before, not noon the next day).
describe("formatDateTimeES — full UTC timestamps render the local DR date AND time", () => {
  it("renders a late-UTC instant as the prior DR calendar day with its local time", () => {
    // 02:00 UTC on the 16th is 22:00 (10 PM) on the 15th in DR — intentional, not a bug.
    expect(formatDateTimeES("2026-05-16T02:00:00Z")).toBe("15-05-2026 10:00:00 PM");
  });

  it("crosses the day boundary backward for an early-morning UTC instant", () => {
    // 03:30:45 UTC on the 10th is 23:30:45 (11:30 PM) on the 9th in DR.
    expect(formatDateTimeES("2026-01-10T03:30:45Z")).toBe("09-01-2026 11:30:45 PM");
  });

  it("keeps the same calendar day for a same-day UTC instant", () => {
    // 18:05 UTC on the 15th is 14:05 (2:05 PM) on the 15th in DR — no day change.
    expect(formatDateTimeES("2026-05-15T18:05:00Z")).toBe("15-05-2026 02:05:00 PM");
  });
});
