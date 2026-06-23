/**
 * Pure helpers for the typed (keyboard) entry path of the shared DateField.
 * Kept framework-free so the masking and strict validation can be unit-tested
 * without rendering a React Native component.
 *
 * Convention: the user types day-first `DD-MM-YYYY` (Dominican Republic format,
 * matching `formatDateES`); the stored value is ISO `YYYY-MM-DD` (API format).
 */

// Earliest/latest year a typed date may carry. Outside this range we reject the
// input as a typo rather than store an implausible hire/birth/service date.
export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;

/**
 * Progressively format raw keystrokes into a `DD-MM-YYYY` mask. Strips every
 * non-digit (the core "strict format" control — letters and stray separators
 * can never enter), caps at 8 digits, and re-derives the dashes from the digit
 * count so backspace deletes cleanly.
 */
export function maskTyped(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  let out = dd;
  if (digits.length > 2) out += `-${mm}`;
  if (digits.length > 4) out += `-${yyyy}`;
  return out;
}

/**
 * Validate a fully-typed `DD-MM-YYYY` string and convert to ISO `YYYY-MM-DD`.
 * `complete` distinguishes "still typing" (don't show an error yet) from a
 * finished-but-invalid entry (e.g. 31-02-2026), which is rejected against the
 * real days-in-month so February/30-day months are honored.
 */
export function typedToIso(masked: string): { iso: string | null; complete: boolean } {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(masked);
  if (!match) return { iso: null, complete: false };
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12) return { iso: null, complete: true };
  if (year < MIN_YEAR || year > MAX_YEAR) return { iso: null, complete: true };
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return { iso: null, complete: true };
  return { iso: `${match[3]}-${match[2]}-${match[1]}`, complete: true };
}
