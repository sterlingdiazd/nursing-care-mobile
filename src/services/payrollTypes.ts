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
  serviceSubtotal: number; // subtotal cobrado al cliente; margen = serviceSubtotal - netCompensation
  createdAtUtc: string;
  pendingOverrideId?: string | null;
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
  /** True only while Open with no lines and no deductions/installments — editable/deletable. */
  canModify: boolean;
}

export interface CreatePayrollPeriodRequest {
  startDate: string;
  endDate: string;
  cutoffDate: string;
  paymentDate: string;
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

export interface UpdateDeductionRequest {
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

export interface NursePayrollServiceLineDto {
  serviceExecutionId: string;
  serviceDate: string;
  description: string;
  baseCompensation: number;
  transportIncentive: number;
  complexityBonus: number;
  netCompensation: number;
}

export interface NursePayrollPeriodDetailDto {
  periodId: string;
  startDate: string;
  endDate: string;
  status: string;
  services: NursePayrollServiceLineDto[];
}

// --- Scheduled Deductions ---

export interface ScheduledDeductionListItem {
  id: string;
  nurseUserId: string;
  nurseDisplayName: string;
  deductionType: "Loan" | "Advance" | "Insurance" | "Other";
  label: string;
  modality: "Amortizing" | "RecurringFixed" | "OneTime";
  cadence: "Monthly" | "PerPeriod";
  status: "Active" | "Completed" | "Cancelled";
  startPeriodDate: string;
  principalAmount: number;
  interestRatePercent: number;
  totalRepayable: number;
  installmentAmount: number;
  totalInstallments: number;
  recurringAmount: number;
  endDate: string | null;
  maxOccurrences: number | null;
  installmentsGenerated: number;
  installmentsPaid: number;
  amountSettled: number;
  remainingBalance: number;
  notes: string | null;
  createdAtUtc: string;
  closedAtUtc: string | null;
}

export interface ScheduledDeductionListResult {
  items: ScheduledDeductionListItem[];
  totalCount: number;
}

export interface ScheduledDeductionInstallmentRow {
  sequence: number | null;
  payrollPeriodId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  label: string;
  amount: number;
  paid: boolean;
}

export interface ScheduledDeductionDetail {
  plan: ScheduledDeductionListItem;
  installments: ScheduledDeductionInstallmentRow[];
}

export interface CreateScheduledDeductionRequest {
  nurseUserId: string;
  deductionType: "Loan" | "Advance" | "Insurance" | "Other";
  label: string;
  modality: "Amortizing" | "RecurringFixed" | "OneTime";
  cadence: "Monthly" | "PerPeriod";
  startPeriodDate: string;
  notes?: string;
  principalAmount?: number;
  interestRatePercent?: number;
  totalInstallments?: number;
  recurringAmount?: number;
  endDate?: string;
  maxOccurrences?: number;
}

export interface RescheduleScheduledDeductionRequest {
  installmentAmount?: number;
  recurringAmount?: number;
  endDate?: string;
  maxOccurrences?: number;
}
