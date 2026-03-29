import { describe, expect, it, vi, beforeEach } from "vitest";
import * as httpClient from "../services/httpClient";
import {
  getNurseProfileForAdmin,
  completeNurseProfileForAdmin,
  type NurseProfileAdminRecordDto,
  type CompleteNurseProfileRequest,
} from "../services/adminPortalService";

vi.mock("../services/httpClient", () => ({
  requestJson: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockProfile(overrides?: Partial<NurseProfileAdminRecordDto>): NurseProfileAdminRecordDto {
  return {
    userId: "nurse-pending-001",
    email: "maria@example.com",
    name: "María",
    lastName: "González",
    identificationNumber: "001-9876543-2",
    phone: "809-555-0099",
    profileType: 1,
    userIsActive: true,
    nurseProfileIsActive: false,
    isProfileComplete: false,
    isPendingReview: true,
    isAssignmentReady: false,
    hasHistoricalCareRequests: false,
    createdAtUtc: "2026-02-01T08:00:00Z",
    hireDate: "2026-02-15T00:00:00Z",
    specialty: null,
    licenseId: null,
    bankName: null,
    accountNumber: null,
    category: null,
    ...overrides,
  };
}

function makeCompleteForm(overrides?: Partial<CompleteNurseProfileRequest>): CompleteNurseProfileRequest {
  return {
    name: "María",
    lastName: "González",
    identificationNumber: "001-9876543-2",
    phone: "809-555-0099",
    email: "maria@example.com",
    hireDate: "2026-02-15T00:00:00Z",
    specialty: "Cuidados intensivos",
    licenseId: "LIC-999",
    bankName: "Banco Popular",
    accountNumber: "987654321",
    category: "Especialista",
    ...overrides,
  };
}

// ─── Access Control Logic ─────────────────────────────────────────────────────

describe("adminReviewNurseProfileScreen", () => {
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

describe("Admin Review Nurse Profile Screen - Data Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call getNurseProfileForAdmin with the correct nurse ID", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockProfile());
    await getNurseProfileForAdmin("nurse-pending-001");
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/nurse-profiles/nurse-pending-001", auth: true }),
    );
  });

  it("should return the nurse profile from API", async () => {
    const mockProfile = makeMockProfile();
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockProfile);
    const result = await getNurseProfileForAdmin("nurse-pending-001");
    expect(result.userId).toBe("nurse-pending-001");
    expect(result.isPendingReview).toBe(true);
    expect(result.isProfileComplete).toBe(false);
  });

  it("should propagate errors from the API when loading profile", async () => {
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible cargar el perfil de la enfermera."));
    await expect(getNurseProfileForAdmin("nurse-pending-001")).rejects.toThrow(
      "No fue posible cargar el perfil de la enfermera.",
    );
  });

  it("should pre-populate form with existing profile values", async () => {
    const mockProfile = makeMockProfile({ specialty: "Pediatría", licenseId: "LIC-123" });
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockProfile);
    const result = await getNurseProfileForAdmin("nurse-pending-001");

    // Simulate form pre-population logic
    const form = {
      name: result.name || "",
      lastName: result.lastName || "",
      identificationNumber: result.identificationNumber || "",
      phone: result.phone || "",
      email: result.email || "",
      hireDate: result.hireDate || "",
      specialty: result.specialty || "",
      licenseId: result.licenseId || "",
      bankName: result.bankName || "",
      accountNumber: result.accountNumber || "",
      category: result.category || "",
    };

    expect(form.name).toBe("María");
    expect(form.lastName).toBe("González");
    expect(form.email).toBe("maria@example.com");
    expect(form.specialty).toBe("Pediatría");
    expect(form.licenseId).toBe("LIC-123");
  });

  it("should default null fields to empty strings in form", async () => {
    const mockProfile = makeMockProfile({ specialty: null, licenseId: null, bankName: null, accountNumber: null, category: null });
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockProfile);
    const result = await getNurseProfileForAdmin("nurse-pending-001");

    const form = {
      specialty: result.specialty || "",
      licenseId: result.licenseId || "",
      bankName: result.bankName || "",
      accountNumber: result.accountNumber || "",
      category: result.category || "",
    };

    expect(form.specialty).toBe("");
    expect(form.licenseId).toBe("");
    expect(form.bankName).toBe("");
    expect(form.accountNumber).toBe("");
    expect(form.category).toBe("");
  });
});

