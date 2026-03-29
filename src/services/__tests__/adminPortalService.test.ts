import { describe, expect, it, vi, beforeEach } from "vitest";
import * as httpClient from "../httpClient";
import {
  // Nurse Profile functions
  getPendingNurseProfiles,
  getActiveNurseProfiles,
  getInactiveNurseProfiles,
  getNurseProfileForAdmin,
  createNurseProfileForAdmin,
  updateNurseProfileForAdmin,
  completeNurseProfileForAdmin,
  setNurseOperationalAccessForAdmin,
  // Client functions
  getAdminClients,
  getAdminClientDetail,
  createAdminClient,
  updateAdminClient,
  updateAdminClientActiveState,
  // User functions
  getAdminUsers,
  getAdminUserDetail,
  updateAdminUser,
  updateAdminUserRoles,
  updateAdminUserActiveState,
  invalidateAdminUserSessions,
  // Admin Account functions
  createAdminAccount,
  // Care Request functions
  getAdminCareRequests,
  getAdminCareRequestDetail,
  getAdminCareRequestClients,
  createAdminCareRequest,
} from "../adminPortalService";

// Mock the httpClient module
vi.mock("../httpClient", () => ({
  requestJson: vi.fn(),
}));

describe("Admin Portal Service - Query Parameter Construction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAdminCareRequests", () => {
    it("should construct query parameters correctly with view filter", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminCareRequests({ view: "pending" });

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/care-requests?view=pending",
        method: "GET",
        auth: true,
      });
    });

    it("should construct query parameters correctly with search", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminCareRequests({ search: "test search" });

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/care-requests?search=test+search",
        method: "GET",
        auth: true,
      });
    });

    it("should construct query parameters correctly with both view and search", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminCareRequests({ view: "approved", search: "client name" });

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/care-requests?view=approved&search=client+name",
        method: "GET",
        auth: true,
      });
    });

    it("should not include view parameter when view is 'all'", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminCareRequests({ view: "all" });

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/care-requests?",
        method: "GET",
        auth: true,
      });
    });

    it("should handle special characters in search query", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminCareRequests({ search: "test@email.com & special" });

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/care-requests?search=test%40email.com+%26+special",
        method: "GET",
        auth: true,
      });
    });
  });

  describe("getAdminClients", () => {
    it("should construct query parameters correctly with search", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminClients({ search: "john doe" });

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/clients?search=john+doe",
        method: "GET",
        auth: true,
      });
    });

    it("should construct query parameters correctly with status filter", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminClients({ status: "active" });

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/clients?status=active",
        method: "GET",
        auth: true,
      });
    });

    it("should construct query parameters correctly with both search and status", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminClients({ search: "test", status: "inactive" });

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/clients?search=test&status=inactive",
        method: "GET",
        auth: true,
      });
    });

    it("should trim whitespace from search parameter", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminClients({ search: "  test  " });

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/clients?search=test",
        method: "GET",
        auth: true,
      });
    });

    it("should not include search parameter when search is empty after trimming", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminClients({ search: "   " });

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/clients",
        method: "GET",
        auth: true,
      });
    });
  });

  describe("getAdminUsers", () => {
    it("should construct query parameters correctly with search", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminUsers({ search: "user search" });

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/users?search=user+search",
        method: "GET",
        auth: true,
      });
    });

    it("should construct query parameters correctly with role filter", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminUsers({ role: "ADMIN" });

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/users?role=ADMIN",
        method: "GET",
        auth: true,
      });
    });

    it("should construct query parameters correctly with profileType filter", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminUsers({ profileType: "NURSE" });

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/users?profileType=NURSE",
        method: "GET",
        auth: true,
      });
    });

    it("should construct query parameters correctly with status filter", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminUsers({ status: "Active" });

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/users?status=Active",
        method: "GET",
        auth: true,
      });
    });

    it("should construct query parameters correctly with all filters", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminUsers({
        search: "test",
        role: "NURSE",
        profileType: "NURSE",
        status: "Active",
      });

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/users?search=test&role=NURSE&profileType=NURSE&status=Active",
        method: "GET",
        auth: true,
      });
    });
  });

  describe("getAdminCareRequestClients", () => {
    it("should construct query parameters correctly with search", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminCareRequestClients("client search");

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/care-requests/clients?search=client%20search",
        method: "GET",
        auth: true,
      });
    });

    it("should handle undefined search parameter", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminCareRequestClients();

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/care-requests/clients",
        method: "GET",
        auth: true,
      });
    });

    it("should URL encode special characters in search", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminCareRequestClients("test@example.com");

      expect(mockRequestJson).toHaveBeenCalledWith({
        path: "/api/admin/care-requests/clients?search=test%40example.com",
        method: "GET",
        auth: true,
      });
    });
  });
});

