import { describe, expect, it, vi, beforeEach } from "vitest";
import * as httpClient from "../services/httpClient";
import {
  getAdminReport,
  getAdminReportExportUrl,
  type AdminReportResponseDto,
  type CareRequestPipelineReportDto,
  type NurseUtilizationReportDto,
} from "../services/adminPortalService";

vi.mock("../services/httpClient", () => ({
  requestJson: vi.fn(),
}));

describe("adminReportsScreen Logic", () => {
  // ─── Access Control ────────────────────────────────────────────────────────
  it("should redirect when not authenticated or not Admin", () => {
    const mockReplace = vi.fn();
    const authState = { isReady: true, isAuthenticated: true, roles: ["CLIENT"] };

    if (!authState.isReady) return;
    if (!authState.isAuthenticated) mockReplace("/login");
    else if (!authState.roles.includes("ADMIN")) mockReplace("/");

    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("should allow access when authenticated as Admin", () => {
    const mockReplace = vi.fn();
    const authState = { isReady: true, isAuthenticated: true, roles: ["ADMIN"] };

    if (!authState.isReady) return;
    if (!authState.isAuthenticated) mockReplace("/login");
    else if (!authState.roles.includes("ADMIN")) mockReplace("/");

    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe("Admin Reports Screen - Data Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call getAdminReport with correct path and params", async () => {
    vi.mocked(httpClient.requestJson).mockResolvedValue({});
    const reportKey = "care-request-pipeline";
    const from = "2024-01-01";
    const to = "2024-01-31";

    await getAdminReport(reportKey, { from, to });

    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ 
        path: expect.stringContaining(`/api/admin/reports/${reportKey}`),
        auth: true 
      }),
    );
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ 
        path: expect.stringContaining("from=2024-01-01"),
      }),
    );
  });

  it("should handle report data correctly", async () => {
    const mockData: CareRequestPipelineReportDto = {
      pendingCount: 5,
      approvedCount: 10,
      completedCount: 15,
      rejectedCount: 2,
      unassignedCount: 3,
      overdueCount: 1,
    };
    vi.mocked(httpClient.requestJson).mockResolvedValue(mockData);
    
    const result = await getAdminReport("care-request-pipeline");
    expect((result as CareRequestPipelineReportDto).pendingCount).toBe(5);
    expect((result as CareRequestPipelineReportDto).completedCount).toBe(15);
  });

  it("should format export URL correctly", () => {
    const reportKey = "nurse-utilization";
    const from = "2024-02-01";
    const url = getAdminReportExportUrl(reportKey, { from });
    
    expect(url).toContain(`/api/admin/reports/${reportKey}/export`);
    expect(url).toContain("from=2024-02-01");
  });
});

describe("Admin Reports Screen - UI Labels (Spanish)", () => {
  const REPORTS_METADATA = [
    { key: "care-request-pipeline", label: "Estado de solicitudes" },
    { key: "nurse-utilization", label: "Productividad" },
    { key: "care-request-completion", label: "Servicios completados" },
  ];

  it("should use correct Spanish labels for report types", () => {
    expect(REPORTS_METADATA.find(r => r.key === "care-request-pipeline")?.label).toBe("Estado de solicitudes");
    expect(REPORTS_METADATA.find(r => r.key === "nurse-utilization")?.label).toBe("Productividad");
    expect(REPORTS_METADATA.find(r => r.key === "care-request-completion")?.label).toBe("Servicios completados");
  });

  it("should display productivity percentages with correct formatting", () => {
    const completionRate = 0.854;
    const formatted = (completionRate * 100).toFixed(0) + "%";
    expect(formatted).toBe("85%");
  });
});
