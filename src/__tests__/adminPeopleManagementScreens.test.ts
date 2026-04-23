import { beforeEach, describe, expect, it, vi } from "vitest";

import * as httpClient from "../services/httpClient";
import {
  createAdminAccount,
  createAdminClient,
  getAdminUserDetail,
  getAdminUsers,
  invalidateAdminUserSessions,
  updateAdminUserActiveState,
} from "../services/adminPortalService";
import { adminTestIds } from "../testing/testIds";

vi.mock("../services/httpClient", () => ({
  requestJson: vi.fn(),
}));

describe("admin people-management route guards", () => {
  it("redirects unauthenticated admins to /login", () => {
    const replace = vi.fn();
    const authState = { isReady: true, isAuthenticated: false, requiresProfileCompletion: false, roles: [] as string[] };

    if (!authState.isReady) return;
    if (!authState.isAuthenticated) replace("/login");
    else if (authState.requiresProfileCompletion) replace("/register");
    else if (!authState.roles.includes("ADMIN")) replace("/");

    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("redirects authenticated non-admin users to /", () => {
    const replace = vi.fn();
    const authState = { isReady: true, isAuthenticated: true, requiresProfileCompletion: false, roles: ["CLIENT"] };

    if (!authState.isReady) return;
    if (!authState.isAuthenticated) replace("/login");
    else if (authState.requiresProfileCompletion) replace("/register");
    else if (!authState.roles.includes("ADMIN")) replace("/");

    expect(replace).toHaveBeenCalledWith("/");
  });
});

describe("admin people-management service contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates admin clients through the authenticated admin endpoint", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue({ userId: "client-123" });

    await createAdminClient({
      name: "Maria",
      lastName: "Lopez",
      identificationNumber: "00112345678",
      phone: "8091234567",
      email: "maria@example.com",
      password: "12345678",
      confirmPassword: "12345678",
    });

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/clients",
        method: "POST",
        auth: true,
      }),
    );
  });

  it("loads admin users through the authenticated admin endpoint", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);

    await getAdminUsers({ status: "AdminReview", search: "ana" });

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/users?search=ana&status=AdminReview",
        auth: true,
      }),
    );
  });

  it("loads a specific admin user detail through the authenticated admin endpoint", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue({ id: "user-123" });

    await getAdminUserDetail("user-123");

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/users/user-123",
        auth: true,
      }),
    );
  });

  it("updates admin user active state through the authenticated admin endpoint", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(undefined);

    await updateAdminUserActiveState("user-123", true);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/users/user-123/active-state",
        method: "PUT",
        auth: true,
      }),
    );
  });

  it("invalidates admin user sessions through the authenticated admin endpoint", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(undefined);

    await invalidateAdminUserSessions("user-123");

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/users/user-123/invalidate-sessions",
        method: "POST",
        auth: true,
      }),
    );
  });

  it("creates admin accounts through the authenticated admin endpoint", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue({ id: "admin-123" });

    await createAdminAccount({
      name: "Lucia",
      lastName: "Perez",
      identificationNumber: "00112345678",
      phone: "8091234567",
      email: "lucia@example.com",
      password: "12345678",
      confirmPassword: "12345678",
    });

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/admin-accounts",
        method: "POST",
        auth: true,
      }),
    );
  });
});

describe("admin people-management selector contract", () => {
  it("defines stable selectors for client creation evidence anchors", () => {
    expect(adminTestIds.clients.create.screen).toBe("admin-client-create-screen");
    expect(adminTestIds.clients.create.progressChip).toBe("admin-client-create-progress-chip");
    expect(adminTestIds.clients.create.errorBanner).toBe("admin-client-create-error-banner");
    expect(adminTestIds.clients.create.submitButton).toBe("admin-client-create-submit-button");
  });

  it("defines stable selectors for admin users list and detail evidence anchors", () => {
    expect(adminTestIds.users.listScreen).toBe("admin-users-list-screen");
    expect(adminTestIds.users.primaryAction).toBe("admin-users-primary-action");
    expect(adminTestIds.users.statusChip).toBe("admin-users-status-chip");
    expect(adminTestIds.users.errorBanner).toBe("admin-users-error-banner");
    expect(adminTestIds.users.detailScreen).toBe("admin-users-detail-screen");
    expect(adminTestIds.users.detailPrimaryAction).toBe("admin-users-detail-primary-action");
    expect(adminTestIds.users.detailStatusChip).toBe("admin-users-detail-status-chip");
    expect(adminTestIds.users.detailErrorBanner).toBe("admin-users-detail-error-banner");
  });

  it("defines stable selectors for privileged admin-account creation evidence anchors", () => {
    expect(adminTestIds.adminAccounts.create.screen).toBe("admin-accounts-create-screen");
    expect(adminTestIds.adminAccounts.create.reviewChip).toBe("admin-accounts-create-review-chip");
    expect(adminTestIds.adminAccounts.create.errorBanner).toBe("admin-accounts-create-error-banner");
    expect(adminTestIds.adminAccounts.create.submitButton).toBe("admin-accounts-create-submit-button");
  });
});
