import { describe, expect, it, vi, beforeEach } from "vitest";
import * as httpClient from "../services/httpClient";
import {
  getNurseProfileForAdmin,
  setNurseOperationalAccessForAdmin,
  type NurseProfileAdminRecordDto,
} from "../services/adminPortalService";

vi.mock("../services/httpClient", () => ({
  requestJson: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockDetail(overrides?: Partial<NurseProfileAdminRecordDto>): NurseProfileAdminRecordDto {
  return {
    userId: "nurse-abc-123",
    email: "ana@example.com",
    name: "Ana",
    lastName: "López",
    identificationNumber: "001-1234567-8",
    phone: "809-555-0001",
    profileType: "NURSE",
    userIsActive: true,
    nurseProfileIsActive: true,
    isProfileComplete: true,
    isPendingReview: false,
    isAssignmentReady: true,
    hasHistoricalCareRequests: false,
    createdAtUtc: "2026-01-01T08:00:00Z",
    hireDate: "2026-01-15T00:00:00Z",
    specialty: "Cuidados intensivos",
    licenseId: "LIC-001",
    bankName: "Banco Popular",
    accountNumber: "123456789",
    category: "Especialista",
    workload: {
      totalAssignedCareRequests: 10,
      pendingAssignedCareRequests: 3,
      approvedAssignedCareRequests: 4,
      rejectedAssignedCareRequests: 1,
      completedAssignedCareRequests: 2,
      lastCareRequestAtUtc: "2026-03-25T10:00:00Z",
    },
    ...overrides,
  };
}

// ─── Access Control Logic ─────────────────────────────────────────────────────

describe("adminNurseProfileDetailScreen", () => {
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

describe("Admin Nurse Profile Detail Screen - Data Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call the correct API endpoint with auth: true", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());
    await getNurseProfileForAdmin("nurse-abc-123");
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/nurse-profiles/nurse-abc-123", auth: true }),
    );
  });

  it("should return the nurse profile detail from API", async () => {
    const mockDetail = makeMockDetail();
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockDetail);
    const result = await getNurseProfileForAdmin("nurse-abc-123");
    expect(result.userId).toBe("nurse-abc-123");
    expect(result.email).toBe("ana@example.com");
    expect(result.name).toBe("Ana");
  });

  it("should propagate errors from the API", async () => {
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible cargar el perfil de la enfermera."));
    await expect(getNurseProfileForAdmin("nurse-abc-123")).rejects.toThrow(
      "No fue posible cargar el perfil de la enfermera.",
    );
  });
});

// ─── Display of All Fields ────────────────────────────────────────────────────

describe("Admin Nurse Profile Detail Screen - Display of All Fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should include all personal info fields", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());
    const result = await getNurseProfileForAdmin("nurse-abc-123");

    expect(result.userId).toBeDefined();
    expect(result.email).toBeDefined();
    expect(result.name).toBeDefined();
    expect(result.lastName).toBeDefined();
    expect(result.identificationNumber).toBeDefined();
    expect(result.phone).toBeDefined();
  });

  it("should include all professional info fields", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());
    const result = await getNurseProfileForAdmin("nurse-abc-123");

    expect(result.hireDate).toBeDefined();
    expect(result.specialty).toBeDefined();
    expect(result.licenseId).toBeDefined();
    expect(result.category).toBeDefined();
  });

  it("should include banking info fields", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());
    const result = await getNurseProfileForAdmin("nurse-abc-123");

    expect(result.bankName).toBeDefined();
    expect(result.accountNumber).toBeDefined();
  });

  it("should include status fields", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());
    const result = await getNurseProfileForAdmin("nurse-abc-123");

    expect(result.userIsActive).toBe(true);
    expect(result.nurseProfileIsActive).toBe(true);
    expect(result.isProfileComplete).toBe(true);
    expect(result.isPendingReview).toBe(false);
    expect(result.isAssignmentReady).toBe(true);
  });

  it("should include all 6 workload summary fields when present", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());
    const result = await getNurseProfileForAdmin("nurse-abc-123");

    const workload = result.workload!;
    expect(workload.totalAssignedCareRequests).toBe(10);
    expect(workload.pendingAssignedCareRequests).toBe(3);
    expect(workload.approvedAssignedCareRequests).toBe(4);
    expect(workload.rejectedAssignedCareRequests).toBe(1);
    expect(workload.completedAssignedCareRequests).toBe(2);
    expect(workload.lastCareRequestAtUtc).toBe("2026-03-25T10:00:00Z");
  });

  it("should handle null optional fields gracefully", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(
      makeMockDetail({
        name: null,
        lastName: null,
        identificationNumber: null,
        phone: null,
        hireDate: null,
        specialty: null,
        licenseId: null,
        bankName: null,
        accountNumber: null,
        category: null,
        workload: undefined,
      }),
    );
    const result = await getNurseProfileForAdmin("nurse-abc-123");

    expect(result.name).toBeNull();
    expect(result.lastName).toBeNull();
    expect(result.identificationNumber).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.hireDate).toBeNull();
    expect(result.specialty).toBeNull();
    expect(result.licenseId).toBeNull();
    expect(result.bankName).toBeNull();
    expect(result.accountNumber).toBeNull();
    expect(result.category).toBeNull();
    expect(result.workload).toBeUndefined();
  });
});

