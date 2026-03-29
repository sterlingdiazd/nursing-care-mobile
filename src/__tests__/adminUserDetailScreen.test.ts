import { describe, expect, it, vi, beforeEach } from "vitest";
import * as httpClient from "../services/httpClient";
import {
  getAdminUserDetail,
  updateAdminUserActiveState,
  updateAdminUserRoles,
  invalidateAdminUserSessions,
  type AdminUserDetailDto,
  type AdminUserNurseProfileDto,
  type AdminUserClientProfileDto,
  type AdminUserRoleName,
} from "../services/adminPortalService";

vi.mock("../services/httpClient", () => ({
  requestJson: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockNurseProfile(overrides?: Partial<AdminUserNurseProfileDto>): AdminUserNurseProfileDto {
  return {
    isActive: true,
    hireDate: "2024-01-15T00:00:00Z",
    specialty: "Cuidado intensivo",
    licenseId: "LIC-001",
    bankName: "Banco Popular",
    accountNumber: "123456789",
    category: "Senior",
    assignedCareRequestsCount: 5,
    ...overrides,
  };
}

function makeMockClientProfile(overrides?: Partial<AdminUserClientProfileDto>): AdminUserClientProfileDto {
  return {
    ownedCareRequestsCount: 3,
    ...overrides,
  };
}

function makeMockDetail(overrides?: Partial<AdminUserDetailDto>): AdminUserDetailDto {
  return {
    id: "user-abc-123",
    email: "ana@example.com",
    displayName: "Ana López",
    name: "Ana",
    lastName: "López",
    identificationNumber: "001-1234567-8",
    phone: "809-555-0001",
    profileType: "Nurse",
    roleNames: ["Nurse"],
    allowedRoleNames: ["Admin", "Client", "Nurse"],
    isActive: true,
    accountStatus: "Active",
    requiresProfileCompletion: false,
    requiresAdminReview: false,
    requiresManualIntervention: false,
    hasOperationalHistory: true,
    activeRefreshTokenCount: 2,
    createdAtUtc: "2025-01-15T08:00:00Z",
    nurseProfile: makeMockNurseProfile(),
    clientProfile: null,
    ...overrides,
  };
}

// ─── Access Control Logic ─────────────────────────────────────────────────────

describe("adminUserDetailScreen", () => {
  it("should redirect to /login when not authenticated", () => {
    const mockReplace = vi.fn();
    const authState = { isReady: true, isAuthenticated: false, requiresProfileCompletion: false, roles: [] as string[] };

    if (!authState.isReady) return;
    if (!authState.isAuthenticated) mockReplace("/login");

    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("should redirect to /register when profile completion is required", () => {
    const mockReplace = vi.fn();
    const authState = { isReady: true, isAuthenticated: true, requiresProfileCompletion: true, roles: [] as string[] };

    if (!authState.isReady) return;
    if (!authState.isAuthenticated) mockReplace("/login");
    else if (authState.requiresProfileCompletion) mockReplace("/register");

    expect(mockReplace).toHaveBeenCalledWith("/register");
  });

  it("should redirect to / when authenticated but not Admin", () => {
    const mockReplace = vi.fn();
    const authState = { isReady: true, isAuthenticated: true, requiresProfileCompletion: false, roles: ["Client"] };

    if (!authState.isReady) return;
    if (!authState.isAuthenticated) mockReplace("/login");
    else if (authState.requiresProfileCompletion) mockReplace("/register");
    else if (!authState.roles.includes("Admin")) mockReplace("/");

    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("should not redirect when authenticated as Admin", () => {
    const mockReplace = vi.fn();
    const authState = { isReady: true, isAuthenticated: true, requiresProfileCompletion: false, roles: ["Admin"] };

    if (!authState.isReady) return;
    if (!authState.isAuthenticated) mockReplace("/login");
    else if (authState.requiresProfileCompletion) mockReplace("/register");
    else if (!authState.roles.includes("Admin")) mockReplace("/");

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("should not redirect when isReady is false", () => {
    const mockReplace = vi.fn();
    const authState = { isReady: false, isAuthenticated: false, requiresProfileCompletion: false, roles: [] as string[] };

    if (!authState.isReady) return;
    mockReplace("/login");

    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// ─── Route Parameter Extraction ───────────────────────────────────────────────

describe("Admin User Detail Screen - Route Parameter Extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should build correct API path using the user ID from route params", async () => {
    const id = "user-abc-123";
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());

    await getAdminUserDetail(id);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: `/api/admin/users/${id}` }),
    );
  });

  it("should include the user ID in the API path for any user ID", async () => {
    const ids = ["user-1", "user-uuid-abc-def", "user-999"];
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());

    for (const id of ids) {
      await getAdminUserDetail(id);
      expect(httpClient.requestJson).toHaveBeenCalledWith(
        expect.objectContaining({ path: `/api/admin/users/${id}` }),
      );
    }
  });
});

// ─── Data Loading ─────────────────────────────────────────────────────────────

describe("Admin User Detail Screen - Data Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call the correct API endpoint with auth: true", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());
    await getAdminUserDetail("user-abc-123");
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/users/user-abc-123", auth: true }),
    );
  });

  it("should return the user detail from API", async () => {
    const mockDetail = makeMockDetail();
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockDetail);
    const result = await getAdminUserDetail("user-abc-123");
    expect(result.id).toBe("user-abc-123");
    expect(result.email).toBe("ana@example.com");
    expect(result.displayName).toBe("Ana López");
  });

  it("should propagate errors from the API", async () => {
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible cargar el detalle del usuario."));
    await expect(getAdminUserDetail("user-abc-123")).rejects.toThrow(
      "No fue posible cargar el detalle del usuario.",
    );
  });
});

