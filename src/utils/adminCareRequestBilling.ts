import type { AdminCareRequestStatus } from "@/src/services/adminPortalService";
import { designTokens } from "@/src/design-system/tokens";

export type AdminCareRequestBillingAction = "invoice" | "pay" | "void" | "receipt" | "credit-note";
export type AdminCareRequestLifecycleAction = "assign" | "approve" | "reject" | "complete";

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
  "credit-note": {
    action: "credit-note",
    label: "Nota de crédito",
    description: "Registrar un reembolso o crédito contra el pago",
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
  if (status === "PaymentReported") return "Pago reportado";
  if (status === "Paid") return "Pagada";
  if (status === "Voided") return "Anulada";
  return status;
}

// UnitTypeCatalog seed codes -> Spanish display names (CatalogSeeding.cs).
const UNIT_TYPE_LABELS: Record<string, string> = {
  dia_completo: "Día completo",
  mes: "Mes",
  medio_dia: "Medio día",
  sesion: "Sesión",
};

/**
 * Spanish label for a care-request unit-type code. Matches the UnitTypeCatalog
 * seed exactly; falls back to a humanized form of the code so a catalog entry
 * added later still renders sensibly instead of showing the raw code.
 */
export function formatUnitType(unitType: string): string {
  const key = unitType?.trim().toLowerCase();
  if (!key) return "";
  return UNIT_TYPE_LABELS[key] ?? key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function getAdminCareRequestStatusColor(status: string): string {
  if (status === "Paid") return designTokens.color.status.successText;
  if (status === "PaymentReported") return designTokens.color.status.warningText;
  if (status === "Invoiced") return designTokens.color.status.warningText;
  if (status === "Voided") return designTokens.color.status.dangerText;
  if (status === "Completed") return designTokens.color.status.infoText;
  // .text (-800) not .color (-600): this renders as bold status TEXT on a white card,
  // so it must clear AA 4.5:1 (orange .color is only 3.56:1 on white).
  if (status === "Rejected" || status === "Cancelled") return designTokens.color.palette.orange.text;
  return designTokens.color.ink.secondary;
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

  if (status === "PaymentReported") {
    return [
      {
        ...billingActionMeta.pay,
        label: "Confirmar pago recibido",
        description: "Revisar el comprobante y confirmar la recepción del dinero",
        route: buildAdminCareRequestBillingRoute(id, "pay"),
      },
      {
        ...billingActionMeta.void,
        route: buildAdminCareRequestBillingRoute(id, "void"),
      },
    ];
  }

  if (status === "Paid") {
    // Void is blocked after Paid (collected revenue cannot silently disappear) — reversing a paid
    // request is done with a credit note / refund (T1.4), not a void.
    return [
      {
        ...billingActionMeta.receipt,
        route: buildAdminCareRequestBillingRoute(id, "receipt"),
      },
      {
        ...billingActionMeta["credit-note"],
        route: buildAdminCareRequestBillingRoute(id, "credit-note"),
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

// ─── Lifecycle (non-billing) action helpers ───────────────────────────────────

export interface LifecycleActionDefinition {
  action: AdminCareRequestLifecycleAction;
  label: string;
  /** Spanish guidance sentence shown in the ESTADO card. */
  guidanceText: string;
  variant: "primary" | "secondary" | "danger";
  /** True if the action requires an input (e.g. rejection reason). */
  requiresInput: boolean;
}

/**
 * Returns the ordered lifecycle action set for a given status + assignment state.
 * Billing actions (invoice / pay / void / receipt) are handled separately by getBillingTaskActions.
 *
 * Complete note: the backend auto-generates the invoice on complete, so the request
 * immediately transitions to Invoiced — not Completed. getBillingTaskActions handles Invoiced.
 */
export function getLifecycleActions(
  status: AdminCareRequestStatus,
  isAssigned: boolean,
): LifecycleActionDefinition[] {
  switch (status) {
    case "Pending":
      if (!isAssigned) {
        return [
          {
            action: "assign",
            label: "Asignar enfermera",
            guidanceText: "Asigna una enfermera para poder aprobar esta solicitud.",
            variant: "primary",
            requiresInput: false,
          },
          {
            action: "reject",
            label: "Rechazar",
            guidanceText: "Asigna una enfermera para poder aprobar esta solicitud.",
            variant: "danger",
            requiresInput: true,
          },
        ];
      }
      return [
        {
          action: "approve",
          label: "Aprobar",
          guidanceText: "Revisa y aprueba o rechaza la solicitud.",
          variant: "primary",
          requiresInput: false,
        },
        {
          action: "reject",
          label: "Rechazar",
          guidanceText: "Revisa y aprueba o rechaza la solicitud.",
          variant: "danger",
          requiresInput: true,
        },
      ];
    case "Approved":
      return [
        {
          action: "complete",
          label: "Marcar completada",
          guidanceText: "Marca el servicio como completado al terminar (se generará la factura).",
          variant: "primary",
          requiresInput: false,
        },
      ];
    default:
      return [];
  }
}

/**
 * Returns the "Próximo paso" guidance sentence for a given status + assignment state.
 * For billing statuses (Completed, Invoiced, PaymentReported, Paid), guidance is derived
 * from lifecycle — but those use billing actions handled by getBillingTaskActions.
 */
export function getLifecycleGuidance(
  status: AdminCareRequestStatus,
  isAssigned: boolean,
): string {
  switch (status) {
    case "Pending":
      return isAssigned
        ? "Revisa y aprueba o rechaza la solicitud."
        : "Asigna una enfermera para poder aprobar esta solicitud.";
    case "Approved":
      return "Marca el servicio como completado al terminar (se generará la factura).";
    case "Completed":
      return "Genera la factura para cobrar el servicio.";
    case "Invoiced":
      return "Registra el pago cuando el cliente pague.";
    case "PaymentReported":
      return "El cliente reportó un pago: verifícalo y confírmalo.";
    case "Paid":
      return "Servicio cobrado. Genera el comprobante.";
    case "Rejected":
    case "Cancelled":
    case "Voided":
      return "Sin acciones pendientes.";
    default:
      return "";
  }
}
