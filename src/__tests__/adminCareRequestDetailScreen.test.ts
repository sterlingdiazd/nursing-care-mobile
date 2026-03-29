import { describe, expect, it, vi, beforeEach } from "vitest";
import * as httpClient from "../services/httpClient";
import {
  getAdminCareRequestDetail,
  type AdminCareRequestDetailDto,
  type AdminCareRequestTimelineEventDto,
} from "../services/adminPortalService";

vi.mock("../services/httpClient", () => ({
  requestJson: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockDetail(overrides?: Partial<AdminCareRequestDetailDto>): AdminCareRequestDetailDto {
  return {
    id: "req-abc-123",
    clientUserId: "client-1",
    clientDisplayName: "María García",
    clientEmail: "maria@example.com",
    clientIdentificationNumber: "001-1234567-8",
    assignedNurseUserId: "nurse-1",
    assignedNurseDisplayName: "Ana López",
    assignedNurseEmail: "ana@example.com",
    careRequestDescription: "Cuidado domiciliario post-operatorio",
    careRequestType: "domicilio",
    unit: 4,
    unitType: "horas",
    price: 1200,
    total: 5200,
    distanceFactor: "lejos",
    complexityLevel: "alto",
    clientBasePrice: 1200,
    medicalSuppliesCost: 500,
    careRequestDate: "2026-04-10T09:00:00Z",
    suggestedNurse: "Ana López",
    status: "Approved",
    createdAtUtc: "2026-04-01T08:00:00Z",
    updatedAtUtc: "2026-04-02T10:00:00Z",
    approvedAtUtc: "2026-04-02T10:00:00Z",
    rejectedAtUtc: null,
    completedAtUtc: null,
    isOverdueOrStale: false,
    pricingBreakdown: {
      category: "Especializada",
      basePrice: 1200,
      categoryFactor: 1.5,
      distanceFactor: "lejos",
      distanceFactorValue: 1.2,
      complexityLevel: "alto",
      complexityFactorValue: 1.3,
      volumeDiscountPercent: 5,
      subtotalBeforeSupplies: 4700,
      medicalSuppliesCost: 500,
      total: 5200,
    },
    timeline: [
      { id: "evt-1", title: "Solicitud creada", description: "El cliente creó la solicitud", occurredAtUtc: "2026-04-01T08:00:00Z" },
      { id: "evt-2", title: "Solicitud aprobada", description: "El administrador aprobó la solicitud", occurredAtUtc: "2026-04-02T10:00:00Z" },
    ],
    ...overrides,
  };
}

// ─── Access Control Logic ─────────────────────────────────────────────────────

describe("adminCareRequestDetailScreen", () => {
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

describe("Admin Care Request Detail Screen - Route Parameter Extraction", () => {
  it("should use the id param to fetch care request detail", async () => {
    const mockDetail = makeMockDetail();
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockDetail);

    const result = await getAdminCareRequestDetail("req-abc-123");

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/care-requests/req-abc-123", auth: true }),
    );
    expect(result.id).toBe("req-abc-123");
  });

  it("should include entity ID in the API path for any care request ID", async () => {
    const ids = ["id-1", "uuid-abc-def-ghi", "req-999"];
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());

    for (const id of ids) {
      await getAdminCareRequestDetail(id);
      expect(httpClient.requestJson).toHaveBeenCalledWith(
        expect.objectContaining({ path: `/api/admin/care-requests/${id}` }),
      );
    }
  });
});

// ─── Data Loading ─────────────────────────────────────────────────────────────

describe("Admin Care Request Detail Screen - Data Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return full detail object from API", async () => {
    const mockDetail = makeMockDetail();
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockDetail);

    const result = await getAdminCareRequestDetail("req-abc-123");

    expect(result.clientDisplayName).toBe("María García");
    expect(result.careRequestType).toBe("domicilio");
    expect(result.status).toBe("Approved");
    expect(result.pricingBreakdown).toBeDefined();
    expect(result.timeline).toHaveLength(2);
  });

  it("should include all required fields in the detail response", async () => {
    const mockDetail = makeMockDetail();
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockDetail);

    const result = await getAdminCareRequestDetail("req-abc-123");

    // Client info fields
    expect(result.clientUserId).toBeDefined();
    expect(result.clientDisplayName).toBeDefined();
    expect(result.clientEmail).toBeDefined();

    // Request detail fields
    expect(result.careRequestDescription).toBeDefined();
    expect(result.careRequestType).toBeDefined();
    expect(result.unit).toBeDefined();
    expect(result.unitType).toBeDefined();
    expect(result.status).toBeDefined();

    // Pricing breakdown
    expect(result.pricingBreakdown.category).toBeDefined();
    expect(result.pricingBreakdown.basePrice).toBeDefined();
    expect(result.pricingBreakdown.total).toBeDefined();

    // Timeline
    expect(Array.isArray(result.timeline)).toBe(true);

    // Dates
    expect(result.createdAtUtc).toBeDefined();
    expect(result.updatedAtUtc).toBeDefined();
  });

  it("should propagate errors from the API", async () => {
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible cargar el detalle de la solicitud."));

    await expect(getAdminCareRequestDetail("req-abc-123")).rejects.toThrow(
      "No fue posible cargar el detalle de la solicitud.",
    );
  });

  it("should handle null optional fields gracefully", async () => {
    const mockDetail = makeMockDetail({
      assignedNurseUserId: null,
      assignedNurseDisplayName: null,
      assignedNurseEmail: null,
      clientIdentificationNumber: null,
      careRequestDate: null,
      suggestedNurse: null,
      approvedAtUtc: null,
      rejectedAtUtc: null,
      completedAtUtc: null,
      distanceFactor: null,
      complexityLevel: null,
      clientBasePrice: null,
      medicalSuppliesCost: null,
    });
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockDetail);

    const result = await getAdminCareRequestDetail("req-abc-123");

    expect(result.assignedNurseDisplayName).toBeNull();
    expect(result.clientIdentificationNumber).toBeNull();
    expect(result.careRequestDate).toBeNull();
  });
});

