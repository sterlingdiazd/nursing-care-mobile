import {
  getEffectiveApiBaseUrl,
  subscribeToApiBaseUrlChange,
} from "@/src/services/apiBaseUrl";

/**
 * Public API base URL surface for the mobile app.
 *
 * The resolver lives in `src/services/apiBaseUrl.ts`. This file is the
 * public entry point existing code already imports from. `API_BASE_URL` is
 * a `let` (not a `const`) so that when the resolver picks a new winning
 * candidate at runtime — e.g. after a network self-heal probe — every
 * importer sees the updated value via the ES module live binding.
 *
 * Callers that build URLs inside a function body (e.g.
 * `fetch(`${API_BASE_URL}/api/...`)` inside requestJson) will read the
 * latest value on each invocation. Callers that need an explicit fresh
 * read can use `getApiBaseUrl()`.
 */

export let API_BASE_URL: string = getEffectiveApiBaseUrl();

subscribeToApiBaseUrlChange((next) => {
  API_BASE_URL = next;
});

export function getApiBaseUrl(): string {
  return getEffectiveApiBaseUrl();
}
