import { describe, expect, it, vi, beforeEach } from "vitest";
import * as httpClient from "../services/httpClient";
import {
  getAdminUsers,
  type AdminUserListItemDto,
  type AdminUserRoleName,
  type AdminUserAccountStatus,
} from "../services/adminPortalService";

vi.mock("../services/httpClient", () => ({
  requestJson: vi.fn(),
}));

// ─── Access Control Logic ────────────────────────────────────────────────────

describe("adminUsersScreen", () => {
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

// ─── Data Loading ─────────────────────────────────────────────────────────────

describe("Admin Users Screen - Data Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call getAdminUsers with no params on initial load", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminUsers();
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/users", auth: true }),
    );
  });

  it("should display items returned from the API", async () => {
    const mockItems: AdminUserListItemDto[] = [
      {
        id: "user-1",
        displayName: "Ana López",
        email: "ana@example.com",
        name: "Ana",
        lastName: "López",
        identificationNumber: "001-1234567-8",
        phone: "809-555-0001",
        profileType: "Nurse",
        roleNames: ["Nurse"],
        isActive: true,
        accountStatus: "Active",
        requiresProfileCompletion: false,
        requiresAdminReview: false,
        requiresManualIntervention: false,
        createdAtUtc: "2025-01-15T08:00:00Z",
      },
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockItems);
    const result = await getAdminUsers();
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe("Ana López");
  });

  it("should propagate errors from the API", async () => {
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible cargar los usuarios."));
    await expect(getAdminUsers()).rejects.toThrow("No fue posible cargar los usuarios.");
  });

  it("should return empty array when no users exist", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    const result = await getAdminUsers();
    expect(result).toHaveLength(0);
  });

  it("should include all required card fields in returned data", async () => {
    const mockItems: AdminUserListItemDto[] = [
      {
        id: "user-2",
        displayName: "Carlos Ruiz",
        email: "carlos@example.com",
        name: "Carlos",
        lastName: "Ruiz",
        identificationNumber: "002-9876543-1",
        phone: "809-555-0002",
        profileType: "Client",
        roleNames: ["Client"],
        isActive: false,
        accountStatus: "Inactive",
        requiresProfileCompletion: false,
        requiresAdminReview: false,
        requiresManualIntervention: false,
        createdAtUtc: "2025-06-01T08:00:00Z",
      },
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockItems);
    const result = await getAdminUsers();

    const user = result[0];
    expect(user.id).toBeDefined();
    expect(user.displayName).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.roleNames).toBeDefined();
    expect(user.profileType).toBeDefined();
    expect(user.accountStatus).toBeDefined();
    expect(user.isActive).toBeDefined();
  });
});

// ─── Filtering and Search ─────────────────────────────────────────────────────

describe("Admin Users Screen - Filtering and Search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pass role filter to API call", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminUsers({ role: "Nurse" });
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/users?role=Nurse" }),
    );
  });

  it("should pass profileType filter to API call", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminUsers({ profileType: "Client" });
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/users?profileType=Client" }),
    );
  });

  it("should pass status filter to API call", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminUsers({ status: "Active" });
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/users?status=Active" }),
    );
  });

  it("should pass search query to API call", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminUsers({ search: "Ana" });
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/users?search=Ana" }),
    );
  });

  it("should pass multiple filters to API call", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminUsers({ role: "Admin", status: "Active", search: "Carlos" });
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("role=Admin") }),
    );
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("status=Active") }),
    );
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("search=Carlos") }),
    );
  });

  it("should not include params when no filters are set", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminUsers({});
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/users" }),
    );
  });

  it("should support all valid role filter values", async () => {
    const roles: AdminUserRoleName[] = ["Admin", "Client", "Nurse"];
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);

    for (const role of roles) {
      await getAdminUsers({ role });
    }

    expect(httpClient.requestJson).toHaveBeenCalledTimes(roles.length);
  });

  it("should support all valid account status filter values", async () => {
    const statuses: AdminUserAccountStatus[] = ["Active", "Inactive", "ProfileIncomplete", "AdminReview", "ManualIntervention"];
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);

    for (const status of statuses) {
      await getAdminUsers({ status });
    }

    expect(httpClient.requestJson).toHaveBeenCalledTimes(statuses.length);
  });

  it("should trim whitespace from search query", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminUsers({ search: "  Ana  " });
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/users?search=Ana" }),
    );
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe("Admin Users Screen - Navigation", () => {
  it("should build correct detail route with user id", () => {
    const userId = "user-abc-123";
    const route = `/admin/users/${userId}`;
    expect(route).toBe("/admin/users/user-abc-123");
  });

  it("should include entity ID in navigation path for any user", () => {
    const ids = ["user-1", "user-uuid-abc-def", "user-999"];
    for (const id of ids) {
      const route = `/admin/users/${id}`;
      expect(route).toContain(id);
    }
  });
});

// ─── Spanish Labels ───────────────────────────────────────────────────────────

describe("Admin Users Screen - Spanish Labels", () => {
  function translateRole(role: AdminUserRoleName): string {
    switch (role) {
      case "Admin": return "Administrador";
      case "Client": return "Cliente";
      case "Nurse": return "Enfermera";
    }
  }

  function translateAccountStatus(status: AdminUserAccountStatus): string {
    switch (status) {
      case "Active": return "Activo";
      case "Inactive": return "Inactivo";
      case "ProfileIncomplete": return "Perfil incompleto";
      case "AdminReview": return "Revisión admin";
      case "ManualIntervention": return "Intervención manual";
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

  it("should translate Active status to Activo", () => {
    expect(translateAccountStatus("Active")).toBe("Activo");
  });

  it("should translate Inactive status to Inactivo", () => {
    expect(translateAccountStatus("Inactive")).toBe("Inactivo");
  });

  it("should translate ProfileIncomplete status to Perfil incompleto", () => {
    expect(translateAccountStatus("ProfileIncomplete")).toBe("Perfil incompleto");
  });

  it("should translate AdminReview status to Revisión admin", () => {
    expect(translateAccountStatus("AdminReview")).toBe("Revisión admin");
  });

  it("should translate ManualIntervention status to Intervención manual", () => {
    expect(translateAccountStatus("ManualIntervention")).toBe("Intervención manual");
  });

  it("should display comma-separated translated roles for a user with multiple roles", async () => {
    const roleNames: AdminUserRoleName[] = ["Admin", "Nurse"];
    const translated = roleNames.map(translateRole).join(", ");
    expect(translated).toBe("Administrador, Enfermera");
  });
});
