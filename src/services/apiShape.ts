import { requestJson } from "@/src/services/httpClient";

/**
 * Coerce any list-ish API response into an array. Handles a bare array, a paginated
 * envelope (`{ items, totalCount, ... }`), and `{ data: [...] }` / `{ data: { items } }`.
 * Returns `[]` for null/unknown shapes — never throws.
 */
export function asArray<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (Array.isArray(b.items)) return b.items as T[];
    if (Array.isArray(b.data)) return b.data as T[];
    const data = b.data as Record<string, unknown> | null | undefined;
    if (data && Array.isArray(data.items)) return data.items as T[];
  }
  return [];
}

/**
 * GET a list endpoint and ALWAYS return an array, regardless of whether the backend returns
 * a bare array or a paginated envelope. This is the service-boundary normalization that
 * prevents the "X.filter/.map/.length is not a function" crash class: when an endpoint that
 * used to return an array is changed to a paginated envelope, callers using this stay safe.
 * Use for endpoints where the caller only needs the array (not pagination metadata).
 */
export async function requestList<T>(options: Parameters<typeof requestJson>[0]): Promise<T[]> {
  return asArray<T>(await requestJson<unknown>(options));
}
