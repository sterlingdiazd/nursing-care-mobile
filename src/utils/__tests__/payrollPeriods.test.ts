import { describe, expect, it } from "vitest";
import { quincenaLabel, quincenaHygieneWarnings } from "../payrollPeriods";

// Fixed "now" in 2026 so the year-suffix logic is deterministic.
const NOW_2026 = new Date(2026, 4, 20);

describe("quincenaLabel", () => {
  it("names the first half of the month", () => {
    expect(quincenaLabel("2026-05-01", "2026-05-15", NOW_2026)).toBe("Mayo · 1ra Quincena");
  });

  it("names the second half of the month (to end of month)", () => {
    expect(quincenaLabel("2026-05-16", "2026-05-31", NOW_2026)).toBe("Mayo · 2da Quincena");
  });

  it("handles the short second half of February", () => {
    expect(quincenaLabel("2026-02-16", "2026-02-28", NOW_2026)).toBe("Febrero · 2da Quincena");
  });

  it("appends the year only when it is not the current year", () => {
    expect(quincenaLabel("2024-12-01", "2024-12-15", NOW_2026)).toBe("Diciembre 2024 · 1ra Quincena");
  });

  it("does not append the year for the current year", () => {
    expect(quincenaLabel("2026-12-01", "2026-12-15", NOW_2026)).toBe("Diciembre · 1ra Quincena");
  });

  it("determines the half from the start day when no end date is given", () => {
    expect(quincenaLabel("2026-05-16", undefined, NOW_2026)).toBe("Mayo · 2da Quincena");
  });

  it("falls back to the date range for a non-standard start day", () => {
    // Non-standard periods are not named as a quincena — they show the exact date range.
    const label = quincenaLabel("2026-05-03", "2026-05-18", NOW_2026);
    expect(label).toContain(" – ");
    expect(label).not.toContain("Quincena");
  });

  it("falls back to the date range when the end day is not the quincena boundary", () => {
    const label = quincenaLabel("2026-05-01", "2026-05-20", NOW_2026);
    expect(label).toContain(" – ");
    expect(label).not.toContain("Quincena");
  });
});

describe("quincenaHygieneWarnings", () => {
  const std2ndHalfMay = { startDate: "2026-05-16", endDate: "2026-05-31", cutoffDate: "2026-05-29", paymentDate: "2026-05-31" };

  it("returns no warnings for a standard, contiguous, well-sized quincena", () => {
    const warnings = quincenaHygieneWarnings(std2ndHalfMay, [{ startDate: "2026-05-01", endDate: "2026-05-15" }]);
    expect(warnings).toEqual([]);
  });

  it("flags dates not aligned to the standard quincena", () => {
    const warnings = quincenaHygieneWarnings(
      { startDate: "2026-05-03", endDate: "2026-05-18", cutoffDate: "2026-05-16", paymentDate: "2026-05-18" },
      [],
    );
    expect(warnings.some((w) => w.includes("quincena estándar"))).toBe(true);
  });

  it("flags an unusually short period", () => {
    const warnings = quincenaHygieneWarnings(
      { startDate: "2026-05-01", endDate: "2026-05-08", cutoffDate: "2026-05-06", paymentDate: "2026-05-08" },
      [],
    );
    expect(warnings.some((w) => w.includes("duración"))).toBe(true);
  });

  it("flags a gap after the most recent period", () => {
    const warnings = quincenaHygieneWarnings(std2ndHalfMay, [{ startDate: "2026-04-01", endDate: "2026-04-15" }]);
    expect(warnings.some((w) => w.includes("espacio"))).toBe(true);
  });
});