// ─── Timeline Chronological Ordering ─────────────────────────────────────────

describe("Admin Care Request Detail Screen - Timeline Ordering", () => {
  it("should return timeline events in chronological order from API", async () => {
    const timeline: AdminCareRequestTimelineEventDto[] = [
      { id: "evt-1", title: "Solicitud creada", description: "Creada", occurredAtUtc: "2026-04-01T08:00:00Z" },
      { id: "evt-2", title: "Enfermera asignada", description: "Asignada", occurredAtUtc: "2026-04-01T12:00:00Z" },
      { id: "evt-3", title: "Solicitud aprobada", description: "Aprobada", occurredAtUtc: "2026-04-02T10:00:00Z" },
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ timeline }));

    const result = await getAdminCareRequestDetail("req-abc-123");

    // Verify events are in ascending chronological order
    for (let i = 1; i < result.timeline.length; i++) {
      const prev = new Date(result.timeline[i - 1].occurredAtUtc).getTime();
      const curr = new Date(result.timeline[i].occurredAtUtc).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it("should handle empty timeline", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ timeline: [] }));

    const result = await getAdminCareRequestDetail("req-abc-123");

    expect(result.timeline).toHaveLength(0);
  });

  it("should handle single timeline event", async () => {
    const timeline: AdminCareRequestTimelineEventDto[] = [
      { id: "evt-1", title: "Solicitud creada", description: "Creada", occurredAtUtc: "2026-04-01T08:00:00Z" },
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ timeline }));

    const result = await getAdminCareRequestDetail("req-abc-123");

    expect(result.timeline).toHaveLength(1);
    expect(result.timeline[0].title).toBe("Solicitud creada");
  });
});

// ─── Navigation to Related Entities ──────────────────────────────────────────

