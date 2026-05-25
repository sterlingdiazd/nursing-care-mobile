import type { CreatePayrollPeriodRequest } from "@/src/services/payrollTypes";
import { formatDateES } from "@/src/utils/spanishTextValidator";

// Standard payroll-period (quincena) rules, matching the backend:
//   - 1st half: day 1–15
//   - 2nd half: day 16–end of month
//   - cutoff = end − 2 days
//   - payment = end
// Kept here so the create-period form can prefill/step without a round-trip.

const toIso = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseIso = (iso: string): Date => new Date(`${iso}T00:00:00`);

const lastDayOfMonth = (year: number, monthIndex0: number): number =>
  new Date(year, monthIndex0 + 1, 0).getDate();

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Admin-configurable payment-date policy for the standard quincena prefill, read from
 * system settings. Defaults reproduce TODAY's behavior exactly: 1st quincena pays the
 * 15th, 2nd quincena pays the last day of the month, cutoff = end − 2.
 */
export type PaymentDatePolicy = {
  /** "FIXED_DAY": pay on a fixed day-of-month. "DAYS_BEFORE_MONTH_END": pay N days before the month ends (2nd half only). */
  mode: "FIXED_DAY" | "DAYS_BEFORE_MONTH_END";
  /** Day-of-month the 1st quincena pays on (clamped 1..last day of month). */
  firstHalfPaymentDay: number;
  /** Day-of-month the 2nd quincena pays on. 0 means "last day of the month". */
  secondHalfPaymentDay: number;
  /** Days before month-end the 2nd quincena pays on (only used in DAYS_BEFORE_MONTH_END mode). */
  daysBeforeMonthEnd: number;
};

/** The default policy — reproduces the original hardcoded behavior (15th / last day, cutoff = end − 2). */
export const DEFAULT_PAYMENT_DATE_POLICY: PaymentDatePolicy = {
  mode: "FIXED_DAY",
  firstHalfPaymentDay: 15,
  secondHalfPaymentDay: 0,
  daysBeforeMonthEnd: 0,
};

/**
 * Compute `{ cutoffDate, paymentDate }` (ISO YYYY-MM-DD) for a quincena's [start, end]
 * dates under `policy`. Pure and UTC-safe (operates on local Y/M/D parts only).
 *
 * The "half" is inferred from the calendar shape:
 *   - 1st half = starts on the 1st and ends on the 15th
 *   - 2nd half = starts on the 16th and ends on the last day of the month
 * A period that is NOT aligned to either shape falls back to paymentDate = end
 * (the original behavior), so an atypical manual range is never mis-dated.
 *
 * The cutoff starts from `end − 2` (the original rule) and is then pulled back to
 * `min(end − 2, paymentDate)` and clamped to be ≥ start, because the backend validates
 * `paymentDate >= cutoffDate` (with `start <= cutoff <= end`): an earlier payment must
 * pull the cutoff with it.
 */
