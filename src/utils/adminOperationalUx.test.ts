import { describe, expect, it } from "vitest";

import {
  buildAdminDashboardStatusSummary,
  buildAdminDashboardTriage,
  getAdminActionItemPrimaryLabel,
  getAdminActionItemStatusLabel,
  getAdminSeverityPresentation,
  getNotificationPrimaryActionLabel,
  getNotificationSecondaryActionLabel,
  getNotificationStatusLabel,
  resolveAdminOperationalDeepLink,
  sortAdminActionItems,
  sortAdminNotifications,
} from "@/src/utils/adminOperationalUx";

describe("resolveAdminOperationalDeepLink", () => {
  it("keeps admin care request detail navigation inside the admin route tree", () => {
    expect(resolveAdminOperationalDeepLink("/admin/care-requests/request-123")).toBe("/admin/care-requests/request-123");
  });

  it("translates selected-list deep links to an explicit admin detail route", () => {
    expect(resolveAdminOperationalDeepLink("/admin/care-requests?selected=request-456")).toBe("/admin/care-requests/request-456");
  });

  it("upgrades legacy client care request paths to admin routes", () => {
    expect(resolveAdminOperationalDeepLink("/care-requests/request-789")).toBe("/admin/care-requests/request-789");
  });

  it("falls back to the admin dashboard when the link is missing", () => {
    expect(resolveAdminOperationalDeepLink(null)).toBe("/admin");
  });
});

describe("admin severity presentation", () => {
  it("marks high severity work as urgent", () => {
    expect(getAdminSeverityPresentation("High")).toMatchObject({
      label: "Urgente",
      textColor: "#9f1239",
    });
  });
});

describe("sortAdminActionItems", () => {
  it("sorts urgent unread work ahead of lower-priority items", () => {
    const ordered = sortAdminActionItems([
      {
        id: "low",
        severity: "Low",
        state: "Pending",
        entityType: "SystemIssue",
        entityIdentifier: "SYS-3",
        summary: "Baja",
        requiredAction: "Revisar luego",
        assignedOwner: null,
        deepLinkPath: "/admin",
        detectedAtUtc: "2026-04-22T09:00:00Z",
      },
      {
        id: "high",
        severity: "High",
        state: "Unread",
        entityType: "CareRequest",
        entityIdentifier: "REQ-1",
        summary: "Alta",
        requiredAction: "Actuar ahora",
        assignedOwner: null,
        deepLinkPath: "/admin/care-requests/request-1",
        detectedAtUtc: "2026-04-22T10:00:00Z",
      },
    ]);

    expect(ordered[0]?.id).toBe("high");
  });
});

describe("sortAdminNotifications", () => {
  it("surfaces actionable high-severity unread notifications first", () => {
    const ordered = sortAdminNotifications([
      {
        id: "read-low",
        category: "General",
        severity: "Low",
        title: "Aviso",
        body: "Informacion",
        entityType: null,
        entityId: null,
        deepLinkPath: null,
        source: null,
        requiresAction: false,
        isDismissed: false,
        createdAtUtc: "2026-04-22T07:00:00Z",
        readAtUtc: "2026-04-22T07:10:00Z",
        archivedAtUtc: null,
        createdBySystem: true,
      },
      {
        id: "urgent-unread",
        category: "CareRequest",
        severity: "High",
        title: "Alerta",
        body: "Requiere accion",
        entityType: "CareRequest",
        entityId: "REQ-9",
        deepLinkPath: "/admin/care-requests/request-9",
        source: "Sistema",
        requiresAction: true,
        isDismissed: false,
        createdAtUtc: "2026-04-22T08:00:00Z",
        readAtUtc: null,
        archivedAtUtc: null,
        createdBySystem: true,
      },
    ]);

    expect(ordered[0]?.id).toBe("urgent-unread");
  });
});