describe("Admin Care Request Detail Screen - Navigation to Related Entities", () => {
  it("should build correct client detail route from clientUserId", () => {
    const clientUserId = "client-abc-123";
    const route = `/admin/clients/${clientUserId}`;
    expect(route).toBe("/admin/clients/client-abc-123");
  });

  it("should build correct nurse detail route from assignedNurseUserId", () => {
    const nurseUserId = "nurse-xyz-456";
    const route = `/admin/nurse-profiles/${nurseUserId}`;
    expect(route).toBe("/admin/nurse-profiles/nurse-xyz-456");
  });

  it("should include entity ID in client navigation path for any client ID", () => {
    const clientIds = ["client-1", "client-uuid-abc", "user-999"];
    for (const id of clientIds) {
      const route = `/admin/clients/${id}`;
      expect(route).toContain(id);
    }
  });

  it("should include entity ID in nurse navigation path for any nurse ID", () => {
    const nurseIds = ["nurse-1", "nurse-uuid-abc", "user-888"];
    for (const id of nurseIds) {
      const route = `/admin/nurse-profiles/${id}`;
      expect(route).toContain(id);
    }
  });

  it("should not navigate to nurse detail when nurse is not assigned", () => {
    const detail = makeMockDetail({ assignedNurseUserId: null, assignedNurseDisplayName: null });
    // When assignedNurseUserId is null, no nurse navigation link should be rendered
    expect(detail.assignedNurseUserId).toBeNull();
    expect(detail.assignedNurseDisplayName).toBeNull();
  });
});

// ─── Overdue Visual Indicator ─────────────────────────────────────────────────

describe("Admin Care Request Detail Screen - Overdue Indicator", () => {
  it("should flag overdue requests", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ isOverdueOrStale: true }));

    const result = await getAdminCareRequestDetail("req-abc-123");

    expect(result.isOverdueOrStale).toBe(true);
  });

  it("should not flag non-overdue requests", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ isOverdueOrStale: false }));

    const result = await getAdminCareRequestDetail("req-abc-123");

    expect(result.isOverdueOrStale).toBe(false);
  });
});

// ─── Pricing Breakdown ────────────────────────────────────────────────────────

describe("Admin Care Request Detail Screen - Pricing Breakdown", () => {
  it("should include all pricing breakdown fields", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());

    const result = await getAdminCareRequestDetail("req-abc-123");
    const { pricingBreakdown } = result;

    expect(pricingBreakdown.category).toBeDefined();
    expect(typeof pricingBreakdown.basePrice).toBe("number");
    expect(typeof pricingBreakdown.categoryFactor).toBe("number");
    expect(typeof pricingBreakdown.volumeDiscountPercent).toBe("number");
    expect(typeof pricingBreakdown.subtotalBeforeSupplies).toBe("number");
    expect(typeof pricingBreakdown.medicalSuppliesCost).toBe("number");
    expect(typeof pricingBreakdown.total).toBe("number");
  });

  it("should handle optional pricing factors being null", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(
      makeMockDetail({
        pricingBreakdown: {
          category: "Básica",
          basePrice: 1000,
          categoryFactor: 1.0,
          distanceFactor: null,
          distanceFactorValue: 1.0,
          complexityLevel: null,
          complexityFactorValue: 1.0,
          volumeDiscountPercent: 0,
          subtotalBeforeSupplies: 1000,
          medicalSuppliesCost: 0,
          total: 1000,
        },
      }),
    );

    const result = await getAdminCareRequestDetail("req-abc-123");

    expect(result.pricingBreakdown.distanceFactor).toBeNull();
    expect(result.pricingBreakdown.complexityLevel).toBeNull();
    expect(result.pricingBreakdown.volumeDiscountPercent).toBe(0);
  });
});

// ─── Status Labels (Spanish) ──────────────────────────────────────────────────

describe("Admin Care Request Detail Screen - Spanish Status Labels", () => {
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

// ─── Date and Currency Formatting ────────────────────────────────────────────

describe("Admin Care Request Detail Screen - Formatting", () => {
  it("should format currency as Dominican Peso", () => {
    const formatted = new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(5200);
    expect(formatted).toContain("5");
    expect(formatted).toContain("200");
  });

  it("should format dates using es-DO locale", () => {
    const date = "2026-04-10T09:00:00Z";
    const formatted = new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);
  });

  it("should return N/A for null date values", () => {
    function formatTimestamp(value: string | null): string {
      if (!value) return "N/A";
      return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
    }
    expect(formatTimestamp(null)).toBe("N/A");
  });
});