describe("Admin Portal Service - Error Handling with Spanish Messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should propagate Spanish error messages from httpClient", async () => {
    const mockRequestJson = vi.mocked(httpClient.requestJson);
    const spanishError = new Error("No fue posible conectarse al servidor");
    mockRequestJson.mockRejectedValue(spanishError);

    await expect(getAdminClients()).rejects.toThrow("No fue posible conectarse al servidor");
  });

  it("should propagate validation error messages in Spanish", async () => {
    const mockRequestJson = vi.mocked(httpClient.requestJson);
    const validationError = new Error("El correo electrónico ya está en uso");
    mockRequestJson.mockRejectedValue(validationError);

    await expect(
      createAdminClient({
        name: "Test",
        lastName: "User",
        identificationNumber: "123",
        phone: "555-1234",
        email: "test@example.com",
        password: "password",
        confirmPassword: "password",
      }),
    ).rejects.toThrow("El correo electrónico ya está en uso");
  });

  it("should propagate 401 error messages in Spanish", async () => {
    const mockRequestJson = vi.mocked(httpClient.requestJson);
    const authError = new Error("No autorizado. Por favor inicie sesión nuevamente");
    mockRequestJson.mockRejectedValue(authError);

    await expect(getAdminUsers()).rejects.toThrow(
      "No autorizado. Por favor inicie sesión nuevamente",
    );
  });

  it("should propagate 403 error messages in Spanish", async () => {
    const mockRequestJson = vi.mocked(httpClient.requestJson);
    const forbiddenError = new Error("No tiene permisos para realizar esta acción");
    mockRequestJson.mockRejectedValue(forbiddenError);

    await expect(createAdminAccount({
      name: "ADMIN",
      lastName: "User",
      identificationNumber: "123",
      phone: "555-1234",
      email: "admin@example.com",
      password: "password",
      confirmPassword: "password",
    })).rejects.toThrow("No tiene permisos para realizar esta acción");
  });

  it("should propagate 500 error messages in Spanish", async () => {
    const mockRequestJson = vi.mocked(httpClient.requestJson);
    const serverError = new Error("Error interno del servidor. Por favor intente más tarde");
    mockRequestJson.mockRejectedValue(serverError);

    await expect(getNurseProfileForAdmin("user-123")).rejects.toThrow(
      "Error interno del servidor. Por favor intente más tarde",
    );
  });
});

