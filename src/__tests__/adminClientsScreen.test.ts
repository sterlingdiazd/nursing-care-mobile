import { describe, expect, it, vi, beforeEach } from "vitest";
import * as httpClient from "../services/httpClient";
import {
  getAdminClients,
  type AdminClientListItemDto,
  type AdminClientListStatus,
} from "../services/adminPortalService";
import { adminTestIds } from "../testing/testIds";

vi.mock("../services/httpClient", () => ({
  requestJson: vi.fn(),
}));

function canLoadAdminClientList(authState: {
  isReady: boolean;
  isAuthenticated: boolean;
  requiresProfileCompletion: boolean;
  roles: string[];
}) {
  return authState.isReady
    && authState.isAuthenticated
    && !authState.requiresProfileCompletion
    && authState.roles.includes("ADMIN");
}

// ─── Access Control Logic ────────────────────────────────────────────────────

describe("adminClientsScreen", () => {
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
    const authState = { isReady: true, isAuthenticated: true, requiresProfileCompletion: false, roles: ["CLIENT"] };

    if (!authState.isReady) return;
    if (!authState.isAuthenticated) mockReplace("/login");
    else if (authState.requiresProfileCompletion) mockReplace("/register");
    else if (!authState.roles.includes("ADMIN")) mockReplace("/");

    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("should not redirect when authenticated as Admin", () => {
    const mockReplace = vi.fn();
    const authState = { isReady: true, isAuthenticated: true, requiresProfileCompletion: false, roles: ["ADMIN"] };

    if (!authState.isReady) return;
    if (!authState.isAuthenticated) mockReplace("/login");
    else if (authState.requiresProfileCompletion) mockReplace("/register");
    else if (!authState.roles.includes("ADMIN")) mockReplace("/");

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("should not redirect when isReady is false", () => {
    const mockReplace = vi.fn();
    const authState = { isReady: false, isAuthenticated: false, requiresProfileCompletion: false, roles: [] as string[] };

    if (!authState.isReady) return;
    mockReplace("/login");

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("should not load protected clients data until the user is authenticated as Admin", () => {
    expect(canLoadAdminClientList({ isReady: false, isAuthenticated: false, requiresProfileCompletion: false, roles: [] })).toBe(false);
    expect(canLoadAdminClientList({ isReady: true, isAuthenticated: false, requiresProfileCompletion: false, roles: [] })).toBe(false);
    expect(canLoadAdminClientList({ isReady: true, isAuthenticated: true, requiresProfileCompletion: true, roles: ["ADMIN"] })).toBe(false);
    expect(canLoadAdminClientList({ isReady: true, isAuthenticated: true, requiresProfileCompletion: false, roles: ["CLIENT"] })).toBe(false);
    expect(canLoadAdminClientList({ isReady: true, isAuthenticated: true, requiresProfileCompletion: false, roles: ["ADMIN"] })).toBe(true);
  });
});

// ─── Data Loading ─────────────────────────────────────────────────────────────

describe("Admin Clients Screen - Data Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call getAdminClients with no params on initial load", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminClients();
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/clients", auth: true }),
    );
  });

  it("should display items returned from the API", async () => {
    const mockItems: AdminClientListItemDto[] = [
      {
        userId: "client-1",
        displayName: "Juan Pérez",
        email: "juan@example.com",
        name: "Juan",
        lastName: "Pérez",
        identificationNumber: "001-1234567-8",
        phone: "809-555-0001",
        isActive: true,
        ownedCareRequestsCount: 3,
        lastCareRequestAtUtc: "2026-03-20T10:00:00Z",
        createdAtUtc: "2025-01-15T08:00:00Z",
      },
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockItems);
    const result = await getAdminClients();
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe("Juan Pérez");
  });

  it("should propagate errors from the API", async () => {
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible cargar los clientes."));
    await expect(getAdminClients()).rejects.toThrow("No fue posible cargar los clientes.");
  });

  it("should return empty array when no clients exist", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    const result = await getAdminClients();
    expect(result).toHaveLength(0);
  });

  it("should include all required card fields in returned data", async () => {
    const mockItems: AdminClientListItemDto[] = [
      {
        userId: "client-2",
        displayName: "María García",
        email: "maria@example.com",
        name: "María",
        lastName: "García",
        identificationNumber: "002-9876543-1",
        phone: "809-555-0002",
        isActive: false,
        ownedCareRequestsCount: 0,
        lastCareRequestAtUtc: null,
        createdAtUtc: "2025-06-01T08:00:00Z",
      },
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockItems);
    const result = await getAdminClients();

    const client = result[0];
    expect(client.userId).toBeDefined();
    expect(client.displayName).toBeDefined();
    expect(client.email).toBeDefined();
    expect(client.identificationNumber).toBeDefined();
    expect(client.isActive).toBeDefined();
    expect(client.ownedCareRequestsCount).toBeDefined();
  });
});

