import { describe, expect, it } from "vitest";

import { resolvePostAuthRoute } from "@/src/utils/authRedirect";

describe("resolvePostAuthRoute", () => {
  it("routes incomplete profiles to registration", () => {
    expect(
      resolvePostAuthRoute({
        roles: ["CLIENT"],
        requiresProfileCompletion: true,
        requiresAdminReview: false,
      }),
    ).toBe("/register");
  });

  it("routes admins to the admin workspace", () => {
    expect(
      resolvePostAuthRoute({
        roles: ["ADMIN"],
        requiresProfileCompletion: false,
        requiresAdminReview: false,
      }),
    ).toBe("/admin");
  });

  it("keeps nurses under review out of operational screens", () => {
    expect(
      resolvePostAuthRoute({
        roles: ["NURSE"],
        requiresProfileCompletion: false,
        requiresAdminReview: true,
      }),
    ).toBe("/");
  });

  it("routes active nurses to the care requests queue", () => {
    expect(
      resolvePostAuthRoute({
        roles: ["NURSE"],
        requiresProfileCompletion: false,
        requiresAdminReview: false,
      }),
    ).toBe("/care-requests");
  });

  it("routes clients to the care requests queue", () => {
    expect(
      resolvePostAuthRoute({
        roles: ["CLIENT"],
        requiresProfileCompletion: false,
        requiresAdminReview: false,
      }),
    ).toBe("/care-requests");
  });

  it("falls back to the home screen for unknown roles", () => {
    expect(
      resolvePostAuthRoute({
        roles: [],
        requiresProfileCompletion: false,
        requiresAdminReview: false,
      }),
    ).toBe("/");
  });
});
