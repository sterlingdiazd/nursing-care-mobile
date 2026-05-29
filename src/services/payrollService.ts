import { requestList } from "@/src/services/apiShape";
import { requestJson, requestVoid } from "@/src/services/httpClient";
import { API_BASE_URL } from "@/src/config/api";
import type {
  NursePayrollSummaryDto,
  PayrollPeriodListItemDto,
  NursePayrollPeriodDetailDto,
  AdminMobilePayrollSummaryDto,
  RecentPeriod,
  AdminPayrollPeriodListItem,
  AdminPayrollPeriodListResult,
  AdminPayrollLineItem,
  AdminPayrollStaffSummary,
  AdminPayrollPeriodDetail,
  CreatePayrollPeriodRequest,
  PeriodCloseWarnings,
  AdminDeductionListItem,
  AdminDeductionListResult,
  CreateDeductionRequest,
  UpdateDeductionRequest,
  AdminCompensationAdjustmentListItem,
  AdminCompensationAdjustmentListResult,
  CreateCompensationAdjustmentRequest,
  RecalculatePayrollRequest,
  RecalculatePayrollResult,
  ScheduledDeductionListResult,
  ScheduledDeductionDetail,
  CreateScheduledDeductionRequest,
  RescheduleScheduledDeductionRequest,
  ConfirmNursePaymentResult,
  DeliverPeriodVouchersResult,
  NursePaymentStateResult,
} from "./payrollTypes";

export async function getNursePayrollSummary(_userId: string): Promise<NursePayrollSummaryDto> {
  return requestJson<NursePayrollSummaryDto>({
    path: "/api/nurse/payroll/summary",
    method: "GET",
    auth: true,
  });
}

export async function getNursePayrollHistory(_userId: string): Promise<PayrollPeriodListItemDto[]> {
  return requestList<PayrollPeriodListItemDto>({
    path: "/api/nurse/payroll/history",
    method: "GET",
    auth: true,
  });
}

export async function getNursePayrollPeriodDetail(periodId: string): Promise<NursePayrollPeriodDetailDto> {
  return requestJson<NursePayrollPeriodDetailDto>({
    path: `/api/nurse/payroll/periods/${periodId}`,
    method: "GET",
    auth: true,
  });
}

export function getNursePayrollVoucherUrl(periodId: string): string {
  return `${API_BASE_URL}/api/nurse/payroll/periods/${periodId}/voucher`;
}

export async function getAdminMobilePayrollSummary(): Promise<AdminMobilePayrollSummaryDto> {
  return requestJson<AdminMobilePayrollSummaryDto>({
    path: "/api/admin/payroll/mobile-summary",
    method: "GET",
    auth: true,
  });
}

export async function getPayrollPeriods(options?: {
  pageNumber?: number;
  pageSize?: number;
  status?: string | null;
}): Promise<AdminPayrollPeriodListResult> {
  const params = new URLSearchParams();
  if (options?.pageNumber) params.set("pageNumber", String(options.pageNumber));
  if (options?.pageSize) params.set("pageSize", String(options.pageSize));
  if (options?.status) params.set("status", options.status);
  
  const queryString = params.toString();
  const path = `/api/admin/payroll/periods${queryString ? `?${queryString}` : ""}`;
  
  return requestJson<AdminPayrollPeriodListResult>({
    path,
    method: "GET",
    auth: true,
  });
}

export async function getPayrollPeriodById(id: string): Promise<AdminPayrollPeriodDetail> {
  return requestJson<AdminPayrollPeriodDetail>({
    path: `/api/admin/payroll/periods/${id}`,
    method: "GET",
    auth: true,
  });
}

export async function createPayrollPeriod(request: CreatePayrollPeriodRequest): Promise<{ id: string }> {
  return requestJson<{ id: string }>({
    path: "/api/admin/payroll/periods",
    method: "POST",
    body: request,
    auth: true,
  });
}

/** Pre-close advisory checks the UI surfaces before asking the admin to confirm. */
export async function getPeriodCloseWarnings(id: string): Promise<PeriodCloseWarnings> {
  return requestJson<PeriodCloseWarnings>({
    path: `/api/admin/payroll/periods/${id}/close-warnings`,
    method: "GET",
    auth: true,
  });
}

export async function closePayrollPeriod(
  id: string,
  options?: { acknowledgeWarnings?: boolean },
): Promise<void> {
  return requestVoid({
    path: `/api/admin/payroll/periods/${id}/close`,
    method: "PATCH",
    body: { acknowledgeWarnings: options?.acknowledgeWarnings ?? false },
    auth: true,
  });
}

/**
 * Confirms a nurse's bank transfer for a period and triggers voucher delivery.
 * DEMO: the backend routes the voucher email + the returned wa.me link to the
 * admin's own email/number (nurses are not messaged yet — see the next-initiative brief).
 */
