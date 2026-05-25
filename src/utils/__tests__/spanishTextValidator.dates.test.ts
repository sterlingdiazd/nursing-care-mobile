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
