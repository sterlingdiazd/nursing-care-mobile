import type { AdminCareRequestStatus } from "@/src/services/adminPortalService";
import { designTokens } from "@/src/design-system/tokens";

export type AdminCareRequestBillingAction = "invoice" | "pay" | "void" | "receipt";

export interface BillingTaskActionDefinition {
  action: AdminCareRequestBillingAction;
  label: string;
  description: string;
  route: string;
  variant: "primary" | "secondary" | "danger";
}

const billingActionMeta: Record<
  AdminCareRequestBillingAction,
  Omit<BillingTaskActionDefinition, "route">
> = {
  invoice: {
    action: "invoice",
    label: "Facturar",
    description: "Abrir tarea de facturación",
    variant: "primary",
  },
  pay: {
    action: "pay",
    label: "Registrar pago",
    description: "Capturar referencia bancaria",
    variant: "primary",
  },
  void: {
    action: "void",
    label: "Anular",
    description: "Registrar motivo de anulación",
    variant: "danger",
  },
  receipt: {
    action: "receipt",
    label: "Generar Recibo",
    description: "Generar comprobante de pago ",
    variant: "secondary",
  },
};

export function formatAdminCareRequestStatusLabel(status: string) {
  if (status === "Pending") return "Pendiente";
  if (status === "Approved") return "Aprobado";
  if (status === "Rejected") return "Rechazado";
  if (status === "Completed") return "Completado";
  if (status === "Cancelled") return "Cancelada";
  if (status === "Invoiced") return "Facturada";
  if (status === "Paid") return "Pagada";
  if (status === "Voided") return "Anulada";
  return status;
}

export function getAdminCareRequestStatusColor(status: string): string {
  if (status === "Paid") return designTokens.color.status.successText;
  if (status === "Invoiced") return designTokens.color.status.warningText;
  if (status === "Voided") return designTokens.color.status.dangerText;
  if (status === "Completed") return designTokens.color.status.infoText;
  if (status === "Rejected" || status === "Cancelled") return "#c2410c";
  return "#17465e";
}

export function buildAdminCareRequestBillingRoute(
  id: string,
  action: AdminCareRequestBillingAction,
) {
  return `/admin/care-requests/${id}/${action}` as const;
}

export function getBillingTaskActions(
  id: string,
  status: AdminCareRequestStatus,
): BillingTaskActionDefinition[] {
  if (status === "Completed") {
    return [
      {
        ...billingActionMeta.invoice,
        route: buildAdminCareRequestBillingRoute(id, "invoice"),
      },
    ];
  }

  if (status === "Invoiced") {
    return [
      {
        ...billingActionMeta.pay,
        route: buildAdminCareRequestBillingRoute(id, "pay"),
      },
      {
        ...billingActionMeta.void,
        route: buildAdminCareRequestBillingRoute(id, "void"),
      },
    ];
  }

  if (status === "Paid") {
    return [
      {
        ...billingActionMeta.receipt,
        route: buildAdminCareRequestBillingRoute(id, "receipt"),
      },
      {
        ...billingActionMeta.void,
        route: buildAdminCareRequestBillingRoute(id, "void"),
      },
    ];
  }

  return [];
}

export function isBillingTaskAllowed(
  status: AdminCareRequestStatus,
  action: AdminCareRequestBillingAction,
) {
  return getBillingTaskActions("route-check", status).some((item) => item.action === action);
}
