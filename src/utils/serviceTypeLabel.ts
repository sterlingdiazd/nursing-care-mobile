/** A code -> friendly Spanish display name lookup for care-request service types. */
export type ServiceTypeNameMap = Record<string, string>;

/** Minimal catalog-item shape this helper needs (any list whose items carry a code + displayName). */
type CodeNamed = { code: string; displayName: string };

/**
 * Build a `code -> displayName` map from the catalog options. The catalog is the source of truth;
 * both categories and types are folded in so reports keyed on either resolve to a friendly name.
 * Typed structurally (code + displayName only) so any catalog list satisfies it.
 */
export function buildServiceTypeNameMap(
  options: { careRequestCategories?: CodeNamed[]; careRequestTypes?: CodeNamed[] } | null | undefined,
): ServiceTypeNameMap {
  const map: ServiceTypeNameMap = {};
  if (!options) return map;
  for (const c of options.careRequestCategories ?? []) map[c.code] = c.displayName;
  for (const t of options.careRequestTypes ?? []) map[t.code] = t.displayName;
  return map;
}

/**
 * Friendly Spanish name for a service/request-type code. Falls back to the raw code so a missing
 * or not-yet-loaded catalog never blanks out the cell (better a code than nothing).
 */
export function labelForServiceType(map: ServiceTypeNameMap, code: string | null | undefined): string {
  if (!code) return "";
  return map[code] ?? code;
}
