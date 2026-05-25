import { listAdminSettings, type SystemSettingDto } from "@/src/services/adminShiftsService";
import {
  DEFAULT_PAYMENT_DATE_POLICY,
  type PaymentDatePolicy,
} from "@/src/utils/payrollPeriods";

// System-setting keys that drive the payroll payment-date prefill policy. These are the
// single source of truth for the key strings — the screen lists settings by category, so
// nothing else hardcodes them.
const KEY_MODE = "PAYROLL_PAYMENT_DATE_MODE";
const KEY_FIRST_HALF_DAY = "PAYROLL_FIRST_HALF_PAYMENT_DAY";
const KEY_SECOND_HALF_DAY = "PAYROLL_SECOND_HALF_PAYMENT_DAY";
const KEY_DAYS_BEFORE_MONTH_END = "PAYROLL_DAYS_BEFORE_MONTH_END";

/** Parse an integer from a possibly-missing/blank/non-numeric setting value, defaulting on failure. */
function parseIntOr(value: string | undefined | null, fallback: number): number {
  if (value == null) return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Build a PaymentDatePolicy from a settings list, applying defaults for missing/blank/invalid keys. */
export function paymentDatePolicyFromSettings(
  settings: ReadonlyArray<Pick<SystemSettingDto, "key" | "value">>,
): PaymentDatePolicy {
  const byKey = new Map<string, string>();
  for (const setting of settings ?? []) {
    if (setting?.key) byKey.set(setting.key, setting.value);
  }

  const rawMode = byKey.get(KEY_MODE)?.trim().toUpperCase();
  const mode: PaymentDatePolicy["mode"] =
    rawMode === "DAYS_BEFORE_MONTH_END" ? "DAYS_BEFORE_MONTH_END" : "FIXED_DAY";

  return {
    mode,
    firstHalfPaymentDay: parseIntOr(
      byKey.get(KEY_FIRST_HALF_DAY),
      DEFAULT_PAYMENT_DATE_POLICY.firstHalfPaymentDay,
    ),
    secondHalfPaymentDay: parseIntOr(
      byKey.get(KEY_SECOND_HALF_DAY),
      DEFAULT_PAYMENT_DATE_POLICY.secondHalfPaymentDay,
    ),
    daysBeforeMonthEnd: parseIntOr(
      byKey.get(KEY_DAYS_BEFORE_MONTH_END),
      DEFAULT_PAYMENT_DATE_POLICY.daysBeforeMonthEnd,
    ),
  };
}

/**
 * Fetch the admin-configured payroll payment-date policy from system settings.
 * Returns the default policy (which reproduces the original behavior) if the keys are
 * missing. Callers should still wrap this in try/catch so a settings outage falls back
 * to the default behavior without crashing the prefill.
 */
export async function getPaymentDatePolicy(): Promise<PaymentDatePolicy> {
  const settings = await listAdminSettings();
  return paymentDatePolicyFromSettings(settings);
}
