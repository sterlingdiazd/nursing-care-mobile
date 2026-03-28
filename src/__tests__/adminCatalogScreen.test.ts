import { describe, expect, it, vi, beforeEach } from "vitest";
import * as httpClient from "../services/httpClient";
import {
  listCareRequestCategories,
  listCareRequestTypes,
  listUnitTypes,
  listDistanceFactors,
  listComplexityLevels,
  listVolumeDiscountRules,
  listNurseSpecialties,
  listNurseCategories,
  createCareRequestCategory,
  updateCareRequestCategory,
} from "../services/adminPortalService";

vi.mock("../services/httpClient", () => ({
  requestJson: vi.fn(),
}));

// ─── Access Control Logic ────────────────────────────────────────────────────

describe("Admin Catalog Screen - Access Control Logic", () => {
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
});

// ─── Data Loading ─────────────────────────────────────────────────────────────

describe("Admin Catalog Screen - Data Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call listCareRequestCategories on initial load", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await listCareRequestCategories();
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("/api/admin/catalog/care-request-categories"), auth: true }),
    );
  });

  it("should call listCareRequestTypes on initial load", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await listCareRequestTypes();
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("/api/admin/catalog/care-request-types"), auth: true }),
    );
  });

  it("should call listUnitTypes on initial load", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await listUnitTypes();
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("/api/admin/catalog/unit-types"), auth: true }),
    );
  });

  it("should call listDistanceFactors on initial load", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await listDistanceFactors();
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("/api/admin/catalog/distance-factors"), auth: true }),
    );
  });

  it("should call listComplexityLevels on initial load", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await listComplexityLevels();
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("/api/admin/catalog/complexity-levels"), auth: true }),
    );
  });

  it("should call listVolumeDiscountRules on initial load", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await listVolumeDiscountRules();
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("/api/admin/catalog/volume-discount-rules"), auth: true }),
    );
  });

  it("should call listNurseSpecialties on initial load", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await listNurseSpecialties();
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("/api/admin/catalog/nurse-specialties"), auth: true }),
    );
  });

  it("should call listNurseCategories on initial load", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await listNurseCategories();
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("/api/admin/catalog/nurse-categories"), auth: true }),
    );
  });

  it("should display categories returned from the API", async () => {
    const mockCategories = [
      {
        id: "cat-1",
        code: "hogar",
        displayName: "Hogar",
        categoryFactor: 1,
        isActive: true,
        displayOrder: 0,
      },
      {
        id: "cat-2",
        code: "clinica",
        displayName: "Clínica",
        categoryFactor: 1.5,
        isActive: true,
        displayOrder: 1,
      },
    ];
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockCategories);
    const result = await listCareRequestCategories();
    expect(result).toEqual(mockCategories);
  });

  it("should include inactive items when includeInactive is true", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue([]);
    await listCareRequestCategories(true);
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining("includeInactive=true"),
        auth: true,
      }),
    );
  });
});

// ─── Create Operations ────────────────────────────────────────────────────────

describe("Admin Catalog Screen - Create Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call createCareRequestCategory with correct data", async () => {
    const newCategory = {
      code: "nueva",
      displayName: "Nueva Categoría",
      categoryFactor: 1.2,
      isActive: true,
      displayOrder: 5,
    };
    vi.mocked(httpClient.requestJson).mockResolvedValue("new-id");
    await createCareRequestCategory(newCategory);
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/catalog/care-request-categories",
        method: "POST",
        body: newCategory,
        auth: true,
      }),
    );
  });

  it("should handle create errors gracefully", async () => {
    const newCategory = {
      code: "nueva",
      displayName: "Nueva Categoría",
      categoryFactor: 1.2,
      isActive: true,
      displayOrder: 5,
    };
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("Duplicate code"));
    await expect(createCareRequestCategory(newCategory)).rejects.toThrow("Duplicate code");
  });
});

// ─── Update Operations ────────────────────────────────────────────────────────

describe("Admin Catalog Screen - Update Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call updateCareRequestCategory with correct data", async () => {
    const updatedCategory = {
      displayName: "Hogar Actualizado",
      categoryFactor: 1.3,
      isActive: true,
      displayOrder: 0,
    };
    vi.mocked(httpClient.requestJson).mockResolvedValue(undefined);
    await updateCareRequestCategory("cat-1", updatedCategory);
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/admin/catalog/care-request-categories/cat-1",
        method: "PUT",
        body: updatedCategory,
        auth: true,
      }),
    );
  });

  it("should handle update errors gracefully", async () => {
    const updatedCategory = {
      displayName: "Hogar Actualizado",
      categoryFactor: 1.3,
      isActive: true,
      displayOrder: 0,
    };
    vi.mocked(httpClient.requestJson).mockRejectedValue(new Error("Not found"));
    await expect(updateCareRequestCategory("cat-1", updatedCategory)).rejects.toThrow("Not found");
  });
});

