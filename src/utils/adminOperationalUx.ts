import type {
  AdminActionItemDto,
  AdminDashboardSnapshotDto,
  AdminNotificationDto,
} from "@/src/services/adminPortalService";
import { designTokens } from "@/src/design-system/tokens";
import { Platform } from "react-native";

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

export function resolveAdminOperationalDeepLink(path: string | null | undefined) {
  if (!path) {
    return "/admin";
  }

  if (path.includes("/admin/care-requests") && path.includes("selected=")) {
    const id = path.split("selected=")[1]?.split("&")[0];
    return id ? `/admin/care-requests/${id}` : "/admin/care-requests";
  }

  if (path.startsWith("/admin/care-requests/")) {
    const id = path.replace("/admin/care-requests/", "").split("?")[0];
    return `/admin/care-requests/${id}`;
  }

  if (path.startsWith("/admin/care-requests")) {
    return "/admin/care-requests";
  }

  if (path.startsWith("/care-requests/")) {
    const id = path.replace("/care-requests/", "").split("?")[0];
    return `/admin/care-requests/${id}`;
  }

  if (path.startsWith("/care-requests")) {
    return "/admin/care-requests";
  }

  if (path.startsWith("/admin/notifications")) {
    return "/admin/notifications";
  }

  if (path.startsWith("/admin/action-items")) {
    return "/admin/action-items";
  }

  if (path.startsWith("/admin/")) {
    return path;
  }

  return "/admin";
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
    helper: `${activeAlerts} alerta${activeAlerts === 1 ? "" : "s"} visibles · actualizado ${new Intl.DateTimeFormat("es-DO", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(snapshot.generatedAtUtc))}`,
    severity: overdue > 0 || snapshot.careRequestsWaitingForAssignmentCount > 0 ? "High" : "Low",
  } as const;
}

export function getAdminActionItemPrimaryLabel(item: AdminActionItemDto) {
  if (item.deepLinkPath.startsWith("/admin/care-requests")) return "Abrir solicitud";
  if (item.deepLinkPath.startsWith("/admin/nurse-profiles")) return "Abrir perfil";
  if (item.deepLinkPath.startsWith("/admin/users")) return "Abrir usuario";
  return "Abrir elemento";
}

export function getAdminActionItemStatusLabel(item: AdminActionItemDto) {
  const severity = getAdminSeverityPresentation(item.severity);
  return `${severity.label} · ${item.state === "Unread" ? "No leida" : "Pendiente"}`;
}

export function getNotificationPrimaryActionLabel(item: AdminNotificationDto) {
  if (item.deepLinkPath) {
    return item.requiresAction ? "Abrir tarea" : "Abrir contexto";
  }

  return item.readAtUtc ? "Marcar no leida" : "Marcar leida";
}

export function getNotificationSecondaryActionLabel(item: AdminNotificationDto) {
  return item.readAtUtc ? "Marcar como no leida" : "Marcar como leida";
}

export function getNotificationStatusLabel(item: AdminNotificationDto) {
  return `${item.readAtUtc ? "Leida" : "No leida"} · ${item.requiresAction ? "Accion requerida" : "Informativa"}`;
}
