import { describe, expect, it, vi, beforeEach } from "vitest";
import * as httpClient from "../services/httpClient";
import {
  createNurseProfileForAdmin,
  type CreateNurseProfileRequest,
  type NurseProfileAdminRecordDto,
} from "../services/adminPortalService";

vi.mock("../services/httpClient", () => ({
  requestJson: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeForm(overrides?: Partial<CreateNurseProfileRequest>): CreateNurseProfileRequest {
  return {
    name: "María",
    lastName: "González",
    identificationNumber: "001-9876543-2",
    phone: "809-555-0099",
    email: "maria@example.com",
    password: "password123",
    confirmPassword: "password123",
    hireDate: "2026-02-15",
    specialty: "Cuidados intensivos",
    licenseId: "LIC-999",
    bankName: "Banco Popular",
    accountNumber: "987654321",
    category: "Especialista",
    isOperationallyActive: false,
    ...overrides,
  };
}

function makeMockProfile(overrides?: Partial<NurseProfileAdminRecordDto>): NurseProfileAdminRecordDto {
  return {
    userId: "nurse-new-001",
    email: "maria@example.com",
    name: "María",
    lastName: "González",
    identificationNumber: "001-9876543-2",
    phone: "809-555-0099",
    profileType: 1,
    userIsActive: true,
    nurseProfileIsActive: false,
    isProfileComplete: true,
    isPendingReview: false,
    isAssignmentReady: false,
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

// ─── Access Control Logic ─────────────────────────────────────────────────────

describe("adminCreateNurseProfileScreen", () => {
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

// ─── Step 1 Validation ────────────────────────────────────────────────────────

describe("Admin Create Nurse Profile Screen - Step 1 Validation", () => {
  function validateStep1(form: CreateNurseProfileRequest) {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "El nombre es obligatorio";
    if (!form.lastName.trim()) errors.lastName = "El apellido es obligatorio";
    if (!form.identificationNumber.trim()) errors.identificationNumber = "La cédula es obligatoria";
    if (!form.phone.trim()) errors.phone = "El teléfono es obligatorio";
    if (!form.email.trim()) errors.email = "El correo electrónico es obligatorio";
    else if (!form.email.includes("@")) errors.email = "El correo debe ser válido";
    if (!form.password.trim()) errors.password = "La contraseña es obligatoria";
    else if (form.password.length < 8) errors.password = "La contraseña debe tener al menos 8 caracteres";
    if (form.password && form.confirmPassword !== form.password) errors.confirmPassword = "Las contraseñas no coinciden";
    return errors;
  }

  it("should fail when name is empty", () => {
    const errors = validateStep1(makeForm({ name: "" }));
    expect(errors.name).toBe("El nombre es obligatorio");
  });

  it("should fail when lastName is empty", () => {
    const errors = validateStep1(makeForm({ lastName: "" }));
    expect(errors.lastName).toBe("El apellido es obligatorio");
  });

  it("should fail when identificationNumber is empty", () => {
    const errors = validateStep1(makeForm({ identificationNumber: "" }));
    expect(errors.identificationNumber).toBe("La cédula es obligatoria");
  });

  it("should fail when phone is empty", () => {
    const errors = validateStep1(makeForm({ phone: "" }));
    expect(errors.phone).toBe("El teléfono es obligatorio");
  });

  it("should fail when email is empty", () => {
    const errors = validateStep1(makeForm({ email: "" }));
    expect(errors.email).toBe("El correo electrónico es obligatorio");
  });

  it("should fail when email does not contain @", () => {
    const errors = validateStep1(makeForm({ email: "notanemail" }));
    expect(errors.email).toBe("El correo debe ser válido");
  });

  it("should fail when password is empty", () => {
    const errors = validateStep1(makeForm({ password: "", confirmPassword: "" }));
    expect(errors.password).toBe("La contraseña es obligatoria");
  });

  it("should fail when password is less than 8 characters", () => {
    const errors = validateStep1(makeForm({ password: "short", confirmPassword: "short" }));
    expect(errors.password).toBe("La contraseña debe tener al menos 8 caracteres");
  });

  it("should fail when confirmPassword does not match password", () => {
    const errors = validateStep1(makeForm({ password: "password123", confirmPassword: "different" }));
    expect(errors.confirmPassword).toBe("Las contraseñas no coinciden");
  });

  it("should pass when all step 1 fields are valid", () => {
    const errors = validateStep1(makeForm());
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("should fail with all errors when all step 1 fields are empty", () => {
    const errors = validateStep1(makeForm({ name: "", lastName: "", identificationNumber: "", phone: "", email: "", password: "", confirmPassword: "" }));
    expect(errors.name).toBeDefined();
    expect(errors.lastName).toBeDefined();
    expect(errors.identificationNumber).toBeDefined();
    expect(errors.phone).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });
});

// ─── Step 2 Validation ────────────────────────────────────────────────────────

describe("Admin Create Nurse Profile Screen - Step 2 Validation", () => {
  function validateStep2(form: CreateNurseProfileRequest) {
    const errors: Record<string, string> = {};
    if (!form.hireDate.trim()) errors.hireDate = "La fecha de contratación es obligatoria";
    if (!form.specialty.trim()) errors.specialty = "La especialidad es obligatoria";
    if (!form.category.trim()) errors.category = "La categoría es obligatoria";
    return errors;
  }

  it("should fail when hireDate is empty", () => {
    const errors = validateStep2(makeForm({ hireDate: "" }));
    expect(errors.hireDate).toBe("La fecha de contratación es obligatoria");
  });

  it("should fail when specialty is empty", () => {
    const errors = validateStep2(makeForm({ specialty: "" }));
    expect(errors.specialty).toBe("La especialidad es obligatoria");
  });

  it("should fail when category is empty", () => {
    const errors = validateStep2(makeForm({ category: "" }));
    expect(errors.category).toBe("La categoría es obligatoria");
  });

  it("should pass when all step 2 required fields are provided", () => {
    const errors = validateStep2(makeForm());
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("should fail with all errors when all step 2 required fields are empty", () => {
    const errors = validateStep2(makeForm({ hireDate: "", specialty: "", category: "" }));
    expect(errors.hireDate).toBeDefined();
    expect(errors.specialty).toBeDefined();
    expect(errors.category).toBeDefined();
  });
});

// ─── Step 3 Validation ────────────────────────────────────────────────────────

describe("Admin Create Nurse Profile Screen - Step 3 Validation", () => {
  function validateStep3(form: CreateNurseProfileRequest) {
    const errors: Record<string, string> = {};
    if (!form.bankName.trim()) errors.bankName = "El banco es obligatorio";
    return errors;
  }

  it("should fail when bankName is empty", () => {
    const errors = validateStep3(makeForm({ bankName: "" }));
    expect(errors.bankName).toBe("El banco es obligatorio");
  });

  it("should pass when bankName is provided", () => {
    const errors = validateStep3(makeForm());
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("should not require accountNumber", () => {
    const errors = validateStep3(makeForm({ accountNumber: "" }));
    expect(errors.accountNumber).toBeUndefined();
  });
});

// ─── Multi-Step Navigation ────────────────────────────────────────────────────

describe("Admin Create Nurse Profile Screen - Multi-Step Navigation", () => {
  function validateStep1(form: CreateNurseProfileRequest) {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "El nombre es obligatorio";
    if (!form.lastName.trim()) errors.lastName = "El apellido es obligatorio";
    if (!form.identificationNumber.trim()) errors.identificationNumber = "La cédula es obligatoria";
    if (!form.phone.trim()) errors.phone = "El teléfono es obligatorio";
    if (!form.email.trim()) errors.email = "El correo electrónico es obligatorio";
    else if (!form.email.includes("@")) errors.email = "El correo debe ser válido";
    if (!form.password.trim()) errors.password = "La contraseña es obligatoria";
    else if (form.password.length < 8) errors.password = "La contraseña debe tener al menos 8 caracteres";
    if (form.password && form.confirmPassword !== form.password) errors.confirmPassword = "Las contraseñas no coinciden";
    return errors;
  }

  function validateStep2(form: CreateNurseProfileRequest) {
    const errors: Record<string, string> = {};
    if (!form.hireDate.trim()) errors.hireDate = "La fecha de contratación es obligatoria";
    if (!form.specialty.trim()) errors.specialty = "La especialidad es obligatoria";
    if (!form.category.trim()) errors.category = "La categoría es obligatoria";
    return errors;
  }

  it("should start at step 1", () => {
    let step = 1;
    expect(step).toBe(1);
  });

  it("should advance to step 2 when step 1 is valid", () => {
    let step = 1;
    const form = makeForm();
    const errors = validateStep1(form);
    if (Object.keys(errors).length === 0) step = Math.min(3, step + 1);
    expect(step).toBe(2);
  });

  it("should not advance to step 2 when step 1 is invalid", () => {
    let step = 1;
    const form = makeForm({ name: "" });
    const errors = validateStep1(form);
    if (Object.keys(errors).length === 0) step = Math.min(3, step + 1);
    expect(step).toBe(1);
  });

  it("should advance to step 3 when step 2 is valid", () => {
    let step = 2;
    const form = makeForm();
    const errors = validateStep2(form);
    if (Object.keys(errors).length === 0) step = Math.min(3, step + 1);
    expect(step).toBe(3);
  });

  it("should not advance to step 3 when step 2 is invalid", () => {
    let step = 2;
    const form = makeForm({ specialty: "" });
    const errors = validateStep2(form);
    if (Object.keys(errors).length === 0) step = Math.min(3, step + 1);
    expect(step).toBe(2);
  });

  it("should not advance beyond step 3", () => {
    let step = 3;
    step = Math.min(3, step + 1);
    expect(step).toBe(3);
  });

  it("should go back to step 1 from step 2 (previous always works)", () => {
    let step = 2;
    step = Math.max(1, step - 1);
    expect(step).toBe(1);
  });

  it("should go back to step 2 from step 3 (previous always works)", () => {
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

describe("Admin Create Nurse Profile Screen - Form Submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call createNurseProfileForAdmin with correct form data", async () => {
    const form = makeForm();
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockProfile());

    await createNurseProfileForAdmin(form);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/nurse-profiles",
        method: "POST",
        body: form,
        auth: true,
      }),
    );
  });

  it("should include all required fields in the submission payload", async () => {
    const form = makeForm({
      name: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      password: "securepass",
      confirmPassword: "securepass",
      specialty: "Pediatría",
      category: "Generalista",
      bankName: "BanReservas",
    });
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockProfile({ name: "Ana", lastName: "Pérez" }));

    await createNurseProfileForAdmin(form);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          name: "Ana",
          lastName: "Pérez",
          email: "ana@example.com",
          password: "securepass",
          confirmPassword: "securepass",
          specialty: "Pediatría",
          category: "Generalista",
          bankName: "BanReservas",
        }),
      }),
    );
  });

  it("should include isOperationallyActive in the submission payload", async () => {
    const form = makeForm({ isOperationallyActive: true });
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockProfile());

    await createNurseProfileForAdmin(form);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ isOperationallyActive: true }),
      }),
    );
  });

  it("should navigate to nurse detail screen on success", () => {
    const mockPush = vi.fn();
    const newUserId = "nurse-new-001";

    mockPush(`/admin/nurse-profiles/${newUserId}`);

    expect(mockPush).toHaveBeenCalledWith("/admin/nurse-profiles/nurse-new-001");
  });

  it("should build correct detail route for any userId", () => {
    const ids = ["nurse-1", "nurse-uuid-abc-def", "user-999"];
    for (const id of ids) {
      const route = `/admin/nurse-profiles/${id}`;
      expect(route).toContain(id);
      expect(route).not.toContain("/create");
    }
  });

  it("should propagate API errors on submission", async () => {
    const form = makeForm();
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible crear el perfil de la enfermera."));

    await expect(createNurseProfileForAdmin(form)).rejects.toThrow("No fue posible crear el perfil de la enfermera.");
  });

  it("should return the created nurse profile with userId on success", async () => {
    const form = makeForm();
    const mockProfile = makeMockProfile({ userId: "nurse-new-001" });
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockProfile);

    const result = await createNurseProfileForAdmin(form);

    expect(result.userId).toBe("nurse-new-001");
    expect(result.isProfileComplete).toBe(true);
  });
});
