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

  if (roles.includes("ADMIN")) {
    return "/admin";
  }

  if (response.requiresAdminReview && roles.includes("NURSE")) {
    return "/";
  }

  if (canAccessCareRequests(response)) {
    return "/care-requests";
  }

  return "/";
}
