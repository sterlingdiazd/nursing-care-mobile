export interface CreateCareRequestDto {
  careRequestDescription: string;
  careRequestType: string;
  /**
   * Required when the caller is ADMIN — the user id of the client the request is FOR.
   * Ignored / can be omitted when the caller is a CLIENT creating their own request.
   */
  clientUserId?: string;
  unit?: number;
  suggestedNurse?: string;
  price?: number;
  clientBasePriceOverride?: number;
  distanceFactor?: string;
  complexityLevel?: string;
  medicalSuppliesCost?: number;
  careRequestDate?: string; // YYYY-MM-DD
}

export interface CareRequestDto {
  id: string;
  userID: string;
  careRequestDescription: string;
  careRequestType?: string;
  unit?: number;
  unitType?: string;
  price?: number;
  total?: number;
  distanceFactor?: string | null;
  complexityLevel?: string | null;
  clientBasePrice?: number | null;
  medicalSuppliesCost?: number | null;
  careRequestDate?: string | null;
  suggestedNurse?: string | null;
  assignedNurse?: string | null;
  status:
    | "Pending"
    | "Approved"
    | "Rejected"
    | "Completed"
    | "Cancelled"
    | "Invoiced"
    | "PaymentReported"
    | "Paid"
    | "Voided";
  invoiceNumber?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  approvedAtUtc: string | null;
  rejectedAtUtc: string | null;
  completedAtUtc: string | null;
  cancelledAtUtc: string | null;
  rejectionReason: string | null;
  // Pricing snapshot fields (populated after pricing calculation)
  // Source: Pipeline Layer 4.2 — CareRequestResponse from backend
  pricingCategoryCode?: string | null;
  categoryFactorSnapshot?: number | null;
  distanceFactorMultiplierSnapshot?: number | null;
  complexityMultiplierSnapshot?: number | null;
  volumeDiscountPercentSnapshot?: number | null;
  lineBeforeVolumeDiscount?: number | null;
  unitPriceAfterVolumeDiscount?: number | null;
  subtotalBeforeSupplies?: number | null;
  // Billing fields — owning client's own invoice/payment visibility only.
  // Nurse pay, cost, and margin internals are intentionally omitted.
  invoicedAtUtc?: string | null;
  paidAtUtc?: string | null;
  voidedAtUtc?: string | null;
  /**
   * Derived server-side from billing timestamps.
   * "Pendiente de factura" | "Facturado" | "Pagado" | "Anulado"
   */
  paymentStatus?: string | null;
}

export type CareRequestTransitionAction = "approve" | "reject" | "complete" | "cancel";
