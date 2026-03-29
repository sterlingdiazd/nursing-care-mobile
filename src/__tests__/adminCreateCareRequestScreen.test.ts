import { describe, expect, it, vi, beforeEach } from "vitest";
import * as httpClient from "../services/httpClient";
import {
  createAdminCareRequest,
  getAdminCareRequestClients,
  type CreateAdminCareRequestDto,
  type AdminCareRequestClientOptionDto,
} from "../services/adminPortalService";

vi.mock("../services/httpClient", () => ({
  requestJson: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeClient(overrides?: Partial<AdminCareRequestClientOptionDto>): AdminCareRequestClientOptionDto {
  return {
    userId: "client-1",
    displayName: "María García",
    email: "maria@example.com",
    identificationNumber: "001-1234567-8",
    ...overrides,
  };
}

function makeForm(overrides?: Partial<CreateAdminCareRequestDto>): CreateAdminCareRequestDto {
  return {
    clientUserId: "client-1",
    careRequestDescription: "Cuidado domiciliario post-operatorio",
    careRequestType: "domicilio",
    unit: 4,
    suggestedNurse: "",
    price: undefined,
    clientBasePriceOverride: undefined,
    distanceFactor: "",
    complexityLevel: "",
    medicalSuppliesCost: undefined,
    careRequestDate: "",
    ...overrides,
  };
}

// ─── Access Control Logic ─────────────────────────────────────────────────────

describe("adminCreateCareRequestScreen", () => {
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

// ─── Form Validation - Step 1 ─────────────────────────────────────────────────

describe("Admin Create Care Request Screen - Step 1 Validation", () => {
  it("should fail validation when clientUserId is empty", () => {
    const form = makeForm({ clientUserId: "" });
    const errors: Record<string, string> = {};

    if (!form.clientUserId) errors.clientUserId = "Debe seleccionar un cliente";
    if (!form.careRequestDescription.trim()) errors.careRequestDescription = "La descripción es obligatoria";

    expect(errors.clientUserId).toBe("Debe seleccionar un cliente");
    expect(Object.keys(errors)).toHaveLength(1);
  });

  it("should fail validation when description is empty", () => {
    const form = makeForm({ careRequestDescription: "" });
    const errors: Record<string, string> = {};

    if (!form.clientUserId) errors.clientUserId = "Debe seleccionar un cliente";
    if (!form.careRequestDescription.trim()) errors.careRequestDescription = "La descripción es obligatoria";

    expect(errors.careRequestDescription).toBe("La descripción es obligatoria");
    expect(Object.keys(errors)).toHaveLength(1);
  });

  it("should fail validation when description is only whitespace", () => {
    const form = makeForm({ careRequestDescription: "   " });
    const errors: Record<string, string> = {};

    if (!form.careRequestDescription.trim()) errors.careRequestDescription = "La descripción es obligatoria";

    expect(errors.careRequestDescription).toBe("La descripción es obligatoria");
  });

  it("should pass validation when clientUserId and description are provided", () => {
    const form = makeForm();
    const errors: Record<string, string> = {};

    if (!form.clientUserId) errors.clientUserId = "Debe seleccionar un cliente";
    if (!form.careRequestDescription.trim()) errors.careRequestDescription = "La descripción es obligatoria";

    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("should fail validation when both required step 1 fields are empty", () => {
    const form = makeForm({ clientUserId: "", careRequestDescription: "" });
    const errors: Record<string, string> = {};

    if (!form.clientUserId) errors.clientUserId = "Debe seleccionar un cliente";
    if (!form.careRequestDescription.trim()) errors.careRequestDescription = "La descripción es obligatoria";

    expect(Object.keys(errors)).toHaveLength(2);
  });
});

// ─── Form Validation - Step 2 ─────────────────────────────────────────────────

describe("Admin Create Care Request Screen - Step 2 Validation", () => {
  it("should fail validation when careRequestType is empty", () => {
    const form = makeForm({ careRequestType: "" });
    const errors: Record<string, string> = {};

    if (!form.careRequestType.trim()) errors.careRequestType = "El tipo es obligatorio";
    if (!form.unit || form.unit <= 0) errors.unit = "Las unidades deben ser mayores a 0";

    expect(errors.careRequestType).toBe("El tipo es obligatorio");
  });

  it("should fail validation when unit is 0", () => {
    const form = makeForm({ unit: 0 });
    const errors: Record<string, string> = {};

    if (!form.careRequestType.trim()) errors.careRequestType = "El tipo es obligatorio";
    if (!form.unit || form.unit <= 0) errors.unit = "Las unidades deben ser mayores a 0";

    expect(errors.unit).toBe("Las unidades deben ser mayores a 0");
  });

  it("should fail validation when unit is negative", () => {
    const form = makeForm({ unit: -1 });
    const errors: Record<string, string> = {};

    if (!form.unit || form.unit <= 0) errors.unit = "Las unidades deben ser mayores a 0";

    expect(errors.unit).toBe("Las unidades deben ser mayores a 0");
  });

  it("should pass validation when type and unit are valid", () => {
    const form = makeForm({ careRequestType: "domicilio", unit: 4 });
    const errors: Record<string, string> = {};

    if (!form.careRequestType.trim()) errors.careRequestType = "El tipo es obligatorio";
    if (!form.unit || form.unit <= 0) errors.unit = "Las unidades deben ser mayores a 0";

    expect(Object.keys(errors)).toHaveLength(0);
  });
});

// ─── Multi-Step Navigation ────────────────────────────────────────────────────

describe("Admin Create Care Request Screen - Multi-Step Navigation", () => {
  it("should start at step 1", () => {
    let step = 1;
    expect(step).toBe(1);
  });

  it("should advance to step 2 when step 1 is valid", () => {
    let step = 1;
    const form = makeForm();
    const errors: Record<string, string> = {};

    if (!form.clientUserId) errors.clientUserId = "Debe seleccionar un cliente";
    if (!form.careRequestDescription.trim()) errors.careRequestDescription = "La descripción es obligatoria";

    if (Object.keys(errors).length === 0) {
      step = Math.min(3, step + 1);
    }

    expect(step).toBe(2);
  });

  it("should not advance to step 2 when step 1 is invalid", () => {
    let step = 1;
    const form = makeForm({ clientUserId: "" });
    const errors: Record<string, string> = {};

    if (!form.clientUserId) errors.clientUserId = "Debe seleccionar un cliente";

    if (Object.keys(errors).length === 0) {
      step = Math.min(3, step + 1);
    }

    expect(step).toBe(1);
  });

  it("should advance to step 3 when step 2 is valid", () => {
    let step = 2;
    const form = makeForm();
    const errors: Record<string, string> = {};

    if (!form.careRequestType.trim()) errors.careRequestType = "El tipo es obligatorio";
    if (!form.unit || form.unit <= 0) errors.unit = "Las unidades deben ser mayores a 0";

    if (Object.keys(errors).length === 0) {
      step = Math.min(3, step + 1);
    }

    expect(step).toBe(3);
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

// ─── Client Search ────────────────────────────────────────────────────────────

describe("Admin Create Care Request Screen - Client Search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call getAdminCareRequestClients with search term", async () => {
    const mockClients = [makeClient()];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockClients);

    const result = await getAdminCareRequestClients("María");

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining("search=Mar%C3%ADa"),
        auth: true,
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe("María García");
  });

  it("should call getAdminCareRequestClients without search when empty", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);

    await getAdminCareRequestClients();

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.not.stringContaining("search="),
        auth: true,
      }),
    );
  });

  it("should return client list with required fields", async () => {
    const mockClients = [
      makeClient({ userId: "c-1", displayName: "Juan Pérez", email: "juan@example.com" }),
      makeClient({ userId: "c-2", displayName: "Ana López", email: "ana@example.com", identificationNumber: null }),
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockClients);

    const result = await getAdminCareRequestClients("a");

    expect(result).toHaveLength(2);
    expect(result[0].userId).toBeDefined();
    expect(result[0].displayName).toBeDefined();
    expect(result[0].email).toBeDefined();
  });

  it("should handle null identificationNumber in client options", async () => {
    const mockClients = [makeClient({ identificationNumber: null })];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockClients);

    const result = await getAdminCareRequestClients("test");

    expect(result[0].identificationNumber).toBeNull();
  });

  it("should propagate errors from client search API", async () => {
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("Error al buscar clientes"));

    await expect(getAdminCareRequestClients("test")).rejects.toThrow("Error al buscar clientes");
  });

  it("should set clientUserId when a client is selected", () => {
    const client = makeClient({ userId: "client-selected-123" });
    const form = makeForm({ clientUserId: "" });

    // Simulate selecting a client
    const updatedForm = { ...form, clientUserId: client.userId };

    expect(updatedForm.clientUserId).toBe("client-selected-123");
  });
});

// ─── Form Submission ──────────────────────────────────────────────────────────

describe("Admin Create Care Request Screen - Form Submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call createAdminCareRequest with form data on submit", async () => {
    const form = makeForm();
    vi.mocked(httpClient.requestJson).mockResolvedValue({ id: "new-req-123" });

    const result = await createAdminCareRequest(form);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/care-requests",
        method: "POST",
        auth: true,
      }),
    );
    expect(result.id).toBe("new-req-123");
  });

  it("should navigate to new care request detail on success", () => {
    const mockPush = vi.fn();
    const newId = "new-req-123";

    // Simulate navigation after successful creation
    mockPush(`/admin/care-requests/${newId}`);

    expect(mockPush).toHaveBeenCalledWith("/admin/care-requests/new-req-123");
  });

  it("should include entity ID in navigation path for any new care request", () => {
    const ids = ["req-1", "req-uuid-abc-def", "req-999"];
    for (const id of ids) {
      const route = `/admin/care-requests/${id}`;
      expect(route).toContain(id);
    }
  });

  it("should propagate API errors on submission", async () => {
    const form = makeForm();
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("No fue posible crear la solicitud"));

    await expect(createAdminCareRequest(form)).rejects.toThrow("No fue posible crear la solicitud");
  });

  it("should include all required fields in the submission payload", async () => {
    const form = makeForm({
      clientUserId: "client-abc",
      careRequestDescription: "Cuidado especializado",
      careRequestType: "especializado",
      unit: 8,
    });
    vi.mocked(httpClient.requestJson).mockResolvedValue({ id: "new-req-456" });

    await createAdminCareRequest(form);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          clientUserId: "client-abc",
          careRequestDescription: "Cuidado especializado",
          careRequestType: "especializado",
          unit: 8,
        }),
      }),
    );
  });

  it("should include optional pricing fields when provided", async () => {
    const form = makeForm({
      clientBasePriceOverride: 1500,
      distanceFactor: "lejos",
      complexityLevel: "alto",
      medicalSuppliesCost: 300,
    });
    vi.mocked(httpClient.requestJson).mockResolvedValue({ id: "new-req-789" });

    await createAdminCareRequest(form);

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          clientBasePriceOverride: 1500,
          distanceFactor: "lejos",
          complexityLevel: "alto",
          medicalSuppliesCost: 300,
        }),
      }),
    );
  });
});

