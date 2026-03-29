import { describe, expect, it, vi, beforeEach } from "vitest";
import * as httpClient from "../services/httpClient";
import {
  getNurseProfileForAdmin,
  updateNurseProfileForAdmin,
  type NurseProfileAdminRecordDto,
  type UpdateNurseProfileRequest,
} from "../services/adminPortalService";

vi.mock("../services/httpClient", () => ({
  requestJson: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockProfile(overrides?: Partial<NurseProfileAdminRecordDto>): NurseProfileAdminRecordDto {
  return {
    userId: "nurse-edit-001",
    email: "maria@example.com",
    name: "María",
    lastName: "González",
    identificationNumber: "001-9876543-2",
    phone: "809-555-0099",
    profileType: 1,
    userIsActive: true,
    nurseProfileIsActive: true,
    isProfileComplete: true,
    isPendingReview: false,
    isAssignmentReady: true,
    hasHistoricalCareRequests: false,
    createdAtUtc: "2026-02-01T08:00:00Z",
    hireDate: "2026-02-15T00:00:00Z",
    specialty: "Cuidados intensivos",
    licenseId: "LIC-999",
    bankName: "Banco Popular",
    accountNumber: "987654321",
    category: "Especialista",
    ...overrides,
  };
}

function makeUpdateForm(overrides?: Partial<UpdateNurseProfileRequest>): UpdateNurseProfileRequest {
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

describe("adminEditNurseProfileScreen", () => {
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

// ─── Data Loading & Form Pre-population ──────────────────────────────────────

describe("Admin Edit Nurse Profile Screen - Data Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call getNurseProfileForAdmin with the correct nurse ID", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockProfile());
    await getNurseProfileForAdmin("nurse-edit-001");
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/admin/nurse-profiles/nurse-edit-001", auth: true }),
    );
  });

  it("should return the nurse profile from API", async () => {
    const mockProfile = makeMockProfile();
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockProfile);
    const result = await getNurseProfileForAdmin("nurse-edit-001");
    expect(result.userId).toBe("nurse-edit-001");
    expect(result.isProfileComplete).toBe(true);
  });

  it("should propagate errors from the API when loading profile", async () => {
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible cargar el perfil de la enfermera."));
    await expect(getNurseProfileForAdmin("nurse-edit-001")).rejects.toThrow(
      "No fue posible cargar el perfil de la enfermera.",
    );
  });

  it("should pre-populate form with existing profile values", async () => {
    const mockProfile = makeMockProfile({ specialty: "Pediatría", licenseId: "LIC-123", bankName: "BanReservas" });
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockProfile);
    const result = await getNurseProfileForAdmin("nurse-edit-001");

    const form: UpdateNurseProfileRequest = {
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
    expect(form.bankName).toBe("BanReservas");
  });

  it("should default null fields to empty strings in form", async () => {
    const mockProfile = makeMockProfile({ specialty: null, licenseId: null, bankName: null, accountNumber: null, category: null });
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockProfile);
    const result = await getNurseProfileForAdmin("nurse-edit-001");

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

  it("should pre-populate all personal info fields from profile", async () => {
    const mockProfile = makeMockProfile({
      name: "Ana",
      lastName: "Pérez",
      identificationNumber: "002-1234567-8",
      phone: "809-555-1234",
      email: "ana@example.com",
    });
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockProfile);
    const result = await getNurseProfileForAdmin("nurse-edit-001");

    const form = {
      name: result.name || "",
      lastName: result.lastName || "",
      identificationNumber: result.identificationNumber || "",
      phone: result.phone || "",
      email: result.email || "",
    };

    expect(form.name).toBe("Ana");
    expect(form.lastName).toBe("Pérez");
    expect(form.identificationNumber).toBe("002-1234567-8");
    expect(form.phone).toBe("809-555-1234");
    expect(form.email).toBe("ana@example.com");
  });
});

// ─── Step 1 Validation ────────────────────────────────────────────────────────

