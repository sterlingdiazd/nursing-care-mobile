import { describe, expect, it } from "vitest";
import {
  quincenaLabel,
  quincenaHygieneWarnings,
  standardQuincena,
  computeCutoffAndPayment,
  DEFAULT_PAYMENT_DATE_POLICY,
  type PaymentDatePolicy,
} from "../payrollPeriods";
import { paymentDatePolicyFromSettings } from "@/src/services/payrollPaymentPolicy";

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

  it("labels a non-standard period by the quincena containing its end date (2nd half)", () => {
    // 03–18 May → end day 18 (> 15) → 2da Quincena of May, current year so no suffix.
    expect(quincenaLabel("2026-05-03", "2026-05-18", NOW_2026)).toBe("Mayo · 2da Quincena");
  });

  it("labels a non-standard period whose end falls in the first half (1ra)", () => {
    // 01–20 May has an end day of 20 → 2da; pick an end <= 15 to exercise the 1ra branch.
    expect(quincenaLabel("2026-05-01", "2026-05-12", NOW_2026)).toBe("Mayo · 1ra Quincena");
  });

  it("labels a non-standard full-month period by its end-date quincena", () => {
    // Full March (01–31) is not a standard half; end day 31 → 2da Quincena of March.
    expect(quincenaLabel("2026-03-01", "2026-03-31", new Date(2026, 4, 1))).toBe("Marzo · 2da Quincena");
  });

  it("uses the end-date month/year (not the start's) for a cross-month non-standard period", () => {
    // 2024 → not the current year (2026) so the year is appended; end is in January.
    expect(quincenaLabel("2024-12-20", "2025-01-10", NOW_2026)).toBe("Enero 2025 · 1ra Quincena");
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

describe("computeCutoffAndPayment / payment-date policy", () => {
  // 2026-05: first half 01..15, second half 16..31 (May has 31 days).
  const FIRST_HALF = { start: "2026-05-01", end: "2026-05-15" };
  const SECOND_HALF = { start: "2026-05-16", end: "2026-05-31" };

  describe("default policy reproduces the original behavior", () => {
    it("1st quincena pays the 15th, cutoff = end − 2", () => {
      const { cutoffDate, paymentDate } = computeCutoffAndPayment(FIRST_HALF.start, FIRST_HALF.end);
      expect(paymentDate).toBe("2026-05-15");
      expect(cutoffDate).toBe("2026-05-13");
    });

    it("2nd quincena pays the last day of the month, cutoff = end − 2", () => {
      const { cutoffDate, paymentDate } = computeCutoffAndPayment(SECOND_HALF.start, SECOND_HALF.end);
      expect(paymentDate).toBe("2026-05-31");
      expect(cutoffDate).toBe("2026-05-29");
    });

    it("standardQuincena with no policy yields the original 2nd-half schedule", () => {
      const q = standardQuincena(new Date(2026, 4, 20)); // May 20 → 2nd half
      expect(q).toEqual({
        startDate: "2026-05-16",
        endDate: "2026-05-31",
        cutoffDate: "2026-05-29",
        paymentDate: "2026-05-31",
      });
    });

    it("DEFAULT_PAYMENT_DATE_POLICY matches the no-arg result exactly", () => {
      expect(computeCutoffAndPayment(SECOND_HALF.start, SECOND_HALF.end, DEFAULT_PAYMENT_DATE_POLICY))
        .toEqual(computeCutoffAndPayment(SECOND_HALF.start, SECOND_HALF.end));
    });
  });

  describe("FIXED_DAY with custom days", () => {
    const policy: PaymentDatePolicy = {
      mode: "FIXED_DAY",
      firstHalfPaymentDay: 10,
      secondHalfPaymentDay: 25,
      daysBeforeMonthEnd: 0,
    };

    it("1st quincena pays the configured day (10th); cutoff pulled back to payment", () => {
      const { cutoffDate, paymentDate } = computeCutoffAndPayment(FIRST_HALF.start, FIRST_HALF.end, policy);
      expect(paymentDate).toBe("2026-05-10");
      // end − 2 = 13th, but payment (10th) is earlier → cutoff pulled to the 10th.
      expect(cutoffDate).toBe("2026-05-10");
    });

    it("2nd quincena pays the configured day (25th); cutoff pulled back to payment", () => {
      const { cutoffDate, paymentDate } = computeCutoffAndPayment(SECOND_HALF.start, SECOND_HALF.end, policy);
      expect(paymentDate).toBe("2026-05-25");
      // end − 2 = 29th, payment 25th is earlier → cutoff = 25th.
      expect(cutoffDate).toBe("2026-05-25");
    });

    it("clamps a 1st-half day beyond the month length to the last day", () => {
      const { paymentDate } = computeCutoffAndPayment(
        "2026-02-01",
        "2026-02-15",
        { mode: "FIXED_DAY", firstHalfPaymentDay: 31, secondHalfPaymentDay: 0, daysBeforeMonthEnd: 0 },
      );
      // Feb 2026 has 28 days; 31 clamps to 28 (but the 1st half ends on the 15th, so clamp is to lastDay=28).
      expect(paymentDate).toBe("2026-02-28");
    });

    it("second-half day 0 still means last day even with a custom first-half day", () => {
      const { paymentDate } = computeCutoffAndPayment(
        SECOND_HALF.start,
        SECOND_HALF.end,
        { mode: "FIXED_DAY", firstHalfPaymentDay: 10, secondHalfPaymentDay: 0, daysBeforeMonthEnd: 0 },
      );
      expect(paymentDate).toBe("2026-05-31");
    });
  });

  describe("DAYS_BEFORE_MONTH_END", () => {
    const policy: PaymentDatePolicy = {
      mode: "DAYS_BEFORE_MONTH_END",
      firstHalfPaymentDay: 15,
      secondHalfPaymentDay: 0,
      daysBeforeMonthEnd: 5,
    };

    it("2nd quincena pays N days before month end; cutoff is pulled back so paymentDate >= cutoff", () => {
      const { cutoffDate, paymentDate } = computeCutoffAndPayment(SECOND_HALF.start, SECOND_HALF.end, policy);
      // 31 − 5 = 26th.
      expect(paymentDate).toBe("2026-05-26");
      // end − 2 = 29th, payment 26th is earlier → cutoff = 26th. Verify ordering holds.
      expect(cutoffDate).toBe("2026-05-26");
      expect(paymentDate >= cutoffDate).toBe(true);
    });

    it("1st quincena keeps the fixed mid-month day even in offset mode", () => {
      const { paymentDate } = computeCutoffAndPayment(FIRST_HALF.start, FIRST_HALF.end, policy);
      expect(paymentDate).toBe("2026-05-15");
    });

    it("keeps cutoff within the period and never after the payment for a large in-period N", () => {
      // N=12 → 31 − 12 = 19th, still inside the 16..31 second half.
      const { cutoffDate, paymentDate } = computeCutoffAndPayment(
        SECOND_HALF.start,
        SECOND_HALF.end,
        { mode: "DAYS_BEFORE_MONTH_END", firstHalfPaymentDay: 15, secondHalfPaymentDay: 0, daysBeforeMonthEnd: 12 },
      );
      expect(paymentDate).toBe("2026-05-19");
      // end − 2 = 29th, payment 19th earlier → cutoff = 19th; still >= start (16th).
      expect(cutoffDate).toBe("2026-05-19");
      expect(cutoffDate >= SECOND_HALF.start).toBe(true);
      expect(paymentDate >= cutoffDate).toBe(true);
    });
  });

  describe("non-standard period falls back to paying on the end date", () => {
    it("uses end as the payment date and end − 2 as the cutoff", () => {
      const { cutoffDate, paymentDate } = computeCutoffAndPayment(
        "2026-05-03",
        "2026-05-18",
        { mode: "DAYS_BEFORE_MONTH_END", firstHalfPaymentDay: 15, secondHalfPaymentDay: 0, daysBeforeMonthEnd: 5 },
      );
      expect(paymentDate).toBe("2026-05-18");
      expect(cutoffDate).toBe("2026-05-16");
    });
  });
});

describe("paymentDatePolicyFromSettings", () => {
  it("returns defaults when keys are missing", () => {
    expect(paymentDatePolicyFromSettings([])).toEqual(DEFAULT_PAYMENT_DATE_POLICY);
  });

  it("parses configured values and ignores unrelated keys", () => {
    const policy = paymentDatePolicyFromSettings([
      { key: "PAYROLL_PAYMENT_DATE_MODE", value: "DAYS_BEFORE_MONTH_END" },
      { key: "PAYROLL_FIRST_HALF_PAYMENT_DAY", value: "10" },
      { key: "PAYROLL_SECOND_HALF_PAYMENT_DAY", value: "25" },
      { key: "PAYROLL_DAYS_BEFORE_MONTH_END", value: "3" },
      { key: "SOMETHING_ELSE", value: "x" },
    ]);
    expect(policy).toEqual({
      mode: "DAYS_BEFORE_MONTH_END",
      firstHalfPaymentDay: 10,
      secondHalfPaymentDay: 25,
      daysBeforeMonthEnd: 3,
    });
  });

  it("falls back to defaults for blank / non-numeric values and unknown mode", () => {
    const policy = paymentDatePolicyFromSettings([
      { key: "PAYROLL_PAYMENT_DATE_MODE", value: "WEEKLY" },
      { key: "PAYROLL_FIRST_HALF_PAYMENT_DAY", value: "  " },
      { key: "PAYROLL_SECOND_HALF_PAYMENT_DAY", value: "abc" },
      { key: "PAYROLL_DAYS_BEFORE_MONTH_END", value: "" },
    ]);
    expect(policy).toEqual(DEFAULT_PAYMENT_DATE_POLICY);
  });
});