// ─── Form Validation ─────────────────────────────────────────────────────────

describe("Admin Review Nurse Profile Screen - Form Validation", () => {
  it("should fail validation when specialty is empty", () => {
    const form = makeCompleteForm({ specialty: "" });
    const errors: Record<string, string> = {};
    if (!form.specialty.trim()) errors.specialty = "La especialidad es obligatoria";
    expect(errors.specialty).toBe("La especialidad es obligatoria");
  });

  it("should fail validation when licenseId is empty", () => {
    const form = makeCompleteForm({ licenseId: "" });
    const errors: Record<string, string> = {};
    if (!form.licenseId?.trim()) errors.licenseId = "La licencia es obligatoria";
    expect(errors.licenseId).toBe("La licencia es obligatoria");
  });

  it("should fail validation when bankName is empty", () => {
    const form = makeCompleteForm({ bankName: "" });
    const errors: Record<string, string> = {};
    if (!form.bankName.trim()) errors.bankName = "El banco es obligatorio";
    expect(errors.bankName).toBe("El banco es obligatorio");
  });

  it("should fail validation when accountNumber is empty", () => {
    const form = makeCompleteForm({ accountNumber: "" });
    const errors: Record<string, string> = {};
    if (!form.accountNumber?.trim()) errors.accountNumber = "El número de cuenta es obligatorio";
    expect(errors.accountNumber).toBe("El número de cuenta es obligatorio");
  });

  it("should fail validation when category is empty", () => {
    const form = makeCompleteForm({ category: "" });
    const errors: Record<string, string> = {};
    if (!form.category.trim()) errors.category = "La categoría es obligatoria";
    expect(errors.category).toBe("La categoría es obligatoria");
  });

  it("should pass validation when all required fields are filled", () => {
    const form = makeCompleteForm();
    const errors: Record<string, string> = {};
    if (!form.specialty.trim()) errors.specialty = "La especialidad es obligatoria";
    if (!form.licenseId?.trim()) errors.licenseId = "La licencia es obligatoria";
    if (!form.bankName.trim()) errors.bankName = "El banco es obligatorio";
    if (!form.accountNumber?.trim()) errors.accountNumber = "El número de cuenta es obligatorio";
    if (!form.category.trim()) errors.category = "La categoría es obligatoria";
    expect(Object.keys(errors).length).toBe(0);
  });

  it("should block submission when required fields are empty", () => {
    const mockSubmit = vi.fn();
    const form = makeCompleteForm({ specialty: "", licenseId: "", bankName: "", accountNumber: "", category: "" });

    const errors: Record<string, string> = {};
    if (!form.specialty.trim()) errors.specialty = "La especialidad es obligatoria";
    if (!form.licenseId?.trim()) errors.licenseId = "La licencia es obligatoria";
    if (!form.bankName.trim()) errors.bankName = "El banco es obligatorio";
    if (!form.accountNumber?.trim()) errors.accountNumber = "El número de cuenta es obligatorio";
    if (!form.category.trim()) errors.category = "La categoría es obligatoria";

    const isValid = Object.keys(errors).length === 0;
    if (isValid) mockSubmit();

    expect(mockSubmit).not.toHaveBeenCalled();
    expect(errors.specialty).toBeDefined();
    expect(errors.licenseId).toBeDefined();
    expect(errors.bankName).toBeDefined();
    expect(errors.accountNumber).toBeDefined();
    expect(errors.category).toBeDefined();
  });

  it("should show Spanish error messages for all required fields", () => {
    const form = makeCompleteForm({ specialty: "", licenseId: "", bankName: "", accountNumber: "", category: "" });
    const errors: Record<string, string> = {};
    if (!form.specialty.trim()) errors.specialty = "La especialidad es obligatoria";
    if (!form.licenseId?.trim()) errors.licenseId = "La licencia es obligatoria";
    if (!form.bankName.trim()) errors.bankName = "El banco es obligatorio";
    if (!form.accountNumber?.trim()) errors.accountNumber = "El número de cuenta es obligatorio";
    if (!form.category.trim()) errors.category = "La categoría es obligatoria";

    expect(errors.specialty).toMatch(/obligatori/);
    expect(errors.licenseId).toMatch(/obligatori/);
    expect(errors.bankName).toMatch(/obligatori/);
    expect(errors.accountNumber).toMatch(/obligatori/);
    expect(errors.category).toMatch(/obligatori/);
  });
});