export function computeCutoffAndPayment(
  startIso: string,
  endIso: string,
  policy: PaymentDatePolicy = DEFAULT_PAYMENT_DATE_POLICY,
): { cutoffDate: string; paymentDate: string } {
  const start = toLocalDate(startIso);
  const end = toLocalDate(endIso);

  const year = end.getFullYear();
  const monthIndex0 = end.getMonth();
  const lastDay = lastDayOfMonth(year, monthIndex0);

  // Default cutoff: end − 2 (original rule).
  const cutoffBase = new Date(end);
  cutoffBase.setDate(end.getDate() - 2);

  const isFirstHalf =
    start.getDate() === 1 &&
    end.getDate() === 15 &&
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();
  const isSecondHalf =
    start.getDate() === 16 &&
    end.getDate() === lastDay &&
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();

  // Resolve the payment day-of-month for this period's month under the policy.
  let paymentDay: number;
  if (isFirstHalf) {
    // The 1st quincena always pays on its fixed day, even in offset mode.
    paymentDay = clamp(policy.firstHalfPaymentDay, 1, lastDay);
  } else if (isSecondHalf) {
    if (policy.mode === "DAYS_BEFORE_MONTH_END") {
      paymentDay = clamp(lastDay - policy.daysBeforeMonthEnd, 1, lastDay);
    } else {
      // FIXED_DAY: 0 means "last day of month".
      paymentDay = policy.secondHalfPaymentDay === 0
        ? lastDay
        : clamp(policy.secondHalfPaymentDay, 1, lastDay);
    }
  } else {
    // Non-standard period: fall back to the original behavior (pay on the end date).
    paymentDay = end.getDate();
  }

  const payment = new Date(year, monthIndex0, paymentDay);
  // A pathological policy (e.g. a huge DAYS_BEFORE_MONTH_END) could push payment before the
  // period start; keep it within [start, end] so the backend's start <= cutoff <= end and
  // payment >= cutoff invariants always hold.
  if (payment.getTime() < start.getTime()) payment.setTime(start.getTime());

  // The backend requires paymentDate >= cutoffDate; pull cutoff back so it never exceeds payment.
  const cutoff = new Date(
    Math.min(cutoffBase.getTime(), payment.getTime()),
  );
  // cutoff must also be >= start.
  if (cutoff.getTime() < start.getTime()) {
    cutoff.setTime(start.getTime());
  }

  return {
    cutoffDate: toIso(cutoff),
    paymentDate: toIso(payment),
  };
}

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Parse an API date ("YYYY-MM-DD", optionally with a time suffix) into a LOCAL-midnight
// Date. Building from the Y/M/D parts avoids the UTC-shift that `new Date("YYYY-MM-DD")`
// causes in negative timezones (which would mis-read the day-of-month, e.g. 16 → 15).
const toLocalDate = (value: string | Date): Date => {
  if (value instanceof Date) return value;
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (y && m && d) return new Date(y, m - 1, d);
  return new Date(value);
};

/**
 * Human-readable quincena name for a period, e.g. "Mayo · 1ra Quincena". The year is
 * appended after the month only when it is not the current year ("Diciembre 2024 · 1ra
 * Quincena"). Standard quincenas cover fixed dates, so the dates themselves are omitted.
 *
 * Falls back to the exact date range for periods that are NOT aligned to the standard
 * quincena calendar (start not on the 1st/16th, or end not on the 15th/last day), so an
 * atypical manual period is never mislabelled.
 */
export function quincenaLabel(
  startDate: string | Date,
  endDate?: string | Date,
  now: Date = new Date(),
): string {
  const start = toLocalDate(startDate);
  if (isNaN(start.getTime())) return "";

  const day = start.getDate();
  const month = start.getMonth();
  const year = start.getFullYear();

  const isFirstHalf = day === 1;
  const isSecondHalf = day === 16;
  let aligned = isFirstHalf || isSecondHalf;

  if (aligned && endDate != null) {
    const end = toLocalDate(endDate);
    const expectedEndDay = isFirstHalf ? 15 : lastDayOfMonth(year, month);
    aligned =
      end.getFullYear() === year &&
      end.getMonth() === month &&
      end.getDate() === expectedEndDay;
  }

  if (!aligned) {
    return endDate != null
      ? `${formatDateES(startDate)} – ${formatDateES(endDate)}`
      : formatDateES(startDate);
  }

  const ordinal = isFirstHalf ? "1ra" : "2da";
  const yearSuffix = year !== now.getFullYear() ? ` ${year}` : "";
  return `${MONTHS_ES[month]}${yearSuffix} · ${ordinal} Quincena`;
}

/**
 * The standard quincena schedule that contains `anchor`. When a `policy` is supplied,
 * the cutoff and payment dates follow that admin-configured policy; otherwise the
 * default (15th / last day, cutoff = end − 2) is used.
 */
export function standardQuincena(anchor: Date, policy?: PaymentDatePolicy): CreatePayrollPeriodRequest {
  const y = anchor.getFullYear();
  const m = anchor.getMonth(); // 0-based
  const firstHalf = anchor.getDate() <= 15;
  const start = new Date(y, m, firstHalf ? 1 : 16);
  const end = new Date(y, m, firstHalf ? 15 : lastDayOfMonth(y, m));
  const startIso = toIso(start);
  const endIso = toIso(end);
  const { cutoffDate, paymentDate } = computeCutoffAndPayment(startIso, endIso, policy);
  return {
    startDate: startIso,
    endDate: endIso,
    cutoffDate,
    paymentDate,
  };
}

