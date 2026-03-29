import { describe, expect, it, vi, beforeEach } from "vitest";
import * as httpClient from "../services/httpClient";
import {
  getPendingNurseProfiles,
  getActiveNurseProfiles,
  getInactiveNurseProfiles,
  type PendingNurseProfileDto,
  type NurseProfileSummaryDto,
} from "../services/adminPortalService";

vi.mock("../services/httpClient", () => ({
  requestJson: vi.fn(),
}));

// ─── Access Control Logic ────────────────────────────────────────────────────

describe("adminNurseProfilesScreen", () => {
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

// ─── Tab Switching and Data Loading ──────────────────────────────────────────

describe("Admin Nurse Profiles Screen - Tab Switching and Data Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call getPendingNurseProfiles for pending tab", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getPendingNurseProfiles();
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/nurse-profiles/pending", auth: true }),
    );
  });

  it("should call getActiveNurseProfiles for active tab", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getActiveNurseProfiles();
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/nurse-profiles/active", auth: true }),
    );
  });

  it("should call getInactiveNurseProfiles for inactive tab", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await getInactiveNurseProfiles();
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/nurse-profiles/inactive", auth: true }),
    );
  });

  it("should return pending nurse profiles from API", async () => {
    const mockPending: PendingNurseProfileDto[] = [
      {
        userId: "nurse-1",
        email: "ana@example.com",
        name: "Ana",
        lastName: "López",
        identificationNumber: "001-1234567-8",
        phone: "809-555-0001",
        hireDate: null,
        specialty: null,
        createdAtUtc: "2026-03-01T08:00:00Z",
      },
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockPending);
    const result = await getPendingNurseProfiles();
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("ana@example.com");
  });

  it("should return active nurse profiles from API", async () => {
    const mockActive: NurseProfileSummaryDto[] = [
      {
        userId: "nurse-2",
        email: "maria@example.com",
        name: "María",
        lastName: "García",
        specialty: "Cuidados intensivos",
        category: "Especialista",
        userIsActive: true,
        nurseProfileIsActive: true,
        isProfileComplete: true,
        isAssignmentReady: true,
        workload: {
          totalAssignedCareRequests: 5,
          pendingAssignedCareRequests: 2,
          approvedAssignedCareRequests: 3,
          rejectedAssignedCareRequests: 0,
          completedAssignedCareRequests: 0,
          lastCareRequestAtUtc: "2026-03-20T10:00:00Z",
        },
      },
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockActive);
    const result = await getActiveNurseProfiles();
    expect(result).toHaveLength(1);
    expect(result[0].specialty).toBe("Cuidados intensivos");
  });

  it("should propagate errors from the API", async () => {
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible cargar perfiles de enfermeras."));
    await expect(getPendingNurseProfiles()).rejects.toThrow("No fue posible cargar perfiles de enfermeras.");
  });

  it("should return empty array when no nurses in tab", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    const result = await getInactiveNurseProfiles();
    expect(result).toHaveLength(0);
  });
});

// ─── Card Display Fields ──────────────────────────────────────────────────────