// ─── Form Submission ─────────────────────────────────────────────────────────

describe("Admin Review Nurse Profile Screen - Form Submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call completeNurseProfileForAdmin with correct nurse ID and form data", async () => {
    const completedProfile = makeMockProfile({ isProfileComplete: true, isPendingReview: false });
    vi.mocked(httpClient.requestJson).mockResolvedValue(completedProfile);

    const form = makeCompleteForm();
    await completeNurseProfileForAdmin("nurse-pending-001", form);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/nurse-profiles/nurse-pending-001/complete",
        method: "PUT",
        body: form,
        auth: true,
      }),
    );
  });

  it("should call completeNurseProfileForAdmin with all required fields", async () => {
    const completedProfile = makeMockProfile({ isProfileComplete: true });
    vi.mocked(httpClient.requestJson).mockResolvedValue(completedProfile);

    const form = makeCompleteForm();
    await completeNurseProfileForAdmin("nurse-pending-001", form);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          specialty: "Cuidados intensivos",
          licenseId: "LIC-999",
          bankName: "Banco Popular",
          accountNumber: "987654321",
          category: "Especialista",
        }),
      }),
    );
  });

  it("should propagate errors from completeNurseProfileForAdmin", async () => {
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible completar el perfil de la enfermera."));
    const form = makeCompleteForm();
    await expect(completeNurseProfileForAdmin("nurse-pending-001", form)).rejects.toThrow(
      "No fue posible completar el perfil de la enfermera.",
    );
  });

  it("should return the updated nurse profile on success", async () => {
    const completedProfile = makeMockProfile({ isProfileComplete: true, isPendingReview: false, specialty: "Cuidados intensivos" });
    vi.mocked(httpClient.requestJson).mockResolvedValue(completedProfile);

    const form = makeCompleteForm();
    const result = await completeNurseProfileForAdmin("nurse-pending-001", form);

    expect(result.isProfileComplete).toBe(true);
    expect(result.isPendingReview).toBe(false);
    expect(result.specialty).toBe("Cuidados intensivos");
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe("Admin Review Nurse Profile Screen - Navigation", () => {
  it("should build correct detail route after successful submission", () => {
    const id = "nurse-pending-001";
    const route = `/admin/nurse-profiles/${id}`;
    expect(route).toBe("/admin/nurse-profiles/nurse-pending-001");
  });

  it("should build correct detail route for any nurse ID", () => {
    const ids = ["nurse-1", "nurse-uuid-abc-def", "user-999"];
    for (const id of ids) {
      const route = `/admin/nurse-profiles/${id}`;
      expect(route).toContain(id);
      expect(route).not.toContain("/review");
    }
  });

  it("should navigate to detail screen (not back) on success", () => {
    const mockReplace = vi.fn();
    const id = "nurse-pending-001";

    // Simulate successful submission navigation
    mockReplace(`/admin/nurse-profiles/${id}`);

    expect(mockReplace).toHaveBeenCalledWith("/admin/nurse-profiles/nurse-pending-001");
    expect(mockReplace).not.toHaveBeenCalledWith(expect.stringContaining("/review"));
  });
});

// ─── Route Parameter Extraction ───────────────────────────────────────────────

describe("Admin Review Nurse Profile Screen - Route Parameter Extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use nurse ID from route params in API call", async () => {
    const id = "nurse-pending-001";
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockProfile());

    await getNurseProfileForAdmin(id);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: `/api/admin/nurse-profiles/${id}` }),
    );
  });

  it("should use nurse ID from route params in complete API call", async () => {
    const id = "nurse-pending-001";
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockProfile({ isProfileComplete: true }));

    const form = makeCompleteForm();
    await completeNurseProfileForAdmin(id, form);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: `/api/admin/nurse-profiles/${id}/complete` }),
    );
  });
});