describe("Admin Portal Service - Auth: true Requirement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Nurse Profile functions", () => {
    it("getPendingNurseProfiles should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getPendingNurseProfiles();

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("getActiveNurseProfiles should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getActiveNurseProfiles();

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("getInactiveNurseProfiles should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getInactiveNurseProfiles();

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("getNurseProfileForAdmin should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue({});

      await getNurseProfileForAdmin("user-123");

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("createNurseProfileForAdmin should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue({});

      await createNurseProfileForAdmin({
        name: "Test",
        lastName: "NURSE",
        identificationNumber: "123",
        phone: "555-1234",
        email: "nurse@example.com",
        password: "password",
        confirmPassword: "password",
        hireDate: "2024-01-01",
        specialty: "General",
        bankName: "Bank",
        category: "Category",
        isOperationallyActive: true,
      });

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("updateNurseProfileForAdmin should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue({});

      await updateNurseProfileForAdmin("user-123", {
        name: "Test",
        lastName: "NURSE",
        identificationNumber: "123",
        phone: "555-1234",
        email: "nurse@example.com",
        hireDate: "2024-01-01",
        specialty: "General",
        bankName: "Bank",
        category: "Category",
      });

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("completeNurseProfileForAdmin should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue({});

      await completeNurseProfileForAdmin("user-123", {
        name: "Test",
        lastName: "NURSE",
        identificationNumber: "123",
        phone: "555-1234",
        email: "nurse@example.com",
        hireDate: "2024-01-01",
        specialty: "General",
        bankName: "Bank",
        category: "Category",
      });

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("setNurseOperationalAccessForAdmin should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue({});

      await setNurseOperationalAccessForAdmin("user-123", true);

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });
  });

  describe("Client functions", () => {
    it("getAdminClients should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminClients();

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("getAdminClientDetail should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue({});

      await getAdminClientDetail("client-123");

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("createAdminClient should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue({});

      await createAdminClient({
        name: "Test",
        lastName: "CLIENT",
        identificationNumber: "123",
        phone: "555-1234",
        email: "client@example.com",
        password: "password",
        confirmPassword: "password",
      });

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("updateAdminClient should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue({});

      await updateAdminClient("client-123", {
        name: "Test",
        lastName: "CLIENT",
        identificationNumber: "123",
        phone: "555-1234",
        email: "client@example.com",
      });

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("updateAdminClientActiveState should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue({});

      await updateAdminClientActiveState("client-123", true);

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });
  });

  describe("User functions", () => {
    it("getAdminUsers should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminUsers();

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("getAdminUserDetail should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue({});

      await getAdminUserDetail("user-123");

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("updateAdminUser should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue({});

      await updateAdminUser("user-123", {
        name: "Test",
        lastName: "User",
        identificationNumber: "123",
        phone: "555-1234",
        email: "user@example.com",
      });

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("updateAdminUserRoles should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue({});

      await updateAdminUserRoles("user-123", ["ADMIN", "CLIENT"]);

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("updateAdminUserActiveState should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue({});

      await updateAdminUserActiveState("user-123", true);

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("invalidateAdminUserSessions should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue({});

      await invalidateAdminUserSessions("user-123");

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });
  });

  describe("Admin Account functions", () => {
    it("createAdminAccount should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue({});

      await createAdminAccount({
        name: "ADMIN",
        lastName: "User",
        identificationNumber: "123",
        phone: "555-1234",
        email: "admin@example.com",
        password: "password",
        confirmPassword: "password",
      });

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });
  });

  describe("Care Request functions", () => {
    it("getAdminCareRequests should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminCareRequests();

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("getAdminCareRequestDetail should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue({});

      await getAdminCareRequestDetail("request-123");

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("getAdminCareRequestClients should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue([]);

      await getAdminCareRequestClients();

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });

    it("createAdminCareRequest should use auth: true", async () => {
      const mockRequestJson = vi.mocked(httpClient.requestJson);
      mockRequestJson.mockResolvedValue({ id: "new-request-123" });

      await createAdminCareRequest({
        clientUserId: "client-123",
        careRequestDescription: "Test request",
        careRequestType: "domicilio_24h",
      });

      expect(mockRequestJson).toHaveBeenCalledWith(
        expect.objectContaining({ auth: true }),
      );
    });
  });
});

describe("Admin Portal Service - Request Method Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use GET method for list endpoints", async () => {
    const mockRequestJson = vi.mocked(httpClient.requestJson);
    mockRequestJson.mockResolvedValue([]);

    await getAdminClients();
    await getAdminUsers();
    await getAdminCareRequests();
    await getPendingNurseProfiles();

    expect(mockRequestJson).toHaveBeenCalledWith(
      expect.objectContaining({ method: "GET" }),
    );
    expect(mockRequestJson).toHaveBeenCalledTimes(4);
  });

  it("should use GET method for detail endpoints", async () => {
    const mockRequestJson = vi.mocked(httpClient.requestJson);
    mockRequestJson.mockResolvedValue({});

    await getAdminClientDetail("client-123");
    await getAdminUserDetail("user-123");
    await getAdminCareRequestDetail("request-123");
    await getNurseProfileForAdmin("nurse-123");

    expect(mockRequestJson).toHaveBeenCalledWith(
      expect.objectContaining({ method: "GET" }),
    );
    expect(mockRequestJson).toHaveBeenCalledTimes(4);
  });

  it("should use POST method for create endpoints", async () => {
    const mockRequestJson = vi.mocked(httpClient.requestJson);
    mockRequestJson.mockResolvedValue({});

    await createAdminClient({
      name: "Test",
      lastName: "CLIENT",
      identificationNumber: "123",
      phone: "555-1234",
      email: "client@example.com",
      password: "password",
      confirmPassword: "password",
    });

    await createAdminAccount({
      name: "ADMIN",
      lastName: "User",
      identificationNumber: "123",
      phone: "555-1234",
      email: "admin@example.com",
      password: "password",
      confirmPassword: "password",
    });

    expect(mockRequestJson).toHaveBeenCalledWith(
      expect.objectContaining({ method: "POST" }),
    );
    expect(mockRequestJson).toHaveBeenCalledTimes(2);
  });

  it("should use PUT method for update endpoints", async () => {
    const mockRequestJson = vi.mocked(httpClient.requestJson);
    mockRequestJson.mockResolvedValue({});

    await updateAdminClient("client-123", {
      name: "Test",
      lastName: "CLIENT",
      identificationNumber: "123",
      phone: "555-1234",
      email: "client@example.com",
    });

    await updateAdminUser("user-123", {
      name: "Test",
      lastName: "User",
      identificationNumber: "123",
      phone: "555-1234",
      email: "user@example.com",
    });

    expect(mockRequestJson).toHaveBeenCalledWith(
      expect.objectContaining({ method: "PUT" }),
    );
    expect(mockRequestJson).toHaveBeenCalledTimes(2);
  });

  it("should use POST method for action endpoints", async () => {
    const mockRequestJson = vi.mocked(httpClient.requestJson);
    mockRequestJson.mockResolvedValue({});

    await invalidateAdminUserSessions("user-123");

    expect(mockRequestJson).toHaveBeenCalledWith(
      expect.objectContaining({ method: "POST" }),
    );
  });
});
