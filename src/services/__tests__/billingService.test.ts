import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the httpClient module
vi.mock("@/src/services/httpClient", () => ({
  requestJson: vi.fn(),
}));

describe("Billing service functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("invoiceCareRequest", () => {
    it("calls the correct endpoint with invoice number", async () => {
      const { requestJson } = await import("@/src/services/httpClient");
      const { invoiceCareRequest } = await import("@/src/services/adminPortalService");

      const mockResponse = {
        id: "abc-123",
        invoiceNumber: "FAC-2024-001",
        invoicedAtUtc: "2024-01-15T10:00:00Z",
        totalAmount: 5000,
      };
      vi.mocked(requestJson).mockResolvedValue(mockResponse);

      const result = await invoiceCareRequest("abc-123", "FAC-2024-001");

      expect(requestJson).toHaveBeenCalledWith({
        path: "/api/admin/care-requests/abc-123/invoice",
        method: "POST",
        body: { invoiceNumber: "FAC-2024-001" },
        auth: true,
      });
      expect(result).toEqual(mockResponse);
    });

    it("propagates errors from the API", async () => {
      const { requestJson } = await import("@/src/services/httpClient");
      const { invoiceCareRequest } = await import("@/src/services/adminPortalService");

      vi.mocked(requestJson).mockRejectedValue(new Error("Network error"));

      await expect(invoiceCareRequest("abc-123", "FAC-001")).rejects.toThrow("Network error");
    });
  });

  describe("payCareRequest", () => {
    it("calls the correct endpoint with bank reference", async () => {
      const { requestJson } = await import("@/src/services/httpClient");
      const { payCareRequest } = await import("@/src/services/adminPortalService");

      const mockResponse = {
        id: "abc-123",
        paidAtUtc: "2024-01-20T14:00:00Z",
        totalAmount: 5000,
      };
      vi.mocked(requestJson).mockResolvedValue(mockResponse);

      const result = await payCareRequest("abc-123", "REF-789");

      expect(requestJson).toHaveBeenCalledWith({
        path: "/api/admin/care-requests/abc-123/pay",
        method: "POST",
        body: { bankReference: "REF-789" },
        auth: true,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("voidCareRequest", () => {
    it("calls the correct endpoint with void reason", async () => {
      const { requestJson } = await import("@/src/services/httpClient");
      const { voidCareRequest } = await import("@/src/services/adminPortalService");

      const mockResponse = {
        id: "abc-123",
        voidedAtUtc: "2024-01-21T09:00:00Z",
        voidReason: "Cliente solicitó cancelación",
      };
      vi.mocked(requestJson).mockResolvedValue(mockResponse);

      const result = await voidCareRequest("abc-123", "Cliente solicitó cancelación");

      expect(requestJson).toHaveBeenCalledWith({
        path: "/api/admin/care-requests/abc-123/void",
        method: "POST",
        body: { voidReason: "Cliente solicitó cancelación" },
        auth: true,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("generateReceipt", () => {
    it("calls the correct endpoint with no body", async () => {
      const { requestJson } = await import("@/src/services/httpClient");
      const { generateReceipt } = await import("@/src/services/adminPortalService");

      const mockResponse = {
        receiptId: "rcpt-456",
        receiptNumber: "REC-2024-001",
      };
      vi.mocked(requestJson).mockResolvedValue(mockResponse);

      const result = await generateReceipt("abc-123");

      expect(requestJson).toHaveBeenCalledWith({
        path: "/api/admin/care-requests/abc-123/receipt",
        method: "POST",
        auth: true,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getReceipt", () => {
    it("returns receipt data on success", async () => {
      const { requestJson } = await import("@/src/services/httpClient");
      const { getReceipt } = await import("@/src/services/adminPortalService");

      const mockResponse = {
        receiptId: "rcpt-456",
        receiptNumber: "REC-2024-001",
        generatedAtUtc: "2024-01-22T10:00:00Z",
      };
      vi.mocked(requestJson).mockResolvedValue(mockResponse);

      const result = await getReceipt("abc-123");

      expect(requestJson).toHaveBeenCalledWith({
        path: "/api/admin/care-requests/abc-123/receipt",
        method: "GET",
        auth: true,
      });
      expect(result).toEqual(mockResponse);
    });

    it("returns null when API returns 404", async () => {
      const { requestJson } = await import("@/src/services/httpClient");
      const { getReceipt } = await import("@/src/services/adminPortalService");

      vi.mocked(requestJson).mockRejectedValue(new Error("404 Not Found"));

      const result = await getReceipt("abc-123");

      expect(result).toBeNull();
    });

    it("re-throws non-404 errors", async () => {
      const { requestJson } = await import("@/src/services/httpClient");
      const { getReceipt } = await import("@/src/services/adminPortalService");

      vi.mocked(requestJson).mockRejectedValue(new Error("500 Internal Server Error"));

      await expect(getReceipt("abc-123")).rejects.toThrow("500 Internal Server Error");
    });
  });
});
