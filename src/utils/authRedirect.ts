import { AuthResponse } from "@/src/types/auth";

export type PostAuthRoute = "/" | "/admin" | "/care-requests" | "/register";

export function resolvePostAuthRoute(
  response: Pick<AuthResponse, "roles" | "requiresProfileCompletion" | "requiresAdminReview">,
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

  if (response.roles.includes("CLIENT") || response.roles.includes("NURSE")) {
    return "/care-requests";
  }

  return "/";
}
