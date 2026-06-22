/**
 * Nurse self-profile contract (the nurse's own view of her profile).
 *
 * Read-only identity + rate fields come straight from her User + NurseProfile;
 * only the contact/payout fields (phone + bank-for-payroll) are editable by the
 * nurse herself. Rates are set by administration and shown read-only.
 *
 * Backend dependency: GET/PUT `/api/nurse/profile` (see nurseProfileService).
 */
export interface NurseProfileDto {
  email: string;
  name?: string | null;
  lastName?: string | null;
  identificationNumber?: string | null;
  phone?: string | null;
  specialty?: string | null;
  category?: string | null;
  // Rates (read-only — administration owns these).
  visitDailyRate: number;
  homeCareMonthlyRate: number;
  // Bank-for-payroll (editable by the nurse).
  bankName?: string | null;
  accountNumber?: string | null;
  accountType?: string | null;
  accountHolderName?: string | null;
}

/** Only the fields a nurse may edit on her own profile. */
export interface UpdateNurseProfileDto {
  phone: string;
  bankName?: string | null;
  accountNumber?: string | null;
  accountType?: string | null;
  accountHolderName?: string | null;
}