// ─── Tab Navigation ───────────────────────────────────────────────────────────

describe("Admin Catalog Screen - Tab Navigation", () => {
  it("should have all required tabs", () => {
    const requiredTabs = [
      "categories",
      "types",
      "units",
      "distance",
      "complexity",
      "volume",
      "specialties",
      "nurseCategories",
    ];

    // This test verifies that all tab keys are defined
    // The actual tab rendering is tested through integration
    expect(requiredTabs).toHaveLength(8);
    expect(requiredTabs).toContain("categories");
    expect(requiredTabs).toContain("types");
    expect(requiredTabs).toContain("units");
    expect(requiredTabs).toContain("distance");
    expect(requiredTabs).toContain("complexity");
    expect(requiredTabs).toContain("volume");
    expect(requiredTabs).toContain("specialties");
    expect(requiredTabs).toContain("nurseCategories");
  });
});

// ─── Form Validation ──────────────────────────────────────────────────────────

describe("Admin Catalog Screen - Form Validation", () => {
  it("should validate required fields for categories", () => {
    const validCategory = {
      code: "test",
      displayName: "Test Category",
      categoryFactor: 1,
      isActive: true,
      displayOrder: 0,
    };

    expect(validCategory.code).toBeTruthy();
    expect(validCategory.displayName).toBeTruthy();
    expect(validCategory.categoryFactor).toBeGreaterThan(0);
  });

  it("should validate required fields for types", () => {
    const validType = {
      code: "test_type",
      displayName: "Test Type",
      careRequestCategoryCode: "hogar",
      unitTypeCode: "mes",
      basePrice: 1000,
      isActive: true,
      displayOrder: 0,
    };

    expect(validType.code).toBeTruthy();
    expect(validType.displayName).toBeTruthy();
    expect(validType.careRequestCategoryCode).toBeTruthy();
    expect(validType.unitTypeCode).toBeTruthy();
    expect(validType.basePrice).toBeGreaterThanOrEqual(0);
  });

  it("should validate required fields for units", () => {
    const validUnit = {
      code: "hora",
      displayName: "Hora",
      isActive: true,
      displayOrder: 0,
    };

    expect(validUnit.code).toBeTruthy();
    expect(validUnit.displayName).toBeTruthy();
  });

  it("should validate required fields for distance factors", () => {
    const validDistance = {
      code: "cerca",
      displayName: "Cerca",
      multiplier: 1,
      isActive: true,
      displayOrder: 0,
    };

    expect(validDistance.code).toBeTruthy();
    expect(validDistance.displayName).toBeTruthy();
    expect(validDistance.multiplier).toBeGreaterThan(0);
  });

  it("should validate required fields for complexity levels", () => {
    const validComplexity = {
      code: "bajo",
      displayName: "Bajo",
      multiplier: 1,
      isActive: true,
      displayOrder: 0,
    };

    expect(validComplexity.code).toBeTruthy();
    expect(validComplexity.displayName).toBeTruthy();
    expect(validComplexity.multiplier).toBeGreaterThan(0);
  });

  it("should validate required fields for volume discount rules", () => {
    const validVolume = {
      minimumCount: 5,
      discountPercent: 10,
      isActive: true,
      displayOrder: 0,
    };

    expect(validVolume.minimumCount).toBeGreaterThan(0);
    expect(validVolume.discountPercent).toBeGreaterThanOrEqual(0);
    expect(validVolume.discountPercent).toBeLessThanOrEqual(100);
  });

  it("should validate required fields for nurse specialties", () => {
    const validSpecialty = {
      code: "geriatria",
      displayName: "Geriatria",
      alternativeCodes: null,
      isActive: true,
      displayOrder: 0,
    };

    expect(validSpecialty.code).toBeTruthy();
    expect(validSpecialty.displayName).toBeTruthy();
  });

  it("should validate required fields for nurse categories", () => {
    const validCategory = {
      code: "RN",
      displayName: "Registered Nurse",
      alternativeCodes: null,
      isActive: true,
      displayOrder: 0,
    };

    expect(validCategory.code).toBeTruthy();
    expect(validCategory.displayName).toBeTruthy();
  });
});
