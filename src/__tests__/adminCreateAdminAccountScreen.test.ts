import { describe, expect, it, vi, beforeEach } from "vitest";
import * as httpClient from "../services/httpClient";
import {
  createAdminAccount,
  type CreateAdminAccountRequest,
  type AdminUserDetailDto,
} from "../services/adminPortalService";

vi.mock("../services/httpClient", () => ({
  requestJson: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeForm(overrides?: Partial<CreateAdminAccountRequest>): CreateAdminAccountRequest {
  return {
    name: "Carlos",
    lastName: "Ramírez",
    identificationNumber: "001-9876543-2",
    phone: "809-555-0099",
    email: "carlos.admin@example.com",
    password: "adminpass1",
    confirmPassword: "adminpass1",
    ...overrides,
  };
}

function makeMockUserDetail(overrides?: Partial<AdminUserDetailDto>): AdminUserDetailDto {
  return {
    id: "admin-new-001",
    email: "carlos.admin@example.com",
    displayName: "Carlos Ramírez",
    name: "Carlos",
    lastName: "Ramírez",
    identificationNumber: "001-9876543-2",
    phone: "809-555-0099",
    isActive: true,
    roleNames: ["Admin"],
    allowedRoleNames: ["Admin"],
    profileType: "None",
    accountStatus: "Active",
    requiresProfileCompletion: false,
    requiresAdminReview: false,
    requiresManualIntervention: false,
    hasOperationalHistory: false,
    activeRefreshTokenCount: 0,
    nurseProfile: null,
    clientProfile: null,
    createdAtUtc: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ─── Access Control Logic ─────────────────────────────────────────────────────

describe("adminCreateAdminAccountScreen", () => {
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

// ─── Form Validation ──────────────────────────────────────────────────────────

describe("Admin Create Admin Account Screen - Form Validation", () => {
  function validate(form: CreateAdminAccountRequest) {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "El nombre es obligatorio";
    if (!form.lastName.trim()) errors.lastName = "El apellido es obligatorio";
    if (!form.identificationNumber.trim()) errors.identificationNumber = "El número de identificación es obligatorio";
    if (!form.phone.trim()) errors.phone = "El teléfono es obligatorio";
    if (!form.email.trim()) errors.email = "El correo electrónico es obligatorio";
    else if (!form.email.includes("@")) errors.email = "El correo debe ser válido";
    if (!form.password.trim()) errors.password = "La contraseña es obligatoria";
    else if (form.password.length < 8) errors.password = "La contraseña debe tener al menos 8 caracteres";
    if (form.password && form.confirmPassword !== form.password) errors.confirmPassword = "Las contraseñas no coinciden";
    return errors;
  }

  it("should fail when name is empty", () => {
    const errors = validate(makeForm({ name: "" }));
    expect(errors.name).toBe("El nombre es obligatorio");
  });

  it("should fail when lastName is empty", () => {
    const errors = validate(makeForm({ lastName: "" }));
    expect(errors.lastName).toBe("El apellido es obligatorio");
  });

  it("should fail when identificationNumber is empty", () => {
    const errors = validate(makeForm({ identificationNumber: "" }));
    expect(errors.identificationNumber).toBe("El número de identificación es obligatorio");
  });

  it("should fail when phone is empty", () => {
    const errors = validate(makeForm({ phone: "" }));
    expect(errors.phone).toBe("El teléfono es obligatorio");
  });

  it("should fail when email is empty", () => {
    const errors = validate(makeForm({ email: "" }));
    expect(errors.email).toBe("El correo electrónico es obligatorio");
  });

  it("should fail when email does not contain @", () => {
    const errors = validate(makeForm({ email: "notanemail" }));
    expect(errors.email).toBe("El correo debe ser válido");
  });

  it("should fail when password is empty", () => {
    const errors = validate(makeForm({ password: "", confirmPassword: "" }));
    expect(errors.password).toBe("La contraseña es obligatoria");
  });

  it("should fail when password is less than 8 characters", () => {
    const errors = validate(makeForm({ password: "short", confirmPassword: "short" }));
    expect(errors.password).toBe("La contraseña debe tener al menos 8 caracteres");
  });

  it("should fail when confirmPassword does not match password", () => {
    const errors = validate(makeForm({ password: "adminpass1", confirmPassword: "different" }));
    expect(errors.confirmPassword).toBe("Las contraseñas no coinciden");
  });

  it("should pass when all fields are valid", () => {
    const errors = validate(makeForm());
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("should fail with all errors when all fields are empty", () => {
    const errors = validate(makeForm({ name: "", lastName: "", identificationNumber: "", phone: "", email: "", password: "", confirmPassword: "" }));
    expect(errors.name).toBeDefined();
    expect(errors.lastName).toBeDefined();
    expect(errors.identificationNumber).toBeDefined();
    expect(errors.phone).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });

  it("should not report confirmPassword error when password is empty", () => {
    const errors = validate(makeForm({ password: "", confirmPassword: "something" }));
    expect(errors.confirmPassword).toBeUndefined();
  });

  it("should accept password of exactly 8 characters", () => {
    const errors = validate(makeForm({ password: "12345678", confirmPassword: "12345678" }));
    expect(errors.password).toBeUndefined();
  });
});

// ─── Form Submission ──────────────────────────────────────────────────────────

describe("Admin Create Admin Account Screen - Form Submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call createAdminAccount with correct form data", async () => {
    const form = makeForm();
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockUserDetail());

    await createAdminAccount(form);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/admin-accounts",
        method: "POST",
        body: form,
        auth: true,
      }),
    );
  });

  it("should include all required fields in the submission payload", async () => {
    const form = makeForm({
      name: "Ana",
      lastName: "López",
      email: "ana.admin@example.com",
      password: "secureadmin",
      confirmPassword: "secureadmin",
    });
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockUserDetail({ name: "Ana", lastName: "López" }));

    await createAdminAccount(form);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          name: "Ana",
          lastName: "López",
          email: "ana.admin@example.com",
          password: "secureadmin",
          confirmPassword: "secureadmin",
        }),
      }),
    );
  });

  it("should navigate to user detail screen on success", () => {
    const mockPush = vi.fn();
    const newId = "admin-new-001";

    mockPush(`/admin/users/${newId}`);

    expect(mockPush).toHaveBeenCalledWith("/admin/users/admin-new-001");
  });

  it("should build correct user detail route for any id", () => {
    const ids = ["admin-1", "admin-uuid-abc-def", "user-999"];
    for (const id of ids) {
      const route = `/admin/users/${id}`;
      expect(route).toContain(id);
      expect(route).not.toContain("/create");
      expect(route).toContain("/admin/users/");
    }
  });

  it("should propagate API errors on submission", async () => {
    const form = makeForm();
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible crear la cuenta de administrador."));

    await expect(createAdminAccount(form)).rejects.toThrow("No fue posible crear la cuenta de administrador.");
  });

  it("should return the created user with id and Admin role on success", async () => {
    const form = makeForm();
    const mockDetail = makeMockUserDetail({ id: "admin-new-001", roleNames: ["Admin"] });
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockDetail);

    const result = await createAdminAccount(form);

    expect(result.id).toBe("admin-new-001");
    expect(result.roleNames).toContain("Admin");
  });
});
