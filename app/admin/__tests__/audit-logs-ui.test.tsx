import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import renderer, { act } from "react-test-renderer";
import AdminAuditLogsScreen from "../audit-logs";

vi.mock("@/src/services/adminPortalService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/services/adminPortalService")>()),
  searchAuditLogs: vi.fn().mockResolvedValue({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }),
  getAuditLogDetail: vi.fn().mockResolvedValue({}),
}));

describe("AdminAuditLogsScreen", () => {
  const flushEffects = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing initially", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminAuditLogsScreen />);
    });
    expect(component!.root).toBeTruthy();
  });

  it("renders screen testID", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminAuditLogsScreen />);
    });
    expect(component!.root.findByProps({ testID: "admin-audit-logs-screen" })).toBeTruthy();
  });

  it("renders filter toggle and refresh buttons", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminAuditLogsScreen />);
    });
    expect(component!.root.findByProps({ testID: "admin-audit-logs-filter-toggle" })).toBeTruthy();
    expect(component!.root.findByProps({ testID: "admin-audit-logs-refresh-btn" })).toBeTruthy();
  });

  it("renders audit logs list container", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminAuditLogsScreen />);
    });
    expect(component!.root.findByProps({ testID: "admin-audit-logs-list" })).toBeTruthy();
  });

  it("shows filter inputs when filter toggle pressed", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminAuditLogsScreen />);
    });

    const toggle = component!.root.findByProps({ testID: "admin-audit-logs-filter-toggle" });
    act(() => { toggle.props.onPress(); });

    expect(component!.root.findByProps({ testID: "admin-audit-logs-action-input" })).toBeTruthy();
    expect(component!.root.findByProps({ testID: "admin-audit-logs-entity-type-input" })).toBeTruthy();
    expect(component!.root.findByProps({ testID: "admin-audit-logs-search-btn" })).toBeTruthy();
    expect(component!.root.findByProps({ testID: "admin-audit-logs-clear-btn" })).toBeTruthy();
  });

  it("renders error banner when API fails", async () => {
    const { searchAuditLogs } = await import("@/src/services/adminPortalService");
    vi.mocked(searchAuditLogs).mockRejectedValueOnce(new Error("Error de red"));

    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminAuditLogsScreen />);
    });
    await flushEffects();
    expect(component!.root.findByProps({ testID: "admin-audit-logs-error" })).toBeTruthy();
  });

  it("renders log cards when data is loaded", async () => {
    const { searchAuditLogs } = await import("@/src/services/adminPortalService");
    vi.mocked(searchAuditLogs).mockResolvedValueOnce({
      items: [
        {
          id: "log-001",
          actorUserId: "admin-001",
          createdAtUtc: "2026-04-20T10:00:00Z",
          actorName: "Admin User",
          actorRole: "ADMIN",
          action: "AdminAccountCreated",
          entityType: "User",
          entityId: "user-123456789012345678901234",
          notes: null,
        },
      ],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 20,
    });

    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminAuditLogsScreen />);
    });
    await flushEffects();
    expect(component!.root.findByProps({ testID: "admin-audit-log-card-log-001" })).toBeTruthy();
  });

  it("renders detail panel when detail button pressed", async () => {
    const { searchAuditLogs, getAuditLogDetail } = await import("@/src/services/adminPortalService");
    vi.mocked(searchAuditLogs).mockResolvedValueOnce({
      items: [
        {
          id: "log-001",
          actorUserId: "admin-001",
          createdAtUtc: "2026-04-20T10:00:00Z",
          actorName: "Admin User",
          actorRole: "ADMIN",
          action: "AdminAccountCreated",
          entityType: "User",
          entityId: "user-123456789012345678901234",
          notes: null,
        },
      ],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 20,
    });
    vi.mocked(getAuditLogDetail).mockResolvedValueOnce({
      id: "log-001",
      actorUserId: "admin-001",
      createdAtUtc: "2026-04-20T10:00:00Z",
      actorName: "Admin User",
      actorEmail: "admin@test.com",
      actorRole: "ADMIN",
      action: "AdminAccountCreated",
      entityType: "User",
      entityId: "user-123456789012345678901234",
      notes: null,
      metadataJson: null,
    });

    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminAuditLogsScreen />);
    });
    await flushEffects();

    const detailBtn = component!.root.findByProps({ testID: "admin-audit-log-detail-btn-log-001" });
    await act(async () => { await detailBtn.props.onPress(); });

    expect(component!.root.findByProps({ testID: "admin-audit-log-detail-panel" })).toBeTruthy();
  });
});
