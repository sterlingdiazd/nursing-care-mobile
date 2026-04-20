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
  AdminCompensationRuleListItem,
  AdminCompensationRuleDetail,
  AdminCompensationRuleListResult,
  CreateCompensationRuleRequest,
  UpdateCompensationRuleRequest,
  AdminDeductionListItem,
  AdminDeductionListResult,
  CreateDeductionRequest,
  AdminCompensationAdjustmentListItem,
  AdminCompensationAdjustmentListResult,
  CreateCompensationAdjustmentRequest,
  RecalculatePayrollRequest,
  RecalculatePayrollResult,
} from "./payrollTypes";

export async function getNursePayrollSummary(_userId: string): Promise<NursePayrollSummaryDto> {
  return requestJson<NursePayrollSummaryDto>({
    path: "/api/nurse/payroll/summary",
    method: "GET",
    auth: true,
  });
}

export async function getNursePayrollHistory(_userId: string): Promise<PayrollPeriodListItemDto[]> {
  return requestJson<PayrollPeriodListItemDto[]>({
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

export async function closePayrollPeriod(id: string): Promise<void> {
  return requestVoid({
    path: `/api/admin/payroll/periods/${id}/close`,
    method: "PATCH",
    auth: true,
  });
}

export function getPayrollPeriodExportUrl(id: string): string {
  return `${API_BASE_URL}/api/admin/payroll/periods/${id}/export`;
}

export async function getCompensationRules(): Promise<AdminCompensationRuleListResult> {
  return requestJson<AdminCompensationRuleListResult>({
    path: "/api/admin/payroll/compensation-rules",
    method: "GET",
    auth: true,
  });
}

export async function getCompensationRuleById(id: string): Promise<AdminCompensationRuleDetail> {
  return requestJson<AdminCompensationRuleDetail>({
    path: `/api/admin/payroll/compensation-rules/${id}`,
    method: "GET",
    auth: true,
  });
}

export async function createCompensationRule(request: CreateCompensationRuleRequest): Promise<{ id: string }> {
  return requestJson<{ id: string }>({
    path: "/api/admin/payroll/compensation-rules",
    method: "POST",
    body: request,
    auth: true,
  });
}

export async function updateCompensationRule(id: string, request: UpdateCompensationRuleRequest): Promise<void> {
  return requestVoid({
    path: `/api/admin/payroll/compensation-rules/${id}`,
    method: "PUT",
    body: request,
    auth: true,
  });
}

export async function deactivateCompensationRule(id: string): Promise<void> {
  return requestVoid({
    path: `/api/admin/payroll/compensation-rules/${id}`,
    method: "DELETE",
    auth: true,
  });
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
  return `${API_BASE_URL}/api/admin/payroll/periods/${periodId}/vouchers/${nurseId}`;
}

export function getAdminPayrollBulkVouchersUrl(periodId: string): string {
  return `${API_BASE_URL}/api/admin/payroll/periods/${periodId}/vouchers`;
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
  AdminCompensationRuleListItem,
  AdminCompensationRuleDetail,
  AdminCompensationRuleListResult,
  CreateCompensationRuleRequest,
  UpdateCompensationRuleRequest,
  AdminDeductionListItem,
  AdminDeductionListResult,
  CreateDeductionRequest,
  AdminCompensationAdjustmentListItem,
  AdminCompensationAdjustmentListResult,
  CreateCompensationAdjustmentRequest,
  RecalculatePayrollRequest,
  RecalculatePayrollResult,
} from "./payrollTypes";