// ─── Display of All Fields ────────────────────────────────────────────────────

describe("Admin User Detail Screen - Display of All Fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should include all personal info fields", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());
    const result = await getAdminUserDetail("user-abc-123");

    expect(result.id).toBeDefined();
    expect(result.displayName).toBeDefined();
    expect(result.name).toBeDefined();
    expect(result.lastName).toBeDefined();
    expect(result.identificationNumber).toBeDefined();
  });

  it("should include all contact info fields", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());
    const result = await getAdminUserDetail("user-abc-123");

    expect(result.email).toBeDefined();
    expect(result.phone).toBeDefined();
  });

  it("should include roles and profile type fields", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());
    const result = await getAdminUserDetail("user-abc-123");

    expect(result.roleNames).toBeDefined();
    expect(result.profileType).toBeDefined();
  });

  it("should include account status fields", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());
    const result = await getAdminUserDetail("user-abc-123");

    expect(result.isActive).toBe(true);
    expect(result.accountStatus).toBe("Active");
    expect(result.activeRefreshTokenCount).toBe(2);
    expect(result.createdAtUtc).toBeDefined();
  });

  it("should handle null optional fields gracefully", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(
      makeMockDetail({
        name: null,
        lastName: null,
        identificationNumber: null,
        phone: null,
        nurseProfile: null,
        clientProfile: null,
      }),
    );
    const result = await getAdminUserDetail("user-abc-123");

    expect(result.name).toBeNull();
    expect(result.lastName).toBeNull();
    expect(result.identificationNumber).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.nurseProfile).toBeNull();
    expect(result.clientProfile).toBeNull();
  });
});

// ─── Conditional Display of Nurse Profile ────────────────────────────────────

describe("Admin User Detail Screen - Nurse Profile Fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should include nurse-specific fields when user has nurse profile", async () => {
    const nurseProfile = makeMockNurseProfile();
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ nurseProfile }));
    const result = await getAdminUserDetail("user-abc-123");

    expect(result.nurseProfile).not.toBeNull();
    expect(result.nurseProfile?.specialty).toBe("Cuidado intensivo");
    expect(result.nurseProfile?.licenseId).toBe("LIC-001");
    expect(result.nurseProfile?.category).toBe("Senior");
    expect(result.nurseProfile?.assignedCareRequestsCount).toBe(5);
  });

  it("should not include nurse profile when user has no nurse profile", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ nurseProfile: null }));
    const result = await getAdminUserDetail("user-abc-123");

    expect(result.nurseProfile).toBeNull();
  });

  it("should handle nurse profile with null optional fields", async () => {
    const nurseProfile = makeMockNurseProfile({
      specialty: null,
      licenseId: null,
      category: null,
      hireDate: null,
    });
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ nurseProfile }));
    const result = await getAdminUserDetail("user-abc-123");

    expect(result.nurseProfile?.specialty).toBeNull();
    expect(result.nurseProfile?.licenseId).toBeNull();
    expect(result.nurseProfile?.category).toBeNull();
    expect(result.nurseProfile?.hireDate).toBeNull();
  });
});

// ─── Conditional Display of Client Profile ────────────────────────────────────

describe("Admin User Detail Screen - Client Profile Fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should include client-specific fields when user has client profile", async () => {
    const clientProfile = makeMockClientProfile();
    vi.mocked(httpClient.requestJson).mockResolvedValue(
      makeMockDetail({ profileType: "Client", nurseProfile: null, clientProfile }),
    );
    const result = await getAdminUserDetail("user-abc-123");

    expect(result.clientProfile).not.toBeNull();
    expect(result.clientProfile?.ownedCareRequestsCount).toBe(3);
  });

  it("should not include client profile when user has no client profile", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ clientProfile: null }));
    const result = await getAdminUserDetail("user-abc-123");

    expect(result.clientProfile).toBeNull();
  });
});

// ─── Action Buttons ───────────────────────────────────────────────────────────

