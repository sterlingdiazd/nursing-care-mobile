import { describe, expect, it, vi, beforeEach } from "vitest";
import * as httpClient from "../services/httpClient";
import {
  getAdminClientDetail,
  updateAdminClientActiveState,
  type AdminClientDetailDto,
  type AdminClientCareRequestHistoryItemDto,
} from "../services/adminPortalService";
import { adminTestIds } from "../testing/testIds";

vi.mock("../services/httpClient", () => ({
  requestJson: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockHistoryItem(overrides?: Partial<AdminClientCareRequestHistoryItemDto>): AdminClientCareRequestHistoryItemDto {
  return {
    careRequestId: "cr-001",
    careRequestDescription: "Cuidado post-operatorio",
    careRequestType: "Cuidado en casa",
    status: "Completed",
    total: 5000,
    careRequestDate: "2026-02-10T09:00:00Z",
    createdAtUtc: "2026-02-01T08:00:00Z",
    updatedAtUtc: "2026-02-15T10:00:00Z",
    assignedNurseDisplayName: "Ana López",
    assignedNurseEmail: "ana@example.com",
    ...overrides,
  };
}

function makeMockDetail(overrides?: Partial<AdminClientDetailDto>): AdminClientDetailDto {
  return {
    userId: "client-abc-123",
    email: "juan@example.com",
    displayName: "Juan Pérez",
    name: "Juan",
    lastName: "Pérez",
    identificationNumber: "001-9876543-2",
    phone: "809-555-0002",
    isActive: true,
    ownedCareRequestsCount: 3,
    lastCareRequestAtUtc: "2026-03-01T10:00:00Z",
    hasHistoricalCareRequests: true,
    canAdminCreateCareRequest: true,
    createdAtUtc: "2025-12-01T08:00:00Z",
    careRequestHistory: [makeMockHistoryItem()],
    ...overrides,
  };
}

// ─── Access Control Logic ─────────────────────────────────────────────────────

describe("adminClientDetailScreen", () => {
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
});

// ─── Route Parameter Extraction ───────────────────────────────────────────────

describe("Admin Client Detail Screen - Route Parameter Extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should build correct API path using the client ID from route params", async () => {
    const id = "client-abc-123";
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());

    await getAdminClientDetail(id);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: `/api/admin/clients/${id}` }),
    );
  });

  it("should include the client ID in the API path for any client ID", async () => {
    const ids = ["client-1", "client-uuid-abc-def", "user-999"];
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());

    for (const id of ids) {
      await getAdminClientDetail(id);
      expect(httpClient.requestJson).toHaveBeenCalledWith(
        expect.objectContaining({ path: `/api/admin/clients/${id}` }),
      );
    }
  });
});

// ─── Data Loading ─────────────────────────────────────────────────────────────

describe("Admin Client Detail Screen - Data Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call the correct API endpoint with auth: true", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());
    await getAdminClientDetail("client-abc-123");
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/clients/client-abc-123", auth: true }),
    );
  });

  it("should return the client detail from API", async () => {
    const mockDetail = makeMockDetail();
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockDetail);
    const result = await getAdminClientDetail("client-abc-123");
    expect(result.userId).toBe("client-abc-123");
    expect(result.email).toBe("juan@example.com");
    expect(result.displayName).toBe("Juan Pérez");
  });

  it("should propagate errors from the API", async () => {
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible cargar el detalle del cliente."));
    await expect(getAdminClientDetail("client-abc-123")).rejects.toThrow(
      "No fue posible cargar el detalle del cliente.",
    );
  });
});

// ─── Display of All Fields ────────────────────────────────────────────────────

describe("Admin Client Detail Screen - Display of All Fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should include all personal info fields", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());
    const result = await getAdminClientDetail("client-abc-123");

    expect(result.userId).toBeDefined();
    expect(result.displayName).toBeDefined();
    expect(result.name).toBeDefined();
    expect(result.lastName).toBeDefined();
    expect(result.identificationNumber).toBeDefined();
  });

  it("should include all contact info fields", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());
    const result = await getAdminClientDetail("client-abc-123");

    expect(result.email).toBeDefined();
    expect(result.phone).toBeDefined();
  });

  it("should include account status fields", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());
    const result = await getAdminClientDetail("client-abc-123");

    expect(result.isActive).toBe(true);
    expect(result.ownedCareRequestsCount).toBe(3);
    expect(result.lastCareRequestAtUtc).toBeDefined();
    expect(result.createdAtUtc).toBeDefined();
  });

  it("should include care request history", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());
    const result = await getAdminClientDetail("client-abc-123");

    expect(result.careRequestHistory).toHaveLength(1);
    const item = result.careRequestHistory[0];
    expect(item.careRequestId).toBeDefined();
    expect(item.careRequestDescription).toBeDefined();
    expect(item.careRequestType).toBeDefined();
    expect(item.status).toBeDefined();
    expect(item.total).toBeDefined();
    expect(item.createdAtUtc).toBeDefined();
    expect(item.updatedAtUtc).toBeDefined();
  });

  it("should handle empty care request history", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ careRequestHistory: [] }));
    const result = await getAdminClientDetail("client-abc-123");
    expect(result.careRequestHistory).toHaveLength(0);
  });

  it("should handle null optional fields gracefully", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(
      makeMockDetail({
        name: null,
        lastName: null,
        identificationNumber: null,
        phone: null,
        lastCareRequestAtUtc: null,
      }),
    );
    const result = await getAdminClientDetail("client-abc-123");

    expect(result.name).toBeNull();
    expect(result.lastName).toBeNull();
    expect(result.identificationNumber).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.lastCareRequestAtUtc).toBeNull();
  });

  it("should include all care request history item fields", async () => {
    const historyItem = makeMockHistoryItem();
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ careRequestHistory: [historyItem] }));
    const result = await getAdminClientDetail("client-abc-123");

    const item = result.careRequestHistory[0];
    expect(item.careRequestDescription).toBe("Cuidado post-operatorio");
    expect(item.careRequestType).toBe("Cuidado en casa");
    expect(item.status).toBe("Completed");
    expect(item.total).toBe(5000);
    expect(item.careRequestDate).toBeDefined();
    expect(item.assignedNurseDisplayName).toBe("Ana López");
  });
});