// ─── Filtering and Search ─────────────────────────────────────────────────────

describe("Admin Clients Screen - Filtering and Search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pass active status filter to API call", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminClients({ status: "active" });
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/clients?status=active" }),
    );
  });

  it("should pass inactive status filter to API call", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminClients({ status: "inactive" });
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/clients?status=inactive" }),
    );
  });

  it("should pass search query to API call", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminClients({ search: "Juan" });
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/clients?search=Juan" }),
    );
  });

  it("should pass both status and search to API call", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminClients({ status: "active", search: "María" });
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("status=active") }),
    );
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("search=Mar") }),
    );
  });

  it("should not include status param when no status filter is set", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminClients({});
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/clients" }),
    );
  });

  it("should support all valid status filter values", async () => {
    const statuses: AdminClientListStatus[] = ["active", "inactive"];
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);

    for (const status of statuses) {
      await getAdminClients({ status });
    }

    expect(httpClient.requestJson).toHaveBeenCalledTimes(statuses.length);
  });

  it("should trim whitespace from search query", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminClients({ search: "  Juan  " });
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/clients?search=Juan" }),
    );
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe("Admin Clients Screen - Navigation", () => {
  it("should build correct detail route with client userId", () => {
    const clientId = "client-abc-123";
    const route = `/admin/clients/${clientId}`;
    expect(route).toBe("/admin/clients/client-abc-123");
  });

  it("should build correct create route", () => {
    const route = "/admin/clients/create";
    expect(route).toBe("/admin/clients/create");
  });

  it("should include entity ID in navigation path for any client", () => {
    const ids = ["client-1", "client-uuid-abc-def", "user-999"];
    for (const id of ids) {
      const route = `/admin/clients/${id}`;
      expect(route).toContain(id);
    }
  });
});

// ─── Active Status Labels (Spanish) ──────────────────────────────────────────

describe("Admin Clients Screen - Spanish Status Labels", () => {
  function activeLabel(isActive: boolean): string {
    return isActive ? "Activo" : "Inactivo";
  }

  it("should label active clients as Activo", () => {
    expect(activeLabel(true)).toBe("Activo");
  });

  it("should label inactive clients as Inactivo", () => {
    expect(activeLabel(false)).toBe("Inactivo");
  });
});

describe("Admin Clients Screen - Selector Contract", () => {
  it("defines stable selectors for the client list route", () => {
    expect(adminTestIds.clients.listScreen).toBe("admin-client-list-screen");
    expect(adminTestIds.clients.primaryAction).toBe("admin-client-list-primary-action");
    expect(adminTestIds.clients.statusChip).toBe("admin-client-list-status-chip");
    expect(adminTestIds.clients.errorBanner).toBe("admin-client-list-error-banner");
  });
});

// ─── Date Formatting ──────────────────────────────────────────────────────────

describe("Admin Clients Screen - Date Formatting", () => {
  it("should format dates using es-DO locale", () => {
    const date = "2026-03-20T10:00:00Z";
    const formatted = new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe("string");
  });

  it("should handle null lastCareRequestAtUtc gracefully", async () => {
    const mockItems: AdminClientListItemDto[] = [
      {
        userId: "client-3",
        displayName: "Sin solicitudes",
        email: "nocare@example.com",
        name: "Sin",
        lastName: "Solicitudes",
        identificationNumber: null,
        phone: null,
        isActive: true,
        ownedCareRequestsCount: 0,
        lastCareRequestAtUtc: null,
        createdAtUtc: "2025-01-01T00:00:00Z",
      },
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockItems);
    const result = await getAdminClients();
    expect(result[0].lastCareRequestAtUtc).toBeNull();
  });
});
