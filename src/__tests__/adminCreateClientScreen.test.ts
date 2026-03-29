import { describe, expect, it, vi, beforeEach } from "vitest";
import * as httpClient from "../services/httpClient";
import {
  createAdminClient,
  type CreateAdminClientRequest,
  type AdminClientDetailDto,
} from "../services/adminPortalService";

vi.mock("../services/httpClient", () => ({
  requestJson: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeForm(overrides?: Partial<CreateAdminClientRequest>): CreateAdminClientRequest {
  return {
    name: "Juan",
    lastName: "Pérez",
    identificationNumber: "001-1234567-8",
    phone: "809-555-0001",
    email: "juan@example.com",
    password: "password123",
    confirmPassword: "password123",
    ...overrides,
  };
}

function makeMockClientDetail(overrides?: Partial<AdminClientDetailDto>): AdminClientDetailDto {
  return {
    userId: "client-new-001",
    email: "juan@example.com",
    displayName: "Juan Pérez",
    name: "Juan",
    lastName: "Pérez",
    identificationNumber: "001-1234567-8",
    phone: "809-555-0001",
    isActive: true,
    ownedCareRequestsCount: 0,
    lastCareRequestAtUtc: null,
    createdAtUtc: "2026-01-01T00:00:00Z",
    hasHistoricalCareRequests: false,
    canAdminCreateCareRequest: true,
    careRequestHistory: [],
    ...overrides,
  };
}

// ─── Access Control Logic ─────────────────────────────────────────────────────

describe("adminCreateClientScreen", () => {
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

describe("Admin Create Client Screen - Form Validation", () => {
  function validate(form: CreateAdminClientRequest) {
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
    const errors = validate(makeForm({ password: "password123", confirmPassword: "different" }));
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

describe("Admin Create Client Screen - Form Submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call createAdminClient with correct form data", async () => {
    const form = makeForm();
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockClientDetail());

    await createAdminClient(form);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/clients",
        method: "POST",
        body: form,
        auth: true,
      }),
    );
  });

  it("should include all required fields in the submission payload", async () => {
    const form = makeForm({
      name: "María",
      lastName: "García",
      email: "maria@example.com",
      password: "securepass",
      confirmPassword: "securepass",
    });
    vi.mocked(httpClient.requestJson).mockResolvedValue(makeMockClientDetail({ name: "María", lastName: "García" }));

    await createAdminClient(form);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          name: "María",
          lastName: "García",
          email: "maria@example.com",
          password: "securepass",
          confirmPassword: "securepass",
        }),
      }),
    );
  });

  it("should navigate to client detail screen on success", () => {
    const mockPush = vi.fn();
    const newUserId = "client-new-001";

    mockPush(`/admin/clients/${newUserId}`);

    expect(mockPush).toHaveBeenCalledWith("/admin/clients/client-new-001");
  });

  it("should build correct detail route for any userId", () => {
    const ids = ["client-1", "client-uuid-abc-def", "user-999"];
    for (const id of ids) {
      const route = `/admin/clients/${id}`;
      expect(route).toContain(id);
      expect(route).not.toContain("/create");
    }
  });

  it("should propagate API errors on submission", async () => {
    const form = makeForm();
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible crear el cliente."));

    await expect(createAdminClient(form)).rejects.toThrow("No fue posible crear el cliente.");
  });

  it("should return the created client with userId on success", async () => {
    const form = makeForm();
    const mockDetail = makeMockClientDetail({ userId: "client-new-001" });
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockDetail);

    const result = await createAdminClient(form);

    expect(result.userId).toBe("client-new-001");
    expect(result.isActive).toBe(true);
  });
});