export async function confirmNursePeriodPayment(
  periodId: string,
  nurseUserId: string,
  bankReference?: string | null,
): Promise<ConfirmNursePaymentResult> {
  return requestJson<ConfirmNursePaymentResult>({
    path: `/api/admin/payroll/periods/${periodId}/nurses/${nurseUserId}/confirm-payment`,
    method: "POST",
    body: { bankReference: bankReference ?? null },
    auth: true,
  });
}

/**
 * Batch: confirm the period's bank transfer for EVERY nurse with lines and deliver each her
 * comprobante in one call. A single (optional) batch bank reference is applied to all nurses.
 * Email is sent automatically per nurse; the response carries one wa.me link per nurse to tap.
 */
export async function deliverPeriodVouchers(
  periodId: string,
  bankReference?: string | null,
): Promise<DeliverPeriodVouchersResult> {
  return requestJson<DeliverPeriodVouchersResult>({
    path: `/api/admin/payroll/periods/${periodId}/deliver-vouchers`,
    method: "POST",
    body: { bankReference: bankReference ?? null },
    auth: true,
  });
}

/** Mark a confirmed/sent nurse payment as failed at the bank (with a reason). Remediation: re-confirm. */
export async function markNursePaymentFailed(
  periodId: string,
  nurseUserId: string,
  reason: string,
): Promise<NursePaymentStateResult> {
  return requestJson<NursePaymentStateResult>({
    path: `/api/admin/payroll/periods/${periodId}/nurses/${nurseUserId}/mark-failed`,
    method: "POST",
    body: { reason },
    auth: true,
  });
}

/** Reverse a previously confirmed nurse payment (with a reason). The nurse is notified. */
export async function reverseNursePayment(
  periodId: string,
  nurseUserId: string,
  reason: string,
): Promise<NursePaymentStateResult> {
  return requestJson<NursePaymentStateResult>({
    path: `/api/admin/payroll/periods/${periodId}/nurses/${nurseUserId}/reverse`,
    method: "POST",
    body: { reason },
    auth: true,
  });
}

export async function updatePayrollPeriod(id: string, request: CreatePayrollPeriodRequest): Promise<void> {
  return requestVoid({
    path: `/api/admin/payroll/periods/${id}`,
    method: "PUT",
    body: request,
    auth: true,
  });
}

export async function deletePayrollPeriod(id: string): Promise<void> {
  return requestVoid({
    path: `/api/admin/payroll/periods/${id}`,
    method: "DELETE",
    auth: true,
  });
}

export function getPayrollPeriodExportUrl(id: string): string {
  return `${API_BASE_URL}/api/admin/payroll/periods/${id}/export`;
}

export function getPayrollPeriodReportPdfUrl(id: string): string {
  return `${API_BASE_URL}/api/admin/payroll/periods/${id}/report/pdf`;
}

export function getPayrollPeriodReportXlsxUrl(id: string): string {
  return `${API_BASE_URL}/api/admin/payroll/periods/${id}/report/xlsx`;
}

export async function getDeductions(options?: {
  nurseId?: string | null;
  periodId?: string | null;
}): Promise<AdminDeductionListResult> {
  const params = new URLSearchParams();
  if (options?.nurseId) params.set("nurseId", options.nurseId);
  if (options?.periodId) params.set("periodId", options.periodId);
  
  const queryString = params.toString();
  const path = `/api/admin/payroll/deductions${queryString ? `?${queryString}` : ""}`;
  
  return requestJson<AdminDeductionListResult>({
    path,
    method: "GET",
    auth: true,
  });
}

export async function createDeduction(request: CreateDeductionRequest): Promise<{ id: string }> {
  return requestJson<{ id: string }>({
    path: "/api/admin/payroll/deductions",
    method: "POST",
    body: request,
    auth: true,
  });
}

export async function updateDeduction(id: string, request: UpdateDeductionRequest): Promise<void> {
  return requestVoid({
    path: `/api/admin/payroll/deductions/${id}`,
    method: "PUT",
    body: request,
    auth: true,
  });
}

export async function deleteDeduction(id: string): Promise<void> {
  return requestVoid({
    path: `/api/admin/payroll/deductions/${id}`,
    method: "DELETE",
    auth: true,
  });
}

export async function getAdjustments(executionId?: string | null): Promise<AdminCompensationAdjustmentListResult> {
  const params = new URLSearchParams();
  if (executionId) params.set("executionId", executionId);
  
  const queryString = params.toString();
  const path = `/api/admin/payroll/adjustments${queryString ? `?${queryString}` : ""}`;
  
  return requestJson<AdminCompensationAdjustmentListResult>({
    path,
    method: "GET",
    auth: true,
  });
}

export async function createAdjustment(request: CreateCompensationAdjustmentRequest): Promise<{ id: string }> {
  return requestJson<{ id: string }>({
    path: "/api/admin/payroll/adjustments",
    method: "POST",
    body: request,
    auth: true,
  });
}

export async function updateAdjustment(id: string, request: { label: string; amount: number }): Promise<void> {
  return requestVoid({
    path: `/api/admin/payroll/adjustments/${id}`,
    method: "PUT",
    body: request,
    auth: true,
  });
}

