import { AuthResponse } from "@/src/types/auth";

export type PostAuthRoute = "/" | "/admin" | "/care-requests" | "/register";

type AuthAccessState = Pick<AuthResponse, "roles" | "requiresProfileCompletion" | "requiresAdminReview">;

export function canAccessCareRequests(response: AuthAccessState): boolean {
  if (response.requiresProfileCompletion) {
    return false;
  }

  if (response.requiresAdminReview && response.roles.includes("NURSE")) {
    return false;
  }

  return response.roles.includes("CLIENT")
    || response.roles.includes("NURSE")
    || response.roles.includes("ADMIN");
}

export function canCreateCareRequests(response: AuthAccessState): boolean {
  if (response.requiresProfileCompletion) {
    return false;
  }

  if (response.requiresAdminReview && response.roles.includes("NURSE")) {
    return false;
  }

  return response.roles.includes("CLIENT") || response.roles.includes("ADMIN");
}

export function resolvePostAuthRoute(
  response: AuthAccessState,
): PostAuthRoute {
  if (response.requiresProfileCompletion) {
    return "/register";
  }

  if (response.roles.includes("ADMIN")) {
    return "/admin";
  }

  if (response.requiresAdminReview && response.roles.includes("NURSE")) {
    return "/";
  }

  if (canAccessCareRequests(response)) {
    return "/care-requests";
  }

  return "/";
}
