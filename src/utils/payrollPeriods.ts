import type { CreatePayrollPeriodRequest } from "@/src/services/payrollTypes";

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
