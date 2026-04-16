import { requestJson } from "@/src/services/httpClient";

export type NursePayrollSummaryDto = {
  nurseUserId: string;
  nurseDisplayName: string;
  currentPeriodId?: string | null;
  currentPeriodStartDate?: string | null;
  currentPeriodEndDate?: string | null;
  currentPeriodStatus?: string | null;
  totalCompensationThisPeriod: number;
  pendingPaymentsCount: number;
  completedPaymentsCount: number;
};

export type PayrollPeriodListItemDto = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  totalNurses: number;
  totalCompensation: number;
};

export type AdminMobilePayrollSummaryDto = {
  openPeriodsCount: number;
  closedPeriodsCount: number;
  totalCompensationCurrentPeriod: number;
  activeNursesCount: number;
  recentPeriods: Array<{
    id: string;
    startDate: string;
    endDate: string;
    status: string;
    lineCount: number;
  }>;
};

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

export async function getAdminMobilePayrollSummary(): Promise<AdminMobilePayrollSummaryDto> {
  return requestJson<AdminMobilePayrollSummaryDto>({
    path: "/api/admin/payroll/mobile-summary",
    method: "GET",
    auth: true,
  });
}
