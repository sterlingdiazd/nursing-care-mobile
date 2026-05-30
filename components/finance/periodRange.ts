// Pure period/range math for the finance dashboard selector. No React Native imports
// so it is unit-testable in isolation (vitest) and reusable.

export type Granularity = "month" | "quarter" | "year";

export interface PeriodRange {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
}

export const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m1: number, d: number) => `${y}-${pad(m1)}-${pad(d)}`;
// Last calendar day of the given 0-based month.
const lastDay = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate();

/** Today as YYYY-MM-DD using local Y/M/D (kept separate so callers/tests can reason about it). */
export function todayIso(now: Date = new Date()): string {
  return iso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * Inclusive from/to (YYYY-MM-DD) for a granularity anchored at a date. The anchor's
 * day-of-month is irrelevant; only year/month are used. The upper bound is capped at
 * today so the current quarter/year reads as accumulated-to-date instead of padding
 * with empty future months — and, critically, so no caller ever sends a future `to`
 * (which triggers a known backend revenue=0 bug).
 */
export function rangeFor(granularity: Granularity, anchor: Date, now: Date = new Date()): PeriodRange {
  const y = anchor.getFullYear();
  const m0 = anchor.getMonth();
  const tIso = todayIso(now);
  const cap = (to: string) => (to > tIso ? tIso : to);

  if (granularity === "month") {
    return { from: iso(y, m0 + 1, 1), to: cap(iso(y, m0 + 1, lastDay(y, m0))) };
  }
  if (granularity === "quarter") {
    const q0 = Math.floor(m0 / 3) * 3; // first month of quarter (0-based)
    return { from: iso(y, q0 + 1, 1), to: cap(iso(y, q0 + 3, lastDay(y, q0 + 2))) };
  }
  return { from: iso(y, 1, 1), to: cap(iso(y, 12, 31)) };
}

export function labelFor(granularity: Granularity, anchor: Date): string {
  const y = anchor.getFullYear();
  if (granularity === "month") {
    const name = MONTHS_ES[anchor.getMonth()];
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
  }
  if (granularity === "quarter") return `T${Math.floor(anchor.getMonth() / 3) + 1} ${y}`;
  return `${y}`;
}

/** Shift by ±1 unit of the granularity, normalized to day 1 to avoid month-length overflow. */
export function shiftAnchor(granularity: Granularity, anchor: Date, dir: -1 | 1): Date {
  const d = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  if (granularity === "month") d.setMonth(d.getMonth() + dir);
  else if (granularity === "quarter") d.setMonth(d.getMonth() + dir * 3);
  else d.setFullYear(d.getFullYear() + dir);
  return d;
}

/** True when the anchored period is the latest (current) one — used to disable "next". */
export function isAtLatest(granularity: Granularity, anchor: Date, now: Date = new Date()): boolean {
  const ay = anchor.getFullYear();
  if (granularity === "year") return ay >= now.getFullYear();
  if (granularity === "quarter") {
    return ay > now.getFullYear() ||
      (ay === now.getFullYear() && Math.floor(anchor.getMonth() / 3) >= Math.floor(now.getMonth() / 3));
  }
  return ay > now.getFullYear() || (ay === now.getFullYear() && anchor.getMonth() >= now.getMonth());
}
