import type {
  AdminActionItemDto,
  AdminDashboardSnapshotDto,
  AdminNotificationDto,
} from "@/src/services/adminPortalService";
import { designTokens } from "@/src/design-system/tokens";
import { Platform } from "react-native";
import { formatDateTimeES } from "@/src/utils/spanishTextValidator";

type AdminSeverity = "High" | "Medium" | "Low";

const severityRank: Record<AdminSeverity, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

export function automationProps(testId: string) {
  return {
    testID: testId,
    nativeID: testId,
    ...(Platform.OS === "web"
      ? ({
          id: testId,
          "data-testid": testId,
        } as Record<string, string>)
      : {}),
  };
}

/** Returns the query suffix of a path (including the leading `?`), or "" if none. */
function queryOf(path: string) {
  const i = path.indexOf("?");
  return i >= 0 ? path.slice(i) : "";
}

export function resolveAdminOperationalDeepLink(path: string | null | undefined) {
  if (!path) {
    return "/admin";
  }

  if (path.includes("/admin/care-requests") && path.includes("selected=")) {
    const id = path.split("selected=")[1]?.split("&")[0];
    return id ? `/care-requests/${id}` : "/admin/care-requests";
  }

  if (path.startsWith("/admin/care-requests/")) {
    const id = path.replace("/admin/care-requests/", "").split("?")[0];
    return `/care-requests/${id}`;
  }

  // Care request collection — preserve any view filter (e.g. ?view=overdue from the
  // daily summary) so the list opens already focused on the relevant segment.
  if (path.startsWith("/admin/care-requests")) {
    return path;
  }

  if (path.startsWith("/care-requests/")) {
    const id = path.replace("/care-requests/", "").split("?")[0];
    return `/care-requests/${id}`;
  }

  if (path.startsWith("/care-requests")) {
    return `/admin/care-requests${queryOf(path)}`;
  }

  if (path.startsWith("/admin/notifications")) {
    return "/admin/notifications";
  }

  if (path.startsWith("/admin/action-items")) {
    return "/admin/action-items";
  }

  // System-error / alert notifications carry a correlation id; the diagnostics screen
  // is where backend health and correlation ids are surfaced. There is no /alerts route.
  if (path.startsWith("/admin/alerts") || path.startsWith("/alerts")) {
    return "/admin/diagnostics";
  }

  // Payroll period deep links open the periods screen focused on that period via
  // ?periodId=…; preserve the query whether or not the path carries the /admin prefix.
  if (path.startsWith("/admin/payroll/periods") || path.startsWith("/payroll/periods")) {
    return `/admin/payroll/periods${queryOf(path)}`;
  }

  if (path.startsWith("/payroll")) {
    return "/admin/payroll";
  }

  if (path.startsWith("/nurses") || path.startsWith("/nurse-profiles")) {
    return "/admin/nurse-profiles";
  }

  if (path.startsWith("/settings")) {
    return "/admin/settings";
  }

  if (path.startsWith("/admin/")) {
    return path;
  }

  return "/admin";
}

/**
 * Resolve a backend-emitted `deepLinkPath` to the correct Expo Router route
 * for the current user's roles.
 *
 * Admin users receive path aliases (e.g. `/payroll` → `/admin/payroll`) that
 * require translation via `resolveAdminOperationalDeepLink`. Non-admin users
 * (nurses, clients) are assumed to receive paths that are already valid Expo
 * Router routes — e.g. `/nurse/payroll` from `ConfirmNursePeriodPaymentHandler`
 * — and those pass through unchanged. If the backend emits an unrecognised path
 * for a non-admin user, Expo Router's `+not-found` screen handles it.
 */
export function resolveDeepLink(path: string, roles: string[]): string {
  return roles.includes("ADMIN") ? resolveAdminOperationalDeepLink(path) : path;
}

/**
 * Extract and resolve the navigation target from a raw Expo push notification
 * payload. Returns the resolved Expo Router path, or `null` if the payload
 * carries no `deepLinkPath` string.
 *
 * This is a pure function over plain objects (no Expo SDK types) so it can be
 * unit-tested without RN mocks alongside `resolveDeepLink` and
 * `resolveAdminOperationalDeepLink`.
 */
export function resolveNotificationNavTarget(
  rawPayload: Record<string, unknown>,
  roles: string[],
): string | null {
  const deepLinkPath =
    typeof rawPayload.deepLinkPath === "string" ? rawPayload.deepLinkPath : null;
  if (!deepLinkPath) return null;
  return resolveDeepLink(deepLinkPath, roles);
}

/**
 * Process a notification tap end-to-end: extract the deepLinkPath from the
 * raw push payload, resolve it for the user's role, and call `navigate` with
 * the result. If the payload carries no valid deepLinkPath, `navigate` is not
 * called.
 *
 * The `navigate` callback is injected so this function is unit-testable as a
 * pure handler without Expo SDK or React Router mocks. The hook uses
 * `router.push` as the callback.
 */
export function processNotificationTap(
  rawPayload: Record<string, unknown>,
  roles: string[],
  navigate: (path: string) => void,
): void {
  const navTarget = resolveNotificationNavTarget(rawPayload, roles);
  if (navTarget) navigate(navTarget);
}