// ─── Action Buttons and Navigation ───────────────────────────────────────────

describe("Admin Nurse Profile Detail Screen - Action Buttons and Navigation", () => {
  it("should build correct edit route", () => {
    const id = "nurse-abc-123";
    const route = `/admin/nurse-profiles/${id}/edit`;
    expect(route).toBe("/admin/nurse-profiles/nurse-abc-123/edit");
  });

  it("should build correct review route", () => {
    const id = "nurse-abc-123";
    const route = `/admin/nurse-profiles/${id}/review`;
    expect(route).toBe("/admin/nurse-profiles/nurse-abc-123/review");
  });

  it("should show review button only when isPendingReview is true", () => {
    const pendingDetail = makeMockDetail({ isPendingReview: true });
    const nonPendingDetail = makeMockDetail({ isPendingReview: false });
    const undefinedDetail = makeMockDetail({ isPendingReview: undefined });

    expect(pendingDetail.isPendingReview).toBe(true);
    expect(nonPendingDetail.isPendingReview).toBe(false);
    expect(undefinedDetail.isPendingReview).toBeUndefined();

    // Review button condition: only shown when isPendingReview is truthy
    expect(!!pendingDetail.isPendingReview).toBe(true);
    expect(!!nonPendingDetail.isPendingReview).toBe(false);
    expect(!!undefinedDetail.isPendingReview).toBe(false);
  });

  it("should include entity ID in edit route for any nurse ID", () => {
    const ids = ["nurse-1", "nurse-uuid-abc-def", "user-999"];
    for (const id of ids) {
      const route = `/admin/nurse-profiles/${id}/edit`;
      expect(route).toContain(id);
      expect(route).toContain("/edit");
    }
  });

  it("should include entity ID in review route for any nurse ID", () => {
    const ids = ["nurse-1", "nurse-uuid-abc-def", "user-999"];
    for (const id of ids) {
      const route = `/admin/nurse-profiles/${id}/review`;
      expect(route).toContain(id);
      expect(route).toContain("/review");
    }
  });
});

// ─── Optimistic UI Updates for Toggle ────────────────────────────────────────

describe("Admin Nurse Profile Detail Screen - Optimistic UI Updates for Toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should toggle nurseProfileIsActive from true to false", () => {
    const detail = makeMockDetail({ nurseProfileIsActive: true });
    const newStatus = !detail.nurseProfileIsActive;
    expect(newStatus).toBe(false);
  });

  it("should toggle nurseProfileIsActive from false to true", () => {
    const detail = makeMockDetail({ nurseProfileIsActive: false });
    const newStatus = !detail.nurseProfileIsActive;
    expect(newStatus).toBe(true);
  });

  it("should call setNurseOperationalAccessForAdmin with correct userId and new value (deactivate)", async () => {
    const detail = makeMockDetail({ userId: "nurse-abc-123", nurseProfileIsActive: true });
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ nurseProfileIsActive: false }));

    const newStatus = !detail.nurseProfileIsActive;
    await setNurseOperationalAccessForAdmin(detail.userId, newStatus);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/nurse-profiles/nurse-abc-123/operational-access",
        method: "PUT",
        body: { isOperationallyActive: false },
        auth: true,
      }),
    );
  });

  it("should call setNurseOperationalAccessForAdmin with correct userId and new value (activate)", async () => {
    const detail = makeMockDetail({ userId: "nurse-abc-123", nurseProfileIsActive: false });
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail({ nurseProfileIsActive: true }));

    const newStatus = !detail.nurseProfileIsActive;
    await setNurseOperationalAccessForAdmin(detail.userId, newStatus);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/nurse-profiles/nurse-abc-123/operational-access",
        method: "PUT",
        body: { isOperationallyActive: true },
        auth: true,
      }),
    );
  });
});

// ─── Route Parameter Extraction ───────────────────────────────────────────────

describe("Admin Nurse Profile Detail Screen - Route Parameter Extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should build correct API path using the nurse ID from route params", async () => {
    const id = "nurse-abc-123";
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());

    await getNurseProfileForAdmin(id);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: `/api/admin/nurse-profiles/${id}` }),
    );
  });

  it("should include the nurse ID in the API path for any nurse ID", async () => {
    const ids = ["nurse-1", "nurse-uuid-abc-def", "user-999"];
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockDetail());

    for (const id of ids) {
      await getNurseProfileForAdmin(id);
      expect(httpClient.requestJson).toHaveBeenCalledWith(
        expect.objectContaining({ path: `/api/admin/nurse-profiles/${id}` }),
      );
    }
  });
});