/**
 * The quincena immediately after the latest existing period (or today's quincena if none).
 * An optional `policy` is forwarded to `standardQuincena` to drive the payment-date prefill.
 */
export function nextQuincenaAfter(
  periods: ReadonlyArray<{ endDate: string }>,
  policy?: PaymentDatePolicy,
): CreatePayrollPeriodRequest {
  const latest = (periods ?? [])
    .map((p) => p.endDate)
    .filter(Boolean)
    .sort() // ISO dates sort chronologically
    .at(-1);
  if (!latest) return standardQuincena(new Date(), policy);
  const dayAfter = parseIso(latest);
  dayAfter.setDate(dayAfter.getDate() + 1);
  return standardQuincena(dayAfter, policy);
}

/** The quincena before/after the one starting at `startIso`. An optional `policy` drives the payment-date prefill. */
export function stepQuincena(startIso: string, dir: -1 | 1, policy?: PaymentDatePolicy): CreatePayrollPeriodRequest {
  const start = parseIso(startIso);
  if (dir === 1) {
    const end = parseIso(standardQuincena(start).endDate);
    end.setDate(end.getDate() + 1);
    return standardQuincena(end, policy);
  }
  const prev = new Date(start);
  prev.setDate(start.getDate() - 1);
  return standardQuincena(prev, policy);
}

/** A run of `count` consecutive quincenas starting with the one that contains `anchor`. */
export function upcomingQuincenas(count: number, anchor: Date = new Date()): CreatePayrollPeriodRequest[] {
  const list: CreatePayrollPeriodRequest[] = [];
  let q = standardQuincena(anchor);
  for (let i = 0; i < count; i += 1) {
    list.push(q);
    q = stepQuincena(q.startDate, 1);
  }
  return list;
}

/** Inclusive overlap test for two ISO date ranges (same rule as the backend). */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Non-blocking calendar-hygiene advisories for a period the admin is about to create.
 * These never block submit (the backend still hard-blocks overlaps); they just flag
 * common payroll-calendar mistakes: misalignment to the standard quincena, an unusual
 * length, or a gap after the most recent existing period.
 */
export function quincenaHygieneWarnings(
  request: CreatePayrollPeriodRequest,
  existingPeriods: ReadonlyArray<{ startDate: string; endDate: string }>,
): string[] {
  const warnings: string[] = [];

  const startIso = request.startDate.slice(0, 10);
  const endIso = request.endDate.slice(0, 10);
  const start = toLocalDate(startIso);
  const end = toLocalDate(endIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return warnings;

  // Alignment to the standard quincena that contains the start date.
  const std = standardQuincena(start);
  if (startIso !== std.startDate || endIso !== std.endDate) {
    warnings.push("Las fechas no coinciden con la quincena estándar (1–15 o 16–fin de mes).");
  }

  // Unusual length — a quincena spans ~13–16 days.
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (days < 13 || days > 16) {
    warnings.push(`La duración del período es inusual (${days} día${days === 1 ? "" : "s"}). Una quincena suele tener entre 13 y 16 días.`);
  }

  // Gap after the latest existing period (only when not overlapping — overlap is blocked server-side).
  const latestEnd = (existingPeriods ?? [])
    .map((p) => p.endDate?.slice(0, 10))
    .filter(Boolean)
    .sort()
    .at(-1);
  if (latestEnd) {
    const overlaps = (existingPeriods ?? []).some((p) =>
      rangesOverlap(startIso, endIso, p.startDate.slice(0, 10), p.endDate.slice(0, 10)));
    const dayAfterLatest = toLocalDate(latestEnd);
    dayAfterLatest.setDate(dayAfterLatest.getDate() + 1);
    if (!overlaps && start.getTime() > dayAfterLatest.getTime()) {
      warnings.push("Queda un espacio entre este período y el período anterior.");
    }
  }

  return warnings;
}
