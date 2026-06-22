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
  resolveDeepLink,
  resolveNotificationNavTarget,
  sortAdminActionItems,
  sortAdminNotifications,
} from "@/src/utils/adminOperationalUx";

describe("resolveAdminOperationalDeepLink", () => {
  it("routes admin care request detail to the unified care-requests route", () => {
    expect(resolveAdminOperationalDeepLink("/admin/care-requests/request-123")).toBe("/care-requests/request-123");
  });

  it("translates selected-list deep links to an explicit detail route", () => {
    expect(resolveAdminOperationalDeepLink("/admin/care-requests?selected=request-456")).toBe("/care-requests/request-456");
  });

  it("normalizes care request detail paths to the unified care-requests route", () => {
    expect(resolveAdminOperationalDeepLink("/care-requests/request-789")).toBe("/care-requests/request-789");
  });

  it("routes a specific nurse profile deep link to its detail screen, not the list", () => {
    expect(resolveAdminOperationalDeepLink("/admin/nurse-profiles/nurse-123")).toBe(
      "/admin/nurse-profiles/nurse-123",
    );
  });

  it("opens the periods screen focused on a specific payroll period, not the payroll hub", () => {
    expect(resolveAdminOperationalDeepLink("/admin/payroll/periods?periodId=period-7")).toBe(
      "/admin/payroll/periods?periodId=period-7",
    );
  });

  it("normalizes a non-admin payroll period path and preserves the periodId", () => {
    expect(resolveAdminOperationalDeepLink("/payroll/periods?periodId=period-7")).toBe(
      "/admin/payroll/periods?periodId=period-7",
    );
  });

  it("still routes the bare payroll path to the payroll hub", () => {
    expect(resolveAdminOperationalDeepLink("/payroll")).toBe("/admin/payroll");
  });

  it("preserves the care-request list view filter (e.g. overdue daily summary)", () => {
    expect(resolveAdminOperationalDeepLink("/admin/care-requests?view=overdue")).toBe(
      "/admin/care-requests?view=overdue",
    );
  });

  it("routes system-error alerts to the diagnostics screen (no standalone /alerts route)", () => {
    expect(resolveAdminOperationalDeepLink("/admin/alerts")).toBe("/admin/diagnostics");
  });

  it("falls back to the admin dashboard when the link is missing", () => {
    expect(resolveAdminOperationalDeepLink(null)).toBe("/admin");
  });

  it("maps every real backend-emitted path prefix to a real route (not the /admin fallback)", () => {
    const backendEmittedPaths = [
      "/care-requests",
      "/care-requests/abc",
      "/nurses",
      "/nurse-profiles",
      "/payroll",
      "/payroll/periods?periodId=abc",
      "/settings",
      "/admin/alerts",
      "/admin/payroll/periods?periodId=abc",
      "/admin/care-requests",
      "/admin/care-requests?view=overdue",
      "/admin/care-requests/abc",
      "/admin/care-requests?selected=abc",
      "/admin/nurse-profiles",
      "/admin/nurse-profiles/abc",
      "/admin/nurse-profiles?view=pending&userId=abc",
      "/admin/clients/abc",
      "/admin/users/abc",
      "/admin/catalog",
      "/admin/notifications",
      "/admin/action-items",
    ];

    for (const path of backendEmittedPaths) {
      const resolved = resolveAdminOperationalDeepLink(path);
      expect(resolved, `path "${path}" must resolve to a real route, not the /admin fallback`).not.toBe("/admin");
      expect(resolved, `path "${path}" must resolve to a path starting with /`).toMatch(/^\//);
    }
  });
});

describe("admin severity presentation", () => {
  it("marks high severity work as urgent", () => {
    expect(getAdminSeverityPresentation("High")).toMatchObject({
      label: "Urgente",
      textColor: "#B91C1C",
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
      pendingDashboardTasksCount: 14,
      completedDashboardTasksTodayCount: 6,
      totalDashboardTasksTodayCount: 20,
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
      pendingDashboardTasksCount: 14,
      completedDashboardTasksTodayCount: 6,
      totalDashboardTasksTodayCount: 20,
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
        deepLinkPath: "/admin/care-requests/3fa85f64-5717-4562-b3fc-2c963f66afa6",
        detectedAtUtc: "2026-04-22T08:00:00Z",
      }),
    ).toBe("Abrir solicitud");
    expect(
      getAdminActionItemPrimaryLabel({
        id: "item-2",
        severity: "High",
        state: "Unread",
        entityType: "CareRequest",
        entityIdentifier: "REQ-2",
        summary: "Solicitudes",
        requiredAction: "Revisar",
        assignedOwner: null,
        deepLinkPath: "/admin/care-requests?view=overdue",
        detectedAtUtc: "2026-04-22T08:00:00Z",
      }),
    ).toBe("Ver solicitudes");
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
        deepLinkPath: "/admin/care-requests/3fa85f64-5717-4562-b3fc-2c963f66afa6",
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

    expect(getNotificationSecondaryActionLabel(item)).toBe("Marcar como leída");
    expect(getNotificationStatusLabel(item)).toContain("No leída");
  });
});