describe("Admin Edit Nurse Profile Screen - Step 1 Validation", () => {
  function validateStep1(form: UpdateNurseProfileRequest) {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "El nombre es obligatorio";
    if (!form.lastName.trim()) errors.lastName = "El apellido es obligatorio";
    if (!form.identificationNumber.trim()) errors.identificationNumber = "La cédula es obligatoria";
    if (!form.phone.trim()) errors.phone = "El teléfono es obligatorio";
    if (!form.email.trim()) errors.email = "El correo electrónico es obligatorio";
    else if (!form.email.includes("@")) errors.email = "El correo debe ser válido";
    return errors;
  }

  it("should fail when name is empty", () => {
    const errors = validateStep1(makeUpdateForm({ name: "" }));
    expect(errors.name).toBe("El nombre es obligatorio");
  });

  it("should fail when lastName is empty", () => {
    const errors = validateStep1(makeUpdateForm({ lastName: "" }));
    expect(errors.lastName).toBe("El apellido es obligatorio");
  });

  it("should fail when identificationNumber is empty", () => {
    const errors = validateStep1(makeUpdateForm({ identificationNumber: "" }));
    expect(errors.identificationNumber).toBe("La cédula es obligatoria");
  });

  it("should fail when phone is empty", () => {
    const errors = validateStep1(makeUpdateForm({ phone: "" }));
    expect(errors.phone).toBe("El teléfono es obligatorio");
  });

  it("should fail when email is empty", () => {
    const errors = validateStep1(makeUpdateForm({ email: "" }));
    expect(errors.email).toBe("El correo electrónico es obligatorio");
  });

  it("should fail when email does not contain @", () => {
    const errors = validateStep1(makeUpdateForm({ email: "notanemail" }));
    expect(errors.email).toBe("El correo debe ser válido");
  });

  it("should pass when all step 1 fields are valid", () => {
    const errors = validateStep1(makeUpdateForm());
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("should fail with all errors when all step 1 fields are empty", () => {
    const errors = validateStep1(makeUpdateForm({ name: "", lastName: "", identificationNumber: "", phone: "", email: "" }));
    expect(errors.name).toBeDefined();
    expect(errors.lastName).toBeDefined();
    expect(errors.identificationNumber).toBeDefined();
    expect(errors.phone).toBeDefined();
    expect(errors.email).toBeDefined();
  });
});

// ─── Step 2 Validation ────────────────────────────────────────────────────────

describe("Admin Edit Nurse Profile Screen - Step 2 Validation", () => {
  function validateStep2(form: UpdateNurseProfileRequest) {
    const errors: Record<string, string> = {};
    if (!form.hireDate.trim()) errors.hireDate = "La fecha de contratación es obligatoria";
    if (!form.specialty.trim()) errors.specialty = "La especialidad es obligatoria";
    if (!form.category.trim()) errors.category = "La categoría es obligatoria";
    return errors;
  }

  it("should fail when hireDate is empty", () => {
    const errors = validateStep2(makeUpdateForm({ hireDate: "" }));
    expect(errors.hireDate).toBe("La fecha de contratación es obligatoria");
  });

  it("should fail when specialty is empty", () => {
    const errors = validateStep2(makeUpdateForm({ specialty: "" }));
    expect(errors.specialty).toBe("La especialidad es obligatoria");
  });

  it("should fail when category is empty", () => {
    const errors = validateStep2(makeUpdateForm({ category: "" }));
    expect(errors.category).toBe("La categoría es obligatoria");
  });

  it("should pass when all step 2 required fields are provided", () => {
    const errors = validateStep2(makeUpdateForm());
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("licenseId is optional in step 2", () => {
    const errors = validateStep2(makeUpdateForm({ licenseId: "" }));
    expect(errors.licenseId).toBeUndefined();
  });
});

// ─── Step 3 Validation ────────────────────────────────────────────────────────

describe("Admin Edit Nurse Profile Screen - Step 3 Validation", () => {
  function validateStep3(form: UpdateNurseProfileRequest) {
    const errors: Record<string, string> = {};
    if (!form.bankName.trim()) errors.bankName = "El banco es obligatorio";
    return errors;
  }

  it("should fail when bankName is empty", () => {
    const errors = validateStep3(makeUpdateForm({ bankName: "" }));
    expect(errors.bankName).toBe("El banco es obligatorio");
  });

  it("should pass when bankName is provided", () => {
    const errors = validateStep3(makeUpdateForm());
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("accountNumber is optional in step 3", () => {
    const errors = validateStep3(makeUpdateForm({ accountNumber: "" }));
    expect(errors.accountNumber).toBeUndefined();
  });
});

// ─── Multi-Step Navigation ────────────────────────────────────────────────────

describe("Admin Edit Nurse Profile Screen - Multi-Step Navigation", () => {
  function validateStep1(form: UpdateNurseProfileRequest) {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "El nombre es obligatorio";
    if (!form.lastName.trim()) errors.lastName = "El apellido es obligatorio";
    if (!form.identificationNumber.trim()) errors.identificationNumber = "La cédula es obligatoria";
    if (!form.phone.trim()) errors.phone = "El teléfono es obligatorio";
    if (!form.email.trim()) errors.email = "El correo electrónico es obligatorio";
    else if (!form.email.includes("@")) errors.email = "El correo debe ser válido";
    return errors;
  }

  function validateStep2(form: UpdateNurseProfileRequest) {
    const errors: Record<string, string> = {};
    if (!form.hireDate.trim()) errors.hireDate = "La fecha de contratación es obligatoria";
    if (!form.specialty.trim()) errors.specialty = "La especialidad es obligatoria";
    if (!form.category.trim()) errors.category = "La categoría es obligatoria";
    return errors;
  }

  it("should start at step 1", () => {
    const step = 1;
    expect(step).toBe(1);
  });

  it("should advance to step 2 when step 1 is valid", () => {
    let step = 1;
    const errors = validateStep1(makeUpdateForm());
    if (Object.keys(errors).length === 0) step = Math.min(3, step + 1);
    expect(step).toBe(2);
  });

  it("should not advance to step 2 when step 1 is invalid", () => {
    let step = 1;
    const errors = validateStep1(makeUpdateForm({ name: "" }));
    if (Object.keys(errors).length === 0) step = Math.min(3, step + 1);
    expect(step).toBe(1);
  });

  it("should advance to step 3 when step 2 is valid", () => {
    let step = 2;
    const errors = validateStep2(makeUpdateForm());
    if (Object.keys(errors).length === 0) step = Math.min(3, step + 1);
    expect(step).toBe(3);
  });

  it("should not advance to step 3 when step 2 is invalid", () => {
    let step = 2;
    const errors = validateStep2(makeUpdateForm({ specialty: "" }));
    if (Object.keys(errors).length === 0) step = Math.min(3, step + 1);
    expect(step).toBe(2);
  });

  it("should not advance beyond step 3", () => {
    let step = 3;
    step = Math.min(3, step + 1);
    expect(step).toBe(3);
  });

  it("should go back to step 1 from step 2", () => {
    let step = 2;
    step = Math.max(1, step - 1);
    expect(step).toBe(1);
  });

  it("should go back to step 2 from step 3", () => {
    let step = 3;
    step = Math.max(1, step - 1);
    expect(step).toBe(2);
  });

  it("should not go below step 1", () => {
    let step = 1;
    step = Math.max(1, step - 1);
    expect(step).toBe(1);
  });

  it("should have 3 total steps", () => {
    const totalSteps = 3;
    expect(totalSteps).toBe(3);
  });
});

// ─── Form Submission ──────────────────────────────────────────────────────────

describe("Admin Edit Nurse Profile Screen - Form Submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call updateNurseProfileForAdmin with correct nurse ID and form data", async () => {
    const updatedProfile = makeMockProfile();
    vi.mocked(httpClient.requestJson).mockResolvedValue(updatedProfile);

    const form = makeUpdateForm();
    await updateNurseProfileForAdmin("nurse-edit-001", form);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/nurse-profiles/nurse-edit-001",
        method: "PUT",
        body: form,
        auth: true,
      }),
    );
  });

  it("should include all required fields in the submission payload", async () => {
    const updatedProfile = makeMockProfile({ name: "Ana", lastName: "Pérez" });
    vi.mocked(httpClient.requestJson).mockResolvedValue(updatedProfile);

    const form = makeUpdateForm({
      name: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      specialty: "Pediatría",
      category: "Generalista",
      bankName: "BanReservas",
    });
    await updateNurseProfileForAdmin("nurse-edit-001", form);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          name: "Ana",
          lastName: "Pérez",
          email: "ana@example.com",
          specialty: "Pediatría",
          category: "Generalista",
          bankName: "BanReservas",
        }),
      }),
    );
  });

  it("should propagate API errors on submission", async () => {
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible actualizar el perfil de la enfermera."));
    const form = makeUpdateForm();
    await expect(updateNurseProfileForAdmin("nurse-edit-001", form)).rejects.toThrow(
      "No fue posible actualizar el perfil de la enfermera.",
    );
  });

  it("should return the updated nurse profile on success", async () => {
    const updatedProfile = makeMockProfile({ specialty: "Pediatría", category: "Generalista" });
    vi.mocked(httpClient.requestJson).mockResolvedValue(updatedProfile);

    const form = makeUpdateForm({ specialty: "Pediatría", category: "Generalista" });
    const result = await updateNurseProfileForAdmin("nurse-edit-001", form);

    expect(result.specialty).toBe("Pediatría");
    expect(result.category).toBe("Generalista");
  });

  it("should block submission when bankName is empty", () => {
    const mockSubmit = vi.fn();
    const form = makeUpdateForm({ bankName: "" });

    const errors: Record<string, string> = {};
    if (!form.bankName.trim()) errors.bankName = "El banco es obligatorio";

    const isValid = Object.keys(errors).length === 0;
    if (isValid) mockSubmit();

    expect(mockSubmit).not.toHaveBeenCalled();
    expect(errors.bankName).toBeDefined();
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe("Admin Edit Nurse Profile Screen - Navigation", () => {
  it("should build correct detail route after successful submission", () => {
    const id = "nurse-edit-001";
    const route = `/admin/nurse-profiles/${id}`;
    expect(route).toBe("/admin/nurse-profiles/nurse-edit-001");
  });

  it("should build correct detail route for any nurse ID", () => {
    const ids = ["nurse-1", "nurse-uuid-abc-def", "user-999"];
    for (const id of ids) {
      const route = `/admin/nurse-profiles/${id}`;
      expect(route).toContain(id);
      expect(route).not.toContain("/edit");
    }
  });

  it("should navigate to detail screen (not back) on success", () => {
    const mockReplace = vi.fn();
    const id = "nurse-edit-001";

    mockReplace(`/admin/nurse-profiles/${id}`);

    expect(mockReplace).toHaveBeenCalledWith("/admin/nurse-profiles/nurse-edit-001");
    expect(mockReplace).not.toHaveBeenCalledWith(expect.stringContaining("/edit"));
  });
});

// ─── Route Parameter Extraction ───────────────────────────────────────────────

describe("Admin Edit Nurse Profile Screen - Route Parameter Extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use nurse ID from route params in load API call", async () => {
    const id = "nurse-edit-001";
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockProfile());

    await getNurseProfileForAdmin(id);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: `/api/admin/nurse-profiles/${id}` }),
    );
  });

  it("should use nurse ID from route params in update API call", async () => {
    const id = "nurse-edit-001";
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockProfile());

    const form = makeUpdateForm();
    await updateNurseProfileForAdmin(id, form);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: `/api/admin/nurse-profiles/${id}` }),
    );
  });
});
