export interface NursePayrollSummaryDto {
  nurseUserId: string;
  nurseDisplayName: string;
  currentPeriodId?: string | null;
  currentPeriodStartDate?: string | null;
  currentPeriodEndDate?: string | null;
  currentPeriodStatus?: string | null;
  totalCompensationThisPeriod: number;
  pendingPaymentsCount: number;
  completedPaymentsCount: number;
}

export interface PayrollPeriodListItemDto {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  totalNurses: number;
  totalCompensation: number;
}

export interface RecentPeriod {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  lineCount: number;
}

export interface AdminMobilePayrollSummaryDto {
  openPeriodsCount: number;
  closedPeriodsCount: number;
  totalCompensationCurrentPeriod: number;
  activeNursesCount: number;
  recentPeriods: RecentPeriod[];
}

export interface AdminPayrollPeriodListItem {
  id: string;
  startDate: string;
  endDate: string;
  cutoffDate: string;
  paymentDate: string;
  status: string;
  createdAtUtc: string;
  closedAtUtc?: string | null;
  lineCount: number;
}

export interface AdminPayrollPeriodListResult {
  items: AdminPayrollPeriodListItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface AdminPayrollLineItem {
  id: string;
  nurseUserId: string;
  nurseDisplayName: string;
  serviceExecutionId: string;
  description: string;
  baseCompensation: number;
  transportIncentive: number;
  complexityBonus: number;
  medicalSuppliesCompensation: number;
  adjustmentsTotal: number;
  deductionsTotal: number;
  netCompensation: number;
  createdAtUtc: string;
}

export interface AdminPayrollStaffSummary {
  nurseUserId: string;
  nurseDisplayName: string;
  lineCount: number;
  grossCompensation: number;
  transportIncentives: number;
  adjustmentsTotal: number;
  deductionsTotal: number;
  netCompensation: number;
}

export interface AdminPayrollPeriodDetail {
  id: string;
  startDate: string;
  endDate: string;
  cutoffDate: string;
  paymentDate: string;
  status: string;
  createdAtUtc: string;
  closedAtUtc?: string | null;
  lines: AdminPayrollLineItem[];
  staffSummary: AdminPayrollStaffSummary[];
}

export interface CreatePayrollPeriodRequest {
  startDate: string;
  endDate: string;
  cutoffDate: string;
  paymentDate: string;
}

export interface AdminCompensationRuleListItem {
  id: string;
  name: string;
  employmentType: string;
  baseCompensationPercent: number;
  transportIncentivePercent: number;
  complexityBonusPercent: number;
  medicalSuppliesPercent: number;
  isActive: boolean;
  createdAtUtc: string;
}

export interface AdminCompensationRuleDetail {
  id: string;
  name: string;
  employmentType: string;
  baseCompensationPercent: number;
  transportIncentivePercent: number;
  complexityBonusPercent: number;
  medicalSuppliesPercent: number;
  isActive: boolean;
  createdAtUtc: string;
}

export interface AdminCompensationRuleListResult {
  items: AdminCompensationRuleListItem[];
  totalCount: number;
}

export interface CreateCompensationRuleRequest {
  name: string;
  employmentType: string;
  baseCompensationPercent: number;
  transportIncentivePercent: number;
  complexityBonusPercent: number;
  medicalSuppliesPercent: number;
}

export interface UpdateCompensationRuleRequest {
  name: string;
  baseCompensationPercent: number;
  transportIncentivePercent: number;
  complexityBonusPercent: number;
  medicalSuppliesPercent: number;
}

export interface AdminDeductionListItem {
  id: string;
  nurseUserId: string;
  nurseDisplayName: string;
  payrollPeriodId?: string | null;
  label: string;
  amount: number;
  deductionType: string;
  createdAtUtc: string;
}

export interface AdminDeductionListResult {
  items: AdminDeductionListItem[];
  totalCount: number;
}

export interface CreateDeductionRequest {
  nurseUserId: string;
  payrollPeriodId?: string | null;
  label: string;
  amount: number;
  deductionType: string;
}

export interface AdminCompensationAdjustmentListItem {
  id: string;
  serviceExecutionId: string;
  nurseDisplayName: string;
  label: string;
  amount: number;
  createdAtUtc: string;
}

export interface AdminCompensationAdjustmentListResult {
  items: AdminCompensationAdjustmentListItem[];
  totalCount: number;
}

export interface CreateCompensationAdjustmentRequest {
  serviceExecutionId: string;
  label: string;
  amount: number;
}

export interface RecalculatePayrollRequest {
  periodId?: string | null;
  ruleId?: string | null;
}

export interface RecalculatePayrollResult {
  auditId: string;
  linesAffected: number;
  totalOldNet: number;
  totalNewNet: number;
  triggeredAtUtc: string;
}