describe("dashboard triage", () => {
  it("creates overdue and unassigned triage entries with routes", () => {
    const triage = buildAdminDashboardTriage({
      pendingNurseProfilesCount: 1,
      careRequestsWaitingForAssignmentCount: 3,
      careRequestsWaitingForApprovalCount: 2,
      careRequestsRejectedTodayCount: 0,
      approvedCareRequestsStillIncompleteCount: 1,
      overdueOrStaleRequestsCount: 4,
      activeNursesCount: 12,
      activeClientsCount: 18,
      unreadAdminNotificationsCount: 5,
      highSeverityAlerts: [],
      generatedAtUtc: "2026-04-22T08:00:00Z",
    });

    expect(triage).toHaveLength(3);
    expect(triage[0]).toMatchObject({
      key: "overdue",
      value: 4,
      route: "/admin/care-requests?view=overdue",
      severity: "High",
    });
    expect(triage[1]).toMatchObject({
      key: "unassigned",
      value: 3,
      route: "/admin/care-requests?view=unassigned",
    });
  });

  it("builds an operational status summary with alert count and timestamp", () => {
    const summary = buildAdminDashboardStatusSummary({
      pendingNurseProfilesCount: 1,
      careRequestsWaitingForAssignmentCount: 3,
      careRequestsWaitingForApprovalCount: 2,
      careRequestsRejectedTodayCount: 0,
      approvedCareRequestsStillIncompleteCount: 1,
      overdueOrStaleRequestsCount: 4,
      activeNursesCount: 12,
      activeClientsCount: 18,
      unreadAdminNotificationsCount: 5,
      highSeverityAlerts: [],
      generatedAtUtc: "2026-04-22T08:00:00Z",
    });

    expect(summary.label).toContain("4 solicitud");
    expect(summary.helper).toContain("alerta");
  });
});

describe("action item labels", () => {
  it("adapts the action label to the route target", () => {
    expect(
      getAdminActionItemPrimaryLabel({
        id: "item-1",
        severity: "High",
        state: "Unread",
        entityType: "CareRequest",
        entityIdentifier: "REQ-1",
        summary: "Solicitud",
        requiredAction: "Abrir",
        assignedOwner: null,
        deepLinkPath: "/admin/care-requests/request-1",
        detectedAtUtc: "2026-04-22T08:00:00Z",
      }),
    ).toBe("Abrir solicitud");
    expect(
      getAdminActionItemStatusLabel({
        id: "item-1",
        severity: "High",
        state: "Unread",
        entityType: "CareRequest",
        entityIdentifier: "REQ-1",
        summary: "Solicitud",
        requiredAction: "Abrir",
        assignedOwner: null,
        deepLinkPath: "/admin/care-requests/request-1",
        detectedAtUtc: "2026-04-22T08:00:00Z",
      }),
    ).toContain("Urgente");
  });
});

describe("notification labels", () => {
  it("promotes route-based work as the dominant next step", () => {
    expect(
      getNotificationPrimaryActionLabel({
        id: "notif-1",
        category: "CareRequest",
        severity: "High",
        title: "Abrir solicitud",
        body: "Necesita aprobacion",
        entityType: "CareRequest",
        entityId: "REQ-1",
        deepLinkPath: "/admin/care-requests/request-1",
        source: "Sistema",
        requiresAction: true,
        isDismissed: false,
        createdAtUtc: "2026-04-22T08:00:00Z",
        readAtUtc: null,
        archivedAtUtc: null,
        createdBySystem: true,
      }),
    ).toBe("Abrir tarea");
  });

  it("exposes a readable secondary action label and status text", () => {
    const item = {
      id: "notif-2",
      category: "General",
      severity: "Low",
      title: "Aviso",
      body: "Informacion",
      entityType: null,
      entityId: null,
      deepLinkPath: null,
      source: null,
      requiresAction: false,
      isDismissed: false,
      createdAtUtc: "2026-04-22T08:00:00Z",
      readAtUtc: null,
      archivedAtUtc: null,
      createdBySystem: true,
    } as const;

    expect(getNotificationSecondaryActionLabel(item)).toBe("Marcar como leida");
    expect(getNotificationStatusLabel(item)).toContain("No leida");
  });
});