export function getAdminSeverityPresentation(severity: AdminSeverity) {
  switch (severity) {
    case "High":
      return {
        label: "Urgente",
        backgroundColor: designTokens.color.status.dangerBg,
        textColor: designTokens.color.status.dangerText,
        borderColor: designTokens.color.border.danger,
      };
    case "Medium":
      return {
        label: "Pendiente",
        backgroundColor: designTokens.color.status.warningBg,
        textColor: designTokens.color.status.warningText,
        borderColor: designTokens.color.border.warning,
      };
    case "Low":
    default:
      return {
        label: "Informativo",
        backgroundColor: designTokens.color.status.infoBg,
        textColor: designTokens.color.status.infoText,
        borderColor: designTokens.color.border.accent,
      };
  }
}

export function sortAdminActionItems(items: AdminActionItemDto[]) {
  return [...items].sort((left, right) => {
    const severityDiff = severityRank[left.severity] - severityRank[right.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }

    if (left.state !== right.state) {
      return left.state === "Unread" ? -1 : 1;
    }

    return Date.parse(right.detectedAtUtc) - Date.parse(left.detectedAtUtc);
  });
}

export function sortAdminNotifications(items: AdminNotificationDto[]) {
  return [...items].sort((left, right) => {
    const severityDiff = severityRank[left.severity] - severityRank[right.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }

    if (left.requiresAction !== right.requiresAction) {
      return left.requiresAction ? -1 : 1;
    }

    if (Boolean(left.readAtUtc) !== Boolean(right.readAtUtc)) {
      return left.readAtUtc ? 1 : -1;
    }

    return Date.parse(right.createdAtUtc) - Date.parse(left.createdAtUtc);
  });
}

export function buildAdminDashboardTriage(snapshot: AdminDashboardSnapshotDto) {
  return [
    {
      key: "overdue",
      label: "Solicitudes vencidas",
      value: snapshot.overdueOrStaleRequestsCount,
      helper: "Requieren seguimiento inmediato",
      route: "/admin/care-requests?view=overdue",
      severity: snapshot.overdueOrStaleRequestsCount > 0 ? "High" : "Low",
    },
    {
      key: "unassigned",
      label: "Sin asignar",
      value: snapshot.careRequestsWaitingForAssignmentCount,
      helper: "Pacientes en espera de enfermera",
      route: "/admin/care-requests?view=unassigned",
      severity: snapshot.careRequestsWaitingForAssignmentCount > 0 ? "High" : "Medium",
    },
    {
      key: "approvals",
      label: "Pendientes de aprobacion",
      value: snapshot.careRequestsWaitingForApprovalCount,
      helper: "Necesitan decision administrativa",
      route: "/admin/care-requests?view=pending-approval",
      severity: snapshot.careRequestsWaitingForApprovalCount > 0 ? "Medium" : "Low",
    },
  ] as const;
}

export function buildAdminDashboardStatusSummary(snapshot: AdminDashboardSnapshotDto) {
  const activeAlerts = snapshot.highSeverityAlerts.length + snapshot.unreadAdminNotificationsCount;
  const overdue = snapshot.overdueOrStaleRequestsCount;

  return {
    label:
      overdue > 0
        ? `Hay ${overdue} solicitud${overdue === 1 ? "" : "es"} vencida${overdue === 1 ? "" : "s"}`
        : "Panel estable",
    helper: `${activeAlerts} alerta${activeAlerts === 1 ? "" : "s"} visibles · actualizado ${formatDateTimeES(snapshot.generatedAtUtc)}`,
    severity: overdue > 0 || snapshot.careRequestsWaitingForAssignmentCount > 0 ? "High" : "Low",
  } as const;
}

export function getAdminActionItemPrimaryLabel(item: AdminActionItemDto) {
  // A path that includes `selected=<id>` or ends in a literal id segment drills
  // into a single record; the bare collection path opens the list.
  const path = item.deepLinkPath;
  const targetsSingleRecord =
    /\/[a-f0-9-]{8,}/i.test(path) || /[?&]selected=/.test(path);

  if (path.startsWith("/admin/care-requests")) {
    return targetsSingleRecord ? "Abrir solicitud" : "Ver solicitudes";
  }
  if (path.startsWith("/admin/nurse-profiles")) {
    return targetsSingleRecord ? "Abrir perfil" : "Ver perfiles";
  }
  if (path.startsWith("/admin/users")) {
    return targetsSingleRecord ? "Abrir usuario" : "Ver usuarios";
  }
  return targetsSingleRecord ? "Abrir elemento" : "Ver lista";
}

export function getAdminActionItemStatusLabel(item: AdminActionItemDto) {
  const severity = getAdminSeverityPresentation(item.severity);
  return `${severity.label} · ${item.state === "Unread" ? "No leída" : "Pendiente"}`;
}

export function getNotificationPrimaryActionLabel(item: AdminNotificationDto) {
  if (item.deepLinkPath) {
    return item.requiresAction ? "Abrir tarea" : "Abrir contexto";
  }

  return item.readAtUtc ? "Marcar no leída" : "Marcar leída";
}

export function getNotificationSecondaryActionLabel(item: AdminNotificationDto) {
  return item.readAtUtc ? "Marcar como no leída" : "Marcar como leída";
}

export function getNotificationStatusLabel(item: AdminNotificationDto) {
  return `${item.readAtUtc ? "Leída" : "No leída"} · ${item.requiresAction ? "Acción requerida" : "Informativa"}`;
}