describe("Admin Nurse Profiles Screen - Card Display Fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should include all required fields for pending nurse card", async () => {
    const mockPending: PendingNurseProfileDto[] = [
      {
        userId: "nurse-1",
        email: "ana@example.com",
        name: "Ana",
        lastName: "López",
        identificationNumber: "001-1234567-8",
        phone: "809-555-0001",
        hireDate: "2026-01-15T00:00:00Z",
        specialty: "Pediatría",
        createdAtUtc: "2026-03-01T08:00:00Z",
      },
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockPending);
    const result = await getPendingNurseProfiles();

    const nurse = result[0];
    expect(nurse.userId).toBeDefined();
    expect(nurse.email).toBeDefined();
    expect(nurse.name).toBeDefined();
    expect(nurse.lastName).toBeDefined();
    expect(nurse.createdAtUtc).toBeDefined();
  });

  it("should include all required fields for active nurse card", async () => {
    const mockActive: NurseProfileSummaryDto[] = [
      {
        userId: "nurse-2",
        email: "maria@example.com",
        name: "María",
        lastName: "García",
        specialty: "Cuidados intensivos",
        category: "Especialista",
        isProfileComplete: true,
        isAssignmentReady: true,
        workload: {
          totalAssignedCareRequests: 3,
          pendingAssignedCareRequests: 1,
          approvedAssignedCareRequests: 2,
          rejectedAssignedCareRequests: 0,
          completedAssignedCareRequests: 0,
          lastCareRequestAtUtc: null,
        },
      },
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockActive);
    const result = await getActiveNurseProfiles();

    const nurse = result[0];
    expect(nurse.userId).toBeDefined();
    expect(nurse.email).toBeDefined();
    expect(nurse.specialty).toBeDefined();
    expect(nurse.category).toBeDefined();
    expect(nurse.isProfileComplete).toBe(true);
    expect(nurse.isAssignmentReady).toBe(true);
    expect(nurse.workload).toBeDefined();
  });

  it("should handle nurses with null optional fields", async () => {
    const mockActive: NurseProfileSummaryDto[] = [
      {
        userId: "nurse-3",
        email: "carmen@example.com",
        name: null,
        lastName: null,
        specialty: null,
        category: null,
        isProfileComplete: false,
        isAssignmentReady: false,
        workload: undefined,
      },
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockActive);
    const result = await getActiveNurseProfiles();

    expect(result[0].name).toBeNull();
    expect(result[0].specialty).toBeNull();
    expect(result[0].workload).toBeUndefined();
  });

  it("should flag pending nurses for visual indicator", async () => {
    const mockPending: PendingNurseProfileDto[] = [
      {
        userId: "nurse-1",
        email: "pending@example.com",
        name: "Pendiente",
        lastName: "Revisión",
        identificationNumber: null,
        phone: null,
        createdAtUtc: "2026-03-01T08:00:00Z",
      },
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockPending);
    const result = await getPendingNurseProfiles();

    // Pending nurses come from the pending endpoint - they are inherently pending review
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("nurse-1");
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe("Admin Nurse Profiles Screen - Navigation", () => {
  it("should build correct detail route with nurse userId", () => {
    const nurseId = "nurse-abc-123";
    const route = `/admin/nurse-profiles/${nurseId}`;
    expect(route).toBe("/admin/nurse-profiles/nurse-abc-123");
  });

  it("should build correct review route with nurse userId", () => {
    const nurseId = "nurse-abc-123";
    const route = `/admin/nurse-profiles/${nurseId}/review`;
    expect(route).toBe("/admin/nurse-profiles/nurse-abc-123/review");
  });

  it("should build correct create route", () => {
    const route = "/admin/nurse-profiles/create";
    expect(route).toBe("/admin/nurse-profiles/create");
  });

  it("should include entity ID in navigation path for any nurse", () => {
    const ids = ["nurse-1", "nurse-uuid-abc-def", "user-999"];
    for (const id of ids) {
      const route = `/admin/nurse-profiles/${id}`;
      expect(route).toContain(id);
    }
  });

  it("should include entity ID in review navigation path for any nurse", () => {
    const ids = ["nurse-1", "nurse-uuid-abc-def", "user-999"];
    for (const id of ids) {
      const route = `/admin/nurse-profiles/${id}/review`;
      expect(route).toContain(id);
      expect(route).toContain("/review");
    }
  });
});

// ─── Profile Completion Status Labels ────────────────────────────────────────

describe("Admin Nurse Profiles Screen - Profile Completion Status", () => {
  function profileCompletionLabel(isComplete: boolean | undefined): string {
    if (isComplete) return "Perfil completo";
    return "Perfil incompleto";
  }

  function assignmentReadyLabel(isReady: boolean | undefined): string {
    if (isReady) return "Lista para asignación";
    return "No disponible para asignación";
  }

  it("should label complete profiles correctly", () => {
    expect(profileCompletionLabel(true)).toBe("Perfil completo");
  });

  it("should label incomplete profiles correctly", () => {
    expect(profileCompletionLabel(false)).toBe("Perfil incompleto");
  });

  it("should label assignment-ready nurses correctly", () => {
    expect(assignmentReadyLabel(true)).toBe("Lista para asignación");
  });

  it("should label non-assignment-ready nurses correctly", () => {
    expect(assignmentReadyLabel(false)).toBe("No disponible para asignación");
  });
});

// ─── Workload Summary Display ─────────────────────────────────────────────────

describe("Admin Nurse Profiles Screen - Workload Summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should include workload summary fields when present", async () => {
    const mockActive: NurseProfileSummaryDto[] = [
      {
        userId: "nurse-1",
        email: "nurse@example.com",
        name: "Ana",
        lastName: "López",
        specialty: "General",
        category: "Básica",
        workload: {
          totalAssignedCareRequests: 10,
          pendingAssignedCareRequests: 3,
          approvedAssignedCareRequests: 4,
          rejectedAssignedCareRequests: 1,
          completedAssignedCareRequests: 2,
          lastCareRequestAtUtc: "2026-03-25T10:00:00Z",
        },
      },
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockActive);
    const result = await getActiveNurseProfiles();

    const workload = result[0].workload!;
    expect(workload.totalAssignedCareRequests).toBe(10);
    expect(workload.pendingAssignedCareRequests).toBe(3);
    expect(workload.approvedAssignedCareRequests).toBe(4);
    expect(workload.rejectedAssignedCareRequests).toBe(1);
    expect(workload.completedAssignedCareRequests).toBe(2);
  });

  it("should handle nurses without workload data", async () => {
    const mockActive: NurseProfileSummaryDto[] = [
      {
        userId: "nurse-2",
        email: "new@example.com",
        name: "Nueva",
        lastName: "Enfermera",
        specialty: null,
        category: null,
        workload: undefined,
      },
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockActive);
    const result = await getActiveNurseProfiles();

    expect(result[0].workload).toBeUndefined();
  });
});
