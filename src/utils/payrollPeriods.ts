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

/** The standard quincena schedule that contains `anchor`. */
export function standardQuincena(anchor: Date): CreatePayrollPeriodRequest {
  const y = anchor.getFullYear();
  const m = anchor.getMonth(); // 0-based
  const firstHalf = anchor.getDate() <= 15;
  const start = new Date(y, m, firstHalf ? 1 : 16);
  const end = new Date(y, m, firstHalf ? 15 : lastDayOfMonth(y, m));
  const cutoff = new Date(end);
  cutoff.setDate(end.getDate() - 2);
  return {
    startDate: toIso(start),
    endDate: toIso(end),
    cutoffDate: toIso(cutoff),
    paymentDate: toIso(end),
  };
}

/** The quincena immediately after the latest existing period (or today's quincena if none). */
export function nextQuincenaAfter(periods: ReadonlyArray<{ endDate: string }>): CreatePayrollPeriodRequest {
  const latest = (periods ?? [])
    .map((p) => p.endDate)
    .filter(Boolean)
    .sort() // ISO dates sort chronologically
    .at(-1);
  if (!latest) return standardQuincena(new Date());
  const dayAfter = parseIso(latest);
  dayAfter.setDate(dayAfter.getDate() + 1);
  return standardQuincena(dayAfter);
}

/** The quincena before/after the one starting at `startIso`. */
export function stepQuincena(startIso: string, dir: -1 | 1): CreatePayrollPeriodRequest {
  const start = parseIso(startIso);
  if (dir === 1) {
    const end = parseIso(standardQuincena(start).endDate);
    end.setDate(end.getDate() + 1);
    return standardQuincena(end);
  }
  const prev = new Date(start);
  prev.setDate(start.getDate() - 1);
  return standardQuincena(prev);
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