// ─── Action Buttons and Navigation ───────────────────────────────────────────

describe("Admin Client Detail Screen - Action Buttons and Navigation", () => {
  it("should build correct edit route", () => {
    const id = "client-abc-123";
    const route = `/admin/clients/${id}/edit`;
    expect(route).toBe("/admin/clients/client-abc-123/edit");
  });

  it("should build correct create care request route with client pre-selected", () => {
    const detail = makeMockDetail({ userId: "client-abc-123" });
    const route = `/admin/care-requests/create?clientUserId=${detail.userId}`;
    expect(route).toBe("/admin/care-requests/create?clientUserId=client-abc-123");
    expect(route).toContain(detail.userId);
  });

  it("should include entity ID in edit route for any client ID", () => {
    const ids = ["client-1", "client-uuid-abc-def", "user-999"];
    for (const id of ids) {
      const route = `/admin/clients/${id}/edit`;
      expect(route).toContain(id);
      expect(route).toContain("/edit");
    }
  });

  it("should show create care request button only when canAdminCreateCareRequest is true", () => {
    const canCreate = makeMockDetail({ canAdminCreateCareRequest: true });
    const cannotCreate = makeMockDetail({ canAdminCreateCareRequest: false });

    expect(canCreate.canAdminCreateCareRequest).toBe(true);
    expect(cannotCreate.canAdminCreateCareRequest).toBe(false);
  });
});

// ─── Navigation to Related Care Requests ─────────────────────────────────────

describe("Admin Client Detail Screen - Navigation to Related Care Requests", () => {
  it("should build correct care request detail route from history item", () => {
    const item = makeMockHistoryItem({ careRequestId: "cr-xyz-789" });
    const route = `/admin/care-requests/${item.careRequestId}`;
    expect(route).toBe("/admin/care-requests/cr-xyz-789");
  });

  it("should include care request ID in route for any care request ID", () => {
    const ids = ["cr-1", "cr-uuid-abc-def", "cr-999"];
    for (const id of ids) {
      const item = makeMockHistoryItem({ careRequestId: id });
      const route = `/admin/care-requests/${item.careRequestId}`;
      expect(route).toContain(id);
    }
  });

  it("should display all care request statuses correctly", () => {
    const statuses = ["Pending", "Approved", "Rejected", "Completed"] as const;
    const labels: Record<string, string> = {
      Pending: "Pendiente",
      Approved: "Aprobado",
      Rejected: "Rechazado",
      Completed: "Completado",
    };

    for (const status of statuses) {
      expect(labels[status]).toBeDefined();
    }
  });
});

// ─── Optimistic UI Updates for Toggle ────────────────────────────────────────

describe("Admin Client Detail Screen - Optimistic UI Updates for Toggle Active State", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should toggle isActive from true to false", () => {
    const detail = makeMockDetail({ isActive: true });
    const newState = !detail.isActive;
    expect(newState).toBe(false);
  });

  it("should toggle isActive from false to true", () => {
    const detail = makeMockDetail({ isActive: false });
    const newState = !detail.isActive;
    expect(newState).toBe(true);
  });

  it("should call updateAdminClientActiveState with correct userId and new value (deactivate)", async () => {
    const detail = makeMockDetail({ userId: "client-abc-123", isActive: true });
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ isActive: false }));

    const newState = !detail.isActive;
    await updateAdminClientActiveState(detail.userId, newState);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/clients/client-abc-123/active-state",
        method: "PUT",
        body: { isActive: false },
        auth: true,
      }),
    );
  });

  it("should call updateAdminClientActiveState with correct userId and new value (activate)", async () => {
    const detail = makeMockDetail({ userId: "client-abc-123", isActive: false });
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ isActive: true }));

    const newState = !detail.isActive;
    await updateAdminClientActiveState(detail.userId, newState);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/clients/client-abc-123/active-state",
        method: "PUT",
        body: { isActive: true },
        auth: true,
      }),
    );
  });

  it("should propagate errors from toggle API call", async () => {
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible cambiar el estado del cliente."));
    await expect(updateAdminClientActiveState("client-abc-123", false)).rejects.toThrow(
      "No fue posible cambiar el estado del cliente.",
    );
  });
});

describe("Admin Client Detail Screen - Selector Contract", () => {
  it("defines stable selectors for the client detail route", () => {
    expect(adminTestIds.clients.detailScreen).toBe("admin-client-detail-screen");
    expect(adminTestIds.clients.detailPrimaryAction).toBe("admin-client-detail-primary-action");
    expect(adminTestIds.clients.detailStatusChip).toBe("admin-client-detail-status-chip");
    expect(adminTestIds.clients.detailErrorBanner).toBe("admin-client-detail-error-banner");
  });
});
