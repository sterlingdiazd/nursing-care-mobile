import { describe, expect, it } from "vitest";

import { adminTestIds } from "@/src/testing/testIds/adminTestIds";
import {
  buildAdminCareRequestBillingRoute,
  formatAdminCareRequestStatusLabel,
  getAdminCareRequestStatusColor,
  getBillingTaskActions,
  isBillingTaskAllowed,
} from "@/src/utils/adminCareRequestBilling";

describe("admin care request billing labels", () => {
  it('returns "Facturada" for Invoiced', () => {
    expect(formatAdminCareRequestStatusLabel("Invoiced")).toBe("Facturada");
  });

  it('returns "Pagada" for Paid', () => {
    expect(formatAdminCareRequestStatusLabel("Paid")).toBe("Pagada");
  });

  it('returns "Anulada" for Voided', () => {
    expect(formatAdminCareRequestStatusLabel("Voided")).toBe("Anulada");
  });

  it("returns the original string for unknown statuses", () => {
    expect(formatAdminCareRequestStatusLabel("UnknownState")).toBe("UnknownState");
  });
});

describe("admin care request billing colors", () => {
  it("returns green for Paid", () => {
    expect(getAdminCareRequestStatusColor("Paid")).toBe("#15803D");
  });

  it("returns gold for Invoiced", () => {
    expect(getAdminCareRequestStatusColor("Invoiced")).toBe("#B45309");
  });

  it("returns rose for Voided", () => {
    expect(getAdminCareRequestStatusColor("Voided")).toBe("#B91C1C");
  });

  // Guards the AA-text class of bug: every status color renders as bold status text on a
  // white card, so each must clear WCAG AA 4.5:1 on white. A token migration once silently
  // swapped Rejected/Cancelled to a -600 hue at 3.56:1; this would have caught it.
  it("every status color (incl. default) clears AA 4.5:1 as text on white", () => {
    const luminance = (hex: string): number => {
      const n = parseInt(hex.slice(1), 16);
      const chan = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
    };
    const ratioOnWhite = (hex: string): number => (1.0 + 0.05) / (luminance(hex) + 0.05);
    const statuses = [
      "Paid", "PaymentReported", "Invoiced", "Voided", "Completed", "Rejected", "Cancelled", "SomethingUnknown",
    ];
    for (const status of statuses) {
      const color = getAdminCareRequestStatusColor(status);
      expect(ratioOnWhite(color), `${status} -> ${color}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("route-first billing task contract", () => {
  it("builds dedicated routes for each billing task", () => {
    expect(buildAdminCareRequestBillingRoute("req-123", "invoice")).toBe("/admin/care-requests/req-123/invoice");
    expect(buildAdminCareRequestBillingRoute("req-123", "pay")).toBe("/admin/care-requests/req-123/pay");
    expect(buildAdminCareRequestBillingRoute("req-123", "void")).toBe("/admin/care-requests/req-123/void");
    expect(buildAdminCareRequestBillingRoute("req-123", "receipt")).toBe("/admin/care-requests/req-123/receipt");
  });

  it("exposes invoice as the only task for completed requests", () => {
    const actions = getBillingTaskActions("req-123", "Completed");

    expect(actions).toEqual([
      expect.objectContaining({
        action: "invoice",
        route: "/admin/care-requests/req-123/invoice",
      }),
    ]);
  });

  it("exposes pay and void as tasks for invoiced requests", () => {
    const actions = getBillingTaskActions("req-123", "Invoiced");

    expect(actions).toHaveLength(2);
    expect(actions.map((action) => action.action)).toEqual(["pay", "void"]);
    expect(actions.map((action) => action.route)).toEqual([
      "/admin/care-requests/req-123/pay",
      "/admin/care-requests/req-123/void",
    ]);
  });

  it("exposes confirm-pay and void for payment-reported requests", () => {
    const actions = getBillingTaskActions("req-123", "PaymentReported");

    expect(actions.map((action) => action.action)).toEqual(["pay", "void"]);
    expect(actions[0].label).toBe("Confirmar pago recibido");
    expect(actions[0].route).toBe("/admin/care-requests/req-123/pay");
    expect(isBillingTaskAllowed("PaymentReported", "pay")).toBe(true);
  });

  it("exposes receipt and void as tasks for paid requests", () => {
    const actions = getBillingTaskActions("req-123", "Paid");

    expect(actions).toHaveLength(2);
    expect(actions.map((action) => action.action)).toEqual(["receipt", "void"]);
    expect(actions.map((action) => action.route)).toEqual([
      "/admin/care-requests/req-123/receipt",
      "/admin/care-requests/req-123/void",
    ]);
  });

  it("does not expose billing task routes for unsupported statuses", () => {
    expect(getBillingTaskActions("req-123", "Approved")).toEqual([]);
    expect(isBillingTaskAllowed("Approved", "invoice")).toBe(false);
  });
});

describe("billing route test selectors", () => {
  it("defines stable screen and action IDs for dedicated billing routes", () => {
    expect(adminTestIds.careRequests.billingRoutes.successBanner).toBe("admin-care-billing-success-banner");
    expect(adminTestIds.careRequests.billingRoutes.invoiceScreen).toBe("admin-care-request-invoice-screen");
    expect(adminTestIds.careRequests.billingRoutes.payScreen).toBe("admin-care-request-pay-screen");
    expect(adminTestIds.careRequests.billingRoutes.voidScreen).toBe("admin-care-request-void-screen");
    expect(adminTestIds.careRequests.billingRoutes.receiptScreen).toBe("admin-care-request-receipt-screen");
    expect(adminTestIds.careRequests.detail.invoiceButton).toBe("invoice-care-request-button");
    expect(adminTestIds.careRequests.detail.payButton).toBe("pay-care-request-button");
    expect(adminTestIds.careRequests.detail.voidButton).toBe("void-care-request-button");
    expect(adminTestIds.careRequests.detail.receiptButton).toBe("generate-receipt-button");
  });
});
