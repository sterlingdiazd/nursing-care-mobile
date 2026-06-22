import { AuthResponse } from "@/src/types/auth";

export type PostAuthRoute = "/" | "/admin" | "/care-requests" | "/register";

type AuthAccessState = Pick<AuthResponse, "roles" | "requiresProfileCompletion" | "requiresAdminReview">;

function normalizeRoles(roles: string[]) {
  return Array.from(
    new Set(
      roles
        .filter((role): role is string => typeof role === "string")
        .map((role) => role.trim().toUpperCase())
        .filter((role) => role.length > 0),
    ),
  );
}

export function canAccessCareRequests(response: AuthAccessState): boolean {
  const roles = normalizeRoles(response.roles);

  if (response.requiresProfileCompletion) {
    return false;
  }

  if (response.requiresAdminReview && roles.includes("NURSE")) {
    return false;
  }

  return roles.includes("CLIENT")
    || roles.includes("NURSE")
    || roles.includes("ADMIN");
}

export function canAccessAdminPortal(response: AuthAccessState): boolean {
  const roles = normalizeRoles(response.roles);

  if (response.requiresProfileCompletion) {
    return false;
  }

  return roles.includes("ADMIN");
}

export function canCreateCareRequests(response: AuthAccessState): boolean {
  const roles = normalizeRoles(response.roles);

  if (response.requiresProfileCompletion) {
    return false;
  }

  if (response.requiresAdminReview && roles.includes("NURSE")) {
    return false;
  }

  return roles.includes("CLIENT") || roles.includes("ADMIN");
}

/**
 * Whether the viewer may see the CLIENT-facing price of a care request
 * (base price, total, factor breakdown, supplies, the "Ver desglose" sheet).
 * Only ADMIN and CLIENT see the client price. A NURSE must NEVER see what the
 * client is charged — she sees only her own expected pay (nurseExpectedPay).
 * Accepts the raw roles array so call sites with just `roles` can use it directly.
 */
export function canSeeClientPricing(roles: string[]): boolean {
  const normalized = normalizeRoles(roles);
  return normalized.includes("ADMIN") || normalized.includes("CLIENT");
}

export function canAccessAccount(response: AuthAccessState): boolean {
  const roles = normalizeRoles(response.roles);
  return roles.includes("CLIENT")
    || roles.includes("NURSE")
    || roles.includes("ADMIN");
}

export function canAccessSupportTools(response: AuthAccessState): boolean {
  const roles = normalizeRoles(response.roles);

  if (response.requiresProfileCompletion) {
    return false;
  }

  return roles.includes("ADMIN");
}

export function resolvePostAuthRoute(
  response: AuthAccessState,
): PostAuthRoute {
  const roles = normalizeRoles(response.roles);

  if (response.requiresProfileCompletion) {
    return "/register";
  }

  // ADMIN, NURSE under review, fully-onboarded NURSE/CLIENT — all land on Inicio.
  // The home tab renders the appropriate per-role experience (admin dashboard for ADMIN).
  void roles; void canAccessCareRequests;
  return "/";
}