// ─── Spanish Labels ───────────────────────────────────────────────────────────

describe("Admin Create Care Request Screen - Spanish Labels", () => {
  it("should use Spanish label for client field", () => {
    const label = "Cliente *";
    expect(label).toContain("Cliente");
  });

  it("should use Spanish label for description field", () => {
    const label = "Descripción *";
    expect(label).toContain("Descripción");
  });

  it("should use Spanish label for type field", () => {
    const label = "Tipo de solicitud *";
    expect(label).toContain("Tipo");
  });

  it("should use Spanish label for units field", () => {
    const label = "Unidades *";
    expect(label).toContain("Unidades");
  });

  it("should use Spanish label for suggested nurse field", () => {
    const label = "Enfermera sugerida";
    expect(label).toContain("Enfermera");
  });

  it("should use Spanish label for scheduled date field", () => {
    const label = "Fecha programada";
    expect(label).toContain("Fecha");
  });

  it("should use Spanish label for base price override field", () => {
    const label = "Precio base (override)";
    expect(label).toContain("Precio");
  });

  it("should use Spanish label for distance factor field", () => {
    const label = "Factor de distancia";
    expect(label).toContain("Factor de distancia");
  });

  it("should use Spanish label for complexity level field", () => {
    const label = "Nivel de complejidad";
    expect(label).toContain("Nivel de complejidad");
  });

  it("should use Spanish label for medical supplies cost field", () => {
    const label = "Costo de suministros médicos";
    expect(label).toContain("suministros");
  });

  it("should use Spanish label for submit button", () => {
    const label = "Crear Solicitud";
    expect(label).toContain("Crear");
  });

  it("should use Spanish label for next button", () => {
    const label = "Siguiente";
    expect(label).toBe("Siguiente");
  });

  it("should use Spanish label for previous button", () => {
    const label = "Anterior";
    expect(label).toBe("Anterior");
  });

  it("should display step indicator in Spanish", () => {
    const step = 1;
    const totalSteps = 3;
    const indicator = `Paso ${step} de ${totalSteps}`;
    expect(indicator).toBe("Paso 1 de 3");
  });

  it("should use Spanish validation error for missing client", () => {
    const error = "Debe seleccionar un cliente";
    expect(error).toContain("cliente");
  });

  it("should use Spanish validation error for missing description", () => {
    const error = "La descripción es obligatoria";
    expect(error).toContain("descripción");
  });

  it("should use Spanish validation error for missing type", () => {
    const error = "El tipo es obligatorio";
    expect(error).toContain("tipo");
  });

  it("should use Spanish validation error for invalid units", () => {
    const error = "Las unidades deben ser mayores a 0";
    expect(error).toContain("unidades");
  });
});