describe("resolveDeepLink", () => {
  it("applies the admin alias resolver for ADMIN-role users", () => {
    // /payroll is a backend alias that must become /admin/payroll for admins
    expect(resolveDeepLink("/payroll", ["ADMIN"])).toBe("/admin/payroll");
  });

  it("passes through the raw path unchanged for non-admin users", () => {
    // Backend emits /nurse/payroll directly to nurse-role users
    // (e.g. ConfirmNursePeriodPaymentHandler); no alias resolution needed
    expect(resolveDeepLink("/nurse/payroll", ["NURSE"])).toBe("/nurse/payroll");
  });

  it("passes through the raw path unchanged when roles is empty", () => {
    // Guards against routing an unauthenticated or role-less user to /admin
    expect(resolveDeepLink("/nurse/payroll", [])).toBe("/nurse/payroll");
  });

  it("the admin resolver is NOT applied to non-admin users even when the path looks admin-like", () => {
    // A non-admin user receiving /admin/something must NOT go through the
    // resolver (which would return it unchanged via the /admin/* passthrough),
    // but must also NOT be incorrectly gated — the raw path is used and Expo
    // Router's own auth guards handle role enforcement on the target screen.
    expect(resolveDeepLink("/admin/care-requests", ["NURSE"])).toBe(
      "/admin/care-requests",
    );
  });

  it("a non-admin user receiving an admin alias path is NOT elevated to the resolved admin route", () => {
    // /payroll is an admin alias (→ /admin/payroll for admins). A NURSE with
    // this path must receive /payroll unchanged — not the admin destination.
    // This test fails if the roles.includes("ADMIN") gate is removed.
    expect(resolveDeepLink("/payroll", ["NURSE"])).toBe("/payroll");
  });
});

describe("resolveNotificationNavTarget", () => {
  it("returns null for a payload with no deepLinkPath field", () => {
    expect(resolveNotificationNavTarget({}, ["ADMIN"])).toBeNull();
  });

  it("returns null for a non-string deepLinkPath (guards against malformed payloads)", () => {
    expect(resolveNotificationNavTarget({ deepLinkPath: 42 }, ["ADMIN"])).toBeNull();
    expect(resolveNotificationNavTarget({ deepLinkPath: null }, ["ADMIN"])).toBeNull();
  });

  it("applies alias resolution end-to-end for admin users", () => {
    // Verifies the full pipeline: payload extraction → resolveDeepLink → admin alias
    // This test fails if the call to resolveDeepLink is bypassed in this function.
    expect(resolveNotificationNavTarget({ deepLinkPath: "/payroll" }, ["ADMIN"])).toBe(
      "/admin/payroll",
    );
  });

  it("passes the path through unchanged for non-admin users (role gate enforced end-to-end)", () => {
    // /payroll would resolve to /admin/payroll for admins; a NURSE must get the raw path.
    // This test fails if the role gate inside resolveDeepLink is removed.
    expect(resolveNotificationNavTarget({ deepLinkPath: "/payroll" }, ["NURSE"])).toBe(
      "/payroll",
    );
  });

  it("passes a nurse-specific path through unchanged", () => {
    expect(resolveNotificationNavTarget({ deepLinkPath: "/nurse/payroll" }, ["NURSE"])).toBe(
      "/nurse/payroll",
    );
  });

  it("returns null for empty-string deepLinkPath", () => {
    // resolveAdminOperationalDeepLink guards on !path; empty string is falsy.
    expect(resolveNotificationNavTarget({ deepLinkPath: "" }, ["ADMIN"])).toBeNull();
  });
});
