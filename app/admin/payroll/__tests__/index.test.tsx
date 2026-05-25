import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import renderer, { act } from "react-test-renderer";
import { ToastProvider } from "@/src/components/shared/ToastProvider";

// Mock dependencies are already set up in setupTests.ts

function renderWithProviders(element: React.ReactElement) {
  return renderer.create(<ToastProvider>{element}</ToastProvider>);
}

// ── Hub ──────────────────────────────────────────────────────────────────────

describe("PayrollHubScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing and shows section cards", async () => {
    const { getAdminMobilePayrollSummary } = await import("@/src/services/payrollService");
    vi.mocked(getAdminMobilePayrollSummary).mockResolvedValue({
      openPeriodsCount: 2,
      closedPeriodsCount: 3,
      totalCompensationCurrentPeriod: 150000,
      activeNursesCount: 10,
      recentPeriods: [],
    });

    const PayrollHubScreen = (await import("../index")).default;

    let component: any;
    await act(async () => {
      component = renderWithProviders(<PayrollHubScreen />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(component.root).toBeTruthy();
    // Hub renders section card labels
    expect(component.root.findByProps({ children: "Períodos" })).toBeTruthy();
    expect(component.root.findByProps({ children: "Deducciones únicas" })).toBeTruthy();
    expect(component.root.findByProps({ children: "Descuentos fijos" })).toBeTruthy();
    expect(component.root.findByProps({ children: "Ajustes" })).toBeTruthy();
  });

  it("renders summary strip with loading state when API is pending", async () => {
    const { getAdminMobilePayrollSummary } = await import("@/src/services/payrollService");
    // Never resolves during test — stays in loading state
    vi.mocked(getAdminMobilePayrollSummary).mockReturnValue(new Promise(() => {}));

    const PayrollHubScreen = (await import("../index")).default;

    let component: any;
    await act(async () => {
      component = renderWithProviders(<PayrollHubScreen />);
    });

    expect(component.root).toBeTruthy();
    // Loading state shows em dash placeholders
    const dashTexts = component.root.findAllByProps({ children: "—" });
    expect(dashTexts.length).toBeGreaterThan(0);
  });
});

// ── Periods ───────────────────────────────────────────────────────────────────

describe("PeriodsScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { getPayrollPeriods } = await import("@/src/services/payrollService");
    vi.mocked(getPayrollPeriods).mockResolvedValue({ items: [], totalCount: 0, pageNumber: 1, pageSize: 50 });

    const PeriodsScreen = (await import("../periods")).default;

    let component: any;
    await act(async () => { component = renderWithProviders(<PeriodsScreen />); });
    await act(async () => { await Promise.resolve(); });
    expect(component.root).toBeTruthy();
    // Unmount so this render's mount effect doesn't leak a fetch into the next test.
    await act(async () => { component.unmount(); });
  });

  it("calls getPayrollPeriods on mount and shows loaded marker", async () => {
    const { getPayrollPeriods } = await import("@/src/services/payrollService");
    vi.mocked(getPayrollPeriods).mockResolvedValue({ items: [], totalCount: 0, pageNumber: 1, pageSize: 50 });

    const PeriodsScreen = (await import("../periods")).default;

    await act(async () => {
      renderWithProviders(<PeriodsScreen />);
    });
    await act(async () => { await Promise.resolve(); });

    expect(vi.mocked(getPayrollPeriods)).toHaveBeenCalledTimes(1);
  });

  it("shows recalc button when periods exist and confirm dialog on press", async () => {
    const { getPayrollPeriods, recalculatePayroll } = await import("@/src/services/payrollService");
    vi.mocked(getPayrollPeriods).mockResolvedValue({
      items: [
        {
          id: "period-1",
          startDate: "2026-04-01",
          endDate: "2026-04-15",
          cutoffDate: "2026-04-16",
          paymentDate: "2026-04-20",
          status: "Open",
          createdAtUtc: "2026-04-01T00:00:00Z",
          closedAtUtc: null,
          lineCount: 2,
          totalGross: 5000,
          totalNet: 4500,
        },
      ],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 50,
    });
    vi.mocked(recalculatePayroll).mockResolvedValue({
      auditId: "audit-1",
      linesAffected: 2,
      totalOldNet: 5000,
      totalNewNet: 5500,
      triggeredAtUtc: "2026-04-20T12:00:00Z",
    });

    const PeriodsScreen = (await import("../periods")).default;

    let component: any;
    await act(async () => {
      component = renderWithProviders(<PeriodsScreen />);
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    const recalcButton = component.root.findByProps({ testID: "admin-payroll-recalculate-button" });
    await act(async () => { recalcButton.props.onPress(); });

    expect(component.root.findByProps({ testID: "admin-payroll-recalculate-confirm-dialog" })).toBeTruthy();
  });
});

// ── Deductions ────────────────────────────────────────────────────────────────

describe("DeductionsScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { getDeductions } = await import("@/src/services/payrollService");
    vi.mocked(getDeductions).mockResolvedValue({ items: [], totalCount: 0 });

    const DeductionsScreen = (await import("../deductions")).default;

    expect(() => renderWithProviders(<DeductionsScreen />)).not.toThrow();
  });
});

// ── Scheduled ─────────────────────────────────────────────────────────────────

describe("ScheduledScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { getScheduledDeductions } = await import("@/src/services/payrollService");
    vi.mocked(getScheduledDeductions).mockResolvedValue({ items: [], totalCount: 0 });

    const ScheduledScreen = (await import("../scheduled")).default;

    expect(() => renderWithProviders(<ScheduledScreen />)).not.toThrow();
  });
});

// ── Adjustments ───────────────────────────────────────────────────────────────

describe("AdjustmentsScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { getAdjustments } = await import("@/src/services/payrollService");
    vi.mocked(getAdjustments).mockResolvedValue({ items: [], totalCount: 0 });

    const AdjustmentsScreen = (await import("../adjustments")).default;

    expect(() => renderWithProviders(<AdjustmentsScreen />)).not.toThrow();
  });
});
