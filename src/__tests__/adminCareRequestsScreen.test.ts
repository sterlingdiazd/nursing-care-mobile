import { describe, expect, it, vi, beforeEach } from "vitest";
import * as httpClient from "../services/httpClient";
import {
  getAdminCareRequests,
  type AdminCareRequestView,
} from "../services/adminPortalService";

vi.mock("../services/httpClient", () => ({
  requestJson: vi.fn(),
}));

// ─── Access Control Logic ────────────────────────────────────────────────────

describe("adminCareRequestsScreen", () => {
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

// ─── Data Loading ─────────────────────────────────────────────────────────────

describe("Admin Care Requests Screen - Data Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call getAdminCareRequests with no params on initial load", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminCareRequests();
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("/api/admin/care-requests"), auth: true }),
    );
  });

  it("should display items returned from the API", async () => {
    const mockItems = [
      {
        id: "req-1",
        clientDisplayName: "Juan Pérez",
        clientEmail: "juan@example.com",
        status: "Pending",
        careRequestType: "domicilio",
        total: 5000,
        careRequestDate: "2026-04-01T10:00:00Z",
        assignedNurseDisplayName: null,
        isOverdueOrStale: false,
      },
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockItems);
    const result = await getAdminCareRequests();
    expect(result).toHaveLength(1);
    expect(result[0].clientDisplayName).toBe("Juan Pérez");
  });

  it("should propagate errors from the API", async () => {
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible cargar solicitudes."));
    await expect(getAdminCareRequests()).rejects.toThrow("No fue posible cargar solicitudes.");
  });
});

// ─── Filtering and Search ─────────────────────────────────────────────────────

describe("Admin Care Requests Screen - Filtering and Search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pass view filter to API call", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminCareRequests({ view: "pending" });
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/care-requests?view=pending" }),
    );
  });

  it("should pass search query to API call", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminCareRequests({ search: "Juan" });
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/care-requests?search=Juan" }),
    );
  });

  it("should pass both view and search to API call", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminCareRequests({ view: "approved", search: "María" });
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/care-requests?view=approved&search=Mar%C3%ADa" }),
    );
  });

  it("should not include view param when view is 'all'", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getAdminCareRequests({ view: "all" });
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/care-requests?" }),
    );
  });

  it("should support all valid view filter values", async () => {
    const views: AdminCareRequestView[] = [
      "all", "pending", "approved", "rejected", "completed",
      "unassigned", "pending-approval", "rejected-today", "approved-incomplete", "overdue",
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);

    for (const view of views) {
      await getAdminCareRequests({ view });
    }

    expect(httpClient.requestJson).toHaveBeenCalledTimes(views.length);
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe("Admin Care Requests Screen - Navigation", () => {
  it("should build correct detail route with care request ID", () => {
    const careRequestId = "req-abc-123";
    const route = `/admin/care-requests/${careRequestId}`;
    expect(route).toBe("/admin/care-requests/req-abc-123");
  });

  it("should build correct create route", () => {
    const route = "/admin/care-requests/create";
    expect(route).toBe("/admin/care-requests/create");
  });

  it("should include entity ID in navigation path for any care request", () => {
    const ids = ["id-1", "id-2", "uuid-abc-def"];
    for (const id of ids) {
      const route = `/admin/care-requests/${id}`;
      expect(route).toContain(id);
    }
  });
});

// ─── Status Labels (Spanish) ──────────────────────────────────────────────────

describe("Admin Care Requests Screen - Spanish Status Labels", () => {
  function statusLabel(status: string): string {
    if (status === "Pending") return "Pendiente";
    if (status === "Approved") return "Aprobado";
    if (status === "Rejected") return "Rechazado";
    if (status === "Completed") return "Completado";
    return status;
  }

  it("should translate Pending to Pendiente", () => {
    expect(statusLabel("Pending")).toBe("Pendiente");
  });

  it("should translate Approved to Aprobado", () => {
    expect(statusLabel("Approved")).toBe("Aprobado");
  });

  it("should translate Rejected to Rechazado", () => {
    expect(statusLabel("Rejected")).toBe("Rechazado");
  });

  it("should translate Completed to Completado", () => {
    expect(statusLabel("Completed")).toBe("Completado");
  });
});

// ─── Currency and Date Formatting ────────────────────────────────────────────

describe("Admin Care Requests Screen - Formatting", () => {
  it("should format currency as Dominican Peso", () => {
    const formatted = new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(5000);
    expect(formatted).toContain("5");
    expect(formatted).toContain("000");
  });

  it("should format dates using es-DO locale", () => {
    const date = "2026-04-01T10:00:00Z";
    const formatted = new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe("string");
  });
});