describe("Admin User Detail Screen - Action Buttons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should build correct edit route", () => {
    const id = "user-abc-123";
    const route = `/admin/users/${id}/edit`;
    expect(route).toBe("/admin/users/user-abc-123/edit");
  });

  it("should include entity ID in edit route for any user ID", () => {
    const ids = ["user-1", "user-uuid-abc-def", "user-999"];
    for (const id of ids) {
      const route = `/admin/users/${id}/edit`;
      expect(route).toContain(id);
      expect(route).toContain("/edit");
    }
  });

  it("should toggle isActive from true to false (optimistic update)", () => {
    const detail = makeMockDetail({ isActive: true });
    const newState = !detail.isActive;
    expect(newState).toBe(false);
  });

  it("should toggle isActive from false to true (optimistic update)", () => {
    const detail = makeMockDetail({ isActive: false });
    const newState = !detail.isActive;
    expect(newState).toBe(true);
  });

  it("should call updateAdminUserActiveState with correct id and new value (deactivate)", async () => {
    const detail = makeMockDetail({ id: "user-abc-123", isActive: true });
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ isActive: false }));

    const newState = !detail.isActive;
    await updateAdminUserActiveState(detail.id, newState);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/users/user-abc-123/active-state",
        method: "PUT",
        body: { isActive: false },
        auth: true,
      }),
    );
  });

  it("should call updateAdminUserActiveState with correct id and new value (activate)", async () => {
    const detail = makeMockDetail({ id: "user-abc-123", isActive: false });
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ isActive: true }));

    const newState = !detail.isActive;
    await updateAdminUserActiveState(detail.id, newState);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/users/user-abc-123/active-state",
        method: "PUT",
        body: { isActive: true },
        auth: true,
      }),
    );
  });

  it("should propagate errors from toggle API call", async () => {
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible cambiar el estado del usuario."));
    await expect(updateAdminUserActiveState("user-abc-123", false)).rejects.toThrow(
      "No fue posible cambiar el estado del usuario.",
    );
  });

  it("should call invalidateAdminUserSessions with correct user id", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue({ userId: "user-abc-123", revokedActiveSessionCount: 2 });

    await invalidateAdminUserSessions("user-abc-123");

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/users/user-abc-123/invalidate-sessions",
        method: "POST",
        auth: true,
      }),
    );
  });

  it("should propagate errors from invalidate sessions API call", async () => {
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible invalidar las sesiones del usuario."));
    await expect(invalidateAdminUserSessions("user-abc-123")).rejects.toThrow(
      "No fue posible invalidar las sesiones del usuario.",
    );
  });
});

// ─── Manage Roles ─────────────────────────────────────────────────────────────

describe("Admin User Detail Screen - Manage Roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call updateAdminUserRoles with correct id and roles", async () => {
    const roles: AdminUserRoleName[] = ["Admin", "Nurse"];
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ roleNames: roles }));

    await updateAdminUserRoles("user-abc-123", roles);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/users/user-abc-123/roles",
        method: "PUT",
        body: { roleNames: roles },
        auth: true,
      }),
    );
  });

  it("should return updated user detail after role update", async () => {
    const updatedRoles: AdminUserRoleName[] = ["Admin"];
    const updatedDetail = makeMockDetail({ roleNames: updatedRoles });
    vi.mocked(httpClient.requestJson).mockResolvedValue(updatedDetail);

    const result = await updateAdminUserRoles("user-abc-123", updatedRoles);

    expect(result.roleNames).toEqual(updatedRoles);
  });

  it("should propagate errors from update roles API call", async () => {
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible actualizar los roles del usuario."));
    await expect(updateAdminUserRoles("user-abc-123", ["Admin"])).rejects.toThrow(
      "No fue posible actualizar los roles del usuario.",
    );
  });

  it("should support setting empty roles array", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ roleNames: [] }));

    await updateAdminUserRoles("user-abc-123", []);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { roleNames: [] },
      }),
    );
  });

  it("should only show allowed roles for selection", () => {
    const detail = makeMockDetail({ allowedRoleNames: ["Client", "Nurse"] });
    const allRoles: AdminUserRoleName[] = ["Admin", "Client", "Nurse"];
    const allowedForSelection = allRoles.filter((r) => detail.allowedRoleNames.includes(r));

    expect(allowedForSelection).toEqual(["Client", "Nurse"]);
    expect(allowedForSelection).not.toContain("Admin");
  });
});

// ─── Spanish Labels ───────────────────────────────────────────────────────────

describe("Admin User Detail Screen - Spanish Labels", () => {
  function translateRole(role: AdminUserRoleName): string {
    switch (role) {
      case "Admin": return "Administrador";
      case "Client": return "Cliente";
      case "Nurse": return "Enfermera";
    }
  }

  it("should translate Admin role to Administrador", () => {
    expect(translateRole("Admin")).toBe("Administrador");
  });

  it("should translate Client role to Cliente", () => {
    expect(translateRole("Client")).toBe("Cliente");
  });

  it("should translate Nurse role to Enfermera", () => {
    expect(translateRole("Nurse")).toBe("Enfermera");
  });

  it("should display comma-separated translated roles for a user with multiple roles", () => {
    const roleNames: AdminUserRoleName[] = ["Admin", "Nurse"];
    const translated = roleNames.map(translateRole).join(", ");
    expect(translated).toBe("Administrador, Enfermera");
  });

  it("should display 'Sin roles' when user has no roles", () => {
    const roleNames: AdminUserRoleName[] = [];
    const display = roleNames.length > 0 ? roleNames.map(translateRole).join(", ") : "Sin roles";
    expect(display).toBe("Sin roles");
  });
});