export async function deleteAdjustment(id: string): Promise<void> {
  return requestVoid({
    path: `/api/admin/payroll/adjustments/${id}`,
    method: "DELETE",
    auth: true,
  });
}

export async function recalculatePayroll(request?: RecalculatePayrollRequest, maxRetries = 2): Promise<RecalculatePayrollResult> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestJson<RecalculatePayrollResult>({
        path: "/api/admin/payroll/recalculate",
        method: "POST",
        body: request ?? {},
        auth: true,
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Do not retry on client errors (4xx) — only on network/server errors
      if (lastError.message.includes("400") || lastError.message.includes("401") ||
          lastError.message.includes("403") || lastError.message.includes("429")) {
        throw lastError;
      }
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError!;
}

// --- Batch B additions: Admin payroll line override and voucher functions ---

export async function submitPayrollLineOverride(
  lineId: string,
  data: { overrideAmount: number; reason: string }
): Promise<void> {
  return requestVoid({
    path: `/api/admin/payroll/lines/${lineId}/override`,
    method: "POST",
    body: data,
    auth: true,
  });
}

export async function approvePayrollLineOverride(lineId: string): Promise<void> {
  return requestVoid({
    path: `/api/admin/payroll/lines/${lineId}/override/approve`,
    method: "POST",
    auth: true,
  });
}

export function getAdminPayrollVoucherUrl(periodId: string, nurseId: string): string {
  return `${API_BASE_URL}/api/admin/payroll/periods/${periodId}/voucher/${nurseId}`;
}

export function getAdminPayrollBulkVouchersUrl(periodId: string): string {
  return `${API_BASE_URL}/api/admin/payroll/periods/${periodId}/vouchers/zip`;
}

// --- Scheduled Deductions ---

export async function getScheduledDeductions(opts?: {
  nurseId?: string | null;
  status?: string | null;
}): Promise<ScheduledDeductionListResult> {
  const params = new URLSearchParams();
  if (opts?.nurseId) params.set("nurseId", opts.nurseId);
  if (opts?.status) params.set("status", opts.status);

  const queryString = params.toString();
  const path = `/api/admin/payroll/scheduled-deductions${queryString ? `?${queryString}` : ""}`;

  return requestJson<ScheduledDeductionListResult>({
    path,
    method: "GET",
    auth: true,
  });
}

export async function getScheduledDeductionById(id: string): Promise<ScheduledDeductionDetail> {
  return requestJson<ScheduledDeductionDetail>({
    path: `/api/admin/payroll/scheduled-deductions/${id}`,
    method: "GET",
    auth: true,
  });
}

export async function createScheduledDeduction(req: CreateScheduledDeductionRequest): Promise<{ id: string }> {
  return requestJson<{ id: string }>({
    path: "/api/admin/payroll/scheduled-deductions",
    method: "POST",
    body: req,
    auth: true,
  });
}

export async function payoffScheduledDeduction(id: string): Promise<void> {
  return requestVoid({
    path: `/api/admin/payroll/scheduled-deductions/${id}/payoff`,
    method: "POST",
    auth: true,
  });
}

export async function rescheduleScheduledDeduction(id: string, req: RescheduleScheduledDeductionRequest): Promise<void> {
  return requestVoid({
    path: `/api/admin/payroll/scheduled-deductions/${id}/reschedule`,
    method: "PUT",
    body: req,
    auth: true,
  });
}

export async function skipScheduledInstallment(id: string, payrollPeriodId: string): Promise<void> {
  return requestVoid({
    path: `/api/admin/payroll/scheduled-deductions/${id}/skip`,
    method: "POST",
    body: { payrollPeriodId },
    auth: true,
  });
}

export async function cancelScheduledDeduction(id: string, reason: string): Promise<void> {
  return requestVoid({
    path: `/api/admin/payroll/scheduled-deductions/${id}/cancel`,
    method: "POST",
    body: { reason },
    auth: true,
  });
}

export type {
  NursePayrollSummaryDto,
  PayrollPeriodListItemDto,
  NursePayrollPeriodDetailDto,
  AdminMobilePayrollSummaryDto,
  RecentPeriod,
  AdminPayrollPeriodListItem,
  AdminPayrollPeriodListResult,
  AdminPayrollLineItem,
  AdminPayrollStaffSummary,
  AdminPayrollPeriodDetail,
  CreatePayrollPeriodRequest,
  PeriodCloseWarnings,
  AdminDeductionListItem,
  AdminDeductionListResult,
  CreateDeductionRequest,
  UpdateDeductionRequest,
  AdminCompensationAdjustmentListItem,
  AdminCompensationAdjustmentListResult,
  CreateCompensationAdjustmentRequest,
  RecalculatePayrollRequest,
  RecalculatePayrollResult,
  ScheduledDeductionListResult,
  ScheduledDeductionDetail,
  CreateScheduledDeductionRequest,
  RescheduleScheduledDeductionRequest,
  ConfirmNursePaymentResult,
  DeliverPeriodVouchersResult,
  NursePaymentStateResult,
} from "./payrollTypes";
