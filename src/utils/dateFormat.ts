/**
 * Date-only formatting helpers for user-facing copy.
 *
 * IMPORTANT: parse the `YYYY-MM-DD` parts locally instead of `new Date("YYYY-MM-DD")`,
 * which the engine parses as UTC midnight and then shifts a calendar day in negative
 * timezones (the formatDateES off-by-one bug). These helpers never construct a Date,
 * so the displayed day always matches the stored day.
 */

/**
 * Formats a date-only ISO string (`YYYY-MM-DD`) as `DD/MM/YYYY` for the Dominican/Spanish
 * locale. Returns the input unchanged if it is not in the expected shape.
 */
export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
