import { describe, expect, it } from "vitest";

import {
  canAccessCareRequests,
  canCreateCareRequests,
  resolvePostAuthRoute,
} from "@/src/utils/authRedirect";

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

describe("canAccessCareRequests", () => {
  it("allows admins, clients, and active nurses", () => {
    expect(
      canAccessCareRequests({
        roles: ["ADMIN"],
        requiresProfileCompletion: false,
        requiresAdminReview: false,
      }),
    ).toBe(true);
    expect(
      canAccessCareRequests({
        roles: ["CLIENT"],
        requiresProfileCompletion: false,
        requiresAdminReview: false,
      }),
    ).toBe(true);
    expect(
      canAccessCareRequests({
        roles: ["NURSE"],
        requiresProfileCompletion: false,
        requiresAdminReview: false,
      }),
    ).toBe(true);
  });

  it("blocks incomplete profiles, nurses under review, and unknown roles", () => {
    expect(
      canAccessCareRequests({
        roles: ["CLIENT"],
        requiresProfileCompletion: true,
        requiresAdminReview: false,
      }),
    ).toBe(false);
    expect(
      canAccessCareRequests({
        roles: ["NURSE"],
        requiresProfileCompletion: false,
        requiresAdminReview: true,
      }),
    ).toBe(false);
    expect(
      canAccessCareRequests({
        roles: [],
        requiresProfileCompletion: false,
        requiresAdminReview: false,
      }),
    ).toBe(false);
  });
});

describe("canCreateCareRequests", () => {
  it("allows only admins and clients with operational access", () => {
    expect(
      canCreateCareRequests({
        roles: ["ADMIN"],
        requiresProfileCompletion: false,
        requiresAdminReview: false,
      }),
    ).toBe(true);
    expect(
      canCreateCareRequests({
        roles: ["CLIENT"],
        requiresProfileCompletion: false,
        requiresAdminReview: false,
      }),
    ).toBe(true);
    expect(
      canCreateCareRequests({
        roles: ["NURSE"],
        requiresProfileCompletion: false,
        requiresAdminReview: false,
      }),
    ).toBe(false);
  });
});
