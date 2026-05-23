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

  it("renders action filter chips", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminAuditLogsScreen />);
    });
    // "Todas" chip is always the first action filter chip
    expect(component!.root.findByProps({ testID: "admin-audit-logs-action-filter-" })).toBeTruthy();
  });

  it("renders audit logs list container", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminAuditLogsScreen />);
    });
    expect(component!.root.findByProps({ testID: "admin-audit-logs-list" })).toBeTruthy();
  });

  it("renders entity filter chips always visible", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminAuditLogsScreen />);
    });
    // "Todas" chip is the first entity filter chip
    expect(component!.root.findByProps({ testID: "admin-audit-logs-entity-filter-" })).toBeTruthy();
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

    // The whole row is the detail trigger now (no separate "Ver detalle" button).
    const row = component!.root.findByProps({ testID: "admin-audit-log-card-log-001" });
    await act(async () => { await row.props.onPress(); });

    expect(component!.root.findByProps({ testID: "admin-audit-log-detail-panel" })).toBeTruthy();
  });
});
