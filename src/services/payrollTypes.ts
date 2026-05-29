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
  periodId?: string | null;
  id?: string | null;
  startDate: string;
  endDate: string;
  status: string;
  serviceCount?: number | null;
  totalNurses?: number | null;
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
  totalGross: number;
  totalNet: number;
}

export interface PeriodCloseWarnings {
  negativeNetNurses: number;
  unliquidatedServices: number;
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
  careRequestId?: string | null;
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
  /** Real payment state: "Pending"|"SentToBank"|"Confirmed"|"Failed"|"Reversed", or null if unpaid. */
  paymentStatus?: string | null;
  bankReference?: string | null;
  /**
   * Status of the per-period payment confirmation.
   * Phase 2 initiative: tracks if the transfer was done and if the voucher was sent.
   */
  paymentConfirmedAtUtc?: string | null;
  deliveryStatus?: "Pending" | "Sent" | "Failed" | "Skipped" | null;
  deliveryChannel?: "Email" | "WhatsApp" | null;
  deliveredAtUtc?: string | null;
  deliveryError?: string | null;
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
  /** Reopen audit (most recent reopen + running count), present when the period was reopened. */
  reopenedAtUtc?: string | null;
  reopenReason?: string | null;
  reopenCount: number;
  /** Period-level reconciliation (T1.3): money OUT to nurses vs the client invoices that funded it.
   *  Optional/defensive — present when the backend supplies them. TotalCollected is NET of credit notes. */
  totalNetPayout?: number | null;
  totalBilled?: number | null;
  totalCollected?: number | null;
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
  careRequestId?: string;
  serviceDate: string;
  description?: string;
  baseCompensation: number;
  transportIncentive: number;
  complexityBonus: number;
  medicalSuppliesCompensation?: number;
  adjustmentsTotal?: number;
  deductionsTotal?: number;
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

/** Result of confirming a nurse's per-period bank transfer (demo: routes delivery to the admin). */
export interface ConfirmNursePaymentResult {
  periodId: string;
  nurseUserId: string;
  confirmedAtUtc: string;
  bankReference: string | null;
  /** Whether the voucher PDF email was sent (best-effort). */
  voucherEmailSent: boolean;
  /** wa.me link to open WhatsApp prefilled; empty string when no usable number. */
  whatsappUrl: string;
  /** Spanish label describing where the voucher was delivered (demo wording). */
  recipientLabel: string;
  /**
   * Financial-validation/delivery detail. On a blocked delivery this carries the
   * specific reason the comprobante did not pass validation (so it can be retried);
   * on success it is a short confirmation note. May be null on older responses.
   */
  voucherDeliveryDetail?: string | null;
  /**
   * Real payment state: "Pending" | "SentToBank" | "Confirmed" | "Failed" | "Reversed".
   * Separate from voucher delivery. A confirm sets it to "Confirmed". Optional on older responses.
   */
  paymentStatus?: string | null;
}

/** Result of a nurse-payment state change (mark-failed / reverse). */
export interface NursePaymentStateResult {
  periodId: string;
  nurseUserId: string;
  paymentStatus: string;
  reason?: string | null;
}

/** Per-nurse outcome inside a batch comprobante delivery. */
export interface DeliverPeriodVoucherItem {
  nurseUserId: string;
  nurseDisplayName: string;
  voucherEmailSent: boolean;
  /** wa.me link to open WhatsApp prefilled for this nurse; empty string when no usable number. */
  whatsappUrl: string;
  recipientLabel: string;
  voucherDeliveryDetail?: string | null;
}

/** Result of confirming + delivering comprobantes to every nurse in a period at once. */
export interface DeliverPeriodVouchersResult {
  periodId: string;
  confirmedAtUtc: string;
  totalNurses: number;
  deliveredCount: number;
  failedCount: number;
  items: DeliverPeriodVoucherItem[];
}
