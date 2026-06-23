import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { FormInput } from "@/src/components/form";
import { BankSelector } from "@/components/BankSelector";
import { FormPanel } from "@/src/components/shared/FormPanel";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import { getNurseProfile, updateNurseProfile } from "@/src/services/nurseProfileService";
import type { NurseProfileDto } from "@/src/types/nurse";
import { nurseTestIds } from "@/src/testing/testIds";
import { automationProps } from "@/src/utils/adminOperationalUx";
import { goBackOrReplace } from "@/src/utils/navigationEscapes";
import { formatDOP } from "@/src/utils/currency";
import { getExactDigitsFieldError, sanitizeDigitsOnlyInput } from "@/src/utils/identityValidation";
import { hapticFeedback } from "@/src/utils/haptics";
import { getCachedAuthSession } from "@/src/services/authSession";
import {
  getNursePayrollHistory,
  getNursePayrollVoucherUrl,
  type PayrollPeriodListItemDto,
} from "@/src/services/payrollService";
import { useToast } from "@/src/components/shared/ToastProvider";

type EditableForm = {
  phone: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  accountHolderName: string;
};

const EMPTY_FORM: EditableForm = {
  phone: "",
  bankName: "",
  accountNumber: "",
  accountType: "",
  accountHolderName: "",
};

function detailToForm(detail: NurseProfileDto): EditableForm {
  return {
    phone: detail.phone ?? "",
    bankName: detail.bankName ?? "",
    accountNumber: detail.accountNumber ?? "",
    accountType: detail.accountType ?? "",
    accountHolderName: detail.accountHolderName ?? "",
  };
}

function resolvePeriodId(period: PayrollPeriodListItemDto): string | null {
  // Backend may return id under "periodId" or "id" (both fields exist in the DTO).
  const pid = (period as unknown as Record<string, unknown>).periodId ?? period.id ?? null;
  if (pid === "undefined" || pid === "null") return null;
  return typeof pid === "string" ? pid : null;
}

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function NurseProfileScreen() {
  const { isReady, isAuthenticated, roles } = useAuth();
  const { showToast } = useToast();
  const [detail, setDetail] = useState<NurseProfileDto | null>(null);
  const [form, setForm] = useState<EditableForm>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [payrollHistory, setPayrollHistory] = useState<PayrollPeriodListItemDto[]>([]);
  const [isLoadingPayroll, setIsLoadingPayroll] = useState(false);
  const [payrollFetchDone, setPayrollFetchDone] = useState(false);
  const [downloadingVoucherId, setDownloadingVoucherId] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!roles.includes("NURSE")) {
      router.replace("/account");
    }
  }, [isReady, isAuthenticated, roles]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !roles.includes("NURSE")) return;
    let cancelled = false;
    setIsFetching(true);
    setError(null);
    void getNurseProfile()
      .then((dto) => {
        if (cancelled) return;
        setDetail(dto);
        setForm(detailToForm(dto));
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "No fue posible cargar tu perfil.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isReady, isAuthenticated, roles]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !roles.includes("NURSE")) return;
    let cancelled = false;
    setIsLoadingPayroll(true);
    void getNursePayrollHistory("")
      .then((periods) => {
        if (!cancelled) setPayrollHistory(periods);
      })
      .catch(() => { /* section stays hidden on network error — supplementary data */ })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingPayroll(false);
          setPayrollFetchDone(true);
        }
      });
    return () => { cancelled = true; };
  }, [isReady, isAuthenticated, roles]);

  const handleDownloadVoucher = async (periodId: string) => {
    if (downloadingVoucherId) return;
    hapticFeedback.light();
    setDownloadingVoucherId(periodId);
    try {
      const session = getCachedAuthSession();
      const token = session?.token;
      if (!token) {
        showToast({ variant: "error", message: "No hay sesión activa." });
        return;
      }
      const url = getNursePayrollVoucherUrl(periodId);
      const fileUri = (FileSystem.documentDirectory ?? "") + `comprobante-${periodId}.pdf`;
      const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (downloadRes.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadRes.uri);
        } else {
          showToast({ variant: "error", message: "Archivo descargado pero compartir no está disponible." });
        }
      } else {
        showToast({ variant: "error", message: "No fue posible descargar el comprobante." });
      }
    } catch (e) {
      console.error(e);
      showToast({ variant: "error", message: "No fue posible descargar el comprobante." });
    } finally {
      setDownloadingVoucherId(null);
    }
  };

  const phoneError = isEditing ? getExactDigitsFieldError(form.phone, "Teléfono", 10) : "";
  const hasErrors = Boolean(phoneError);

  const fullName = detail
    ? [detail.name, detail.lastName].filter(Boolean).join(" ").trim() || "Sin nombre"
    : "";

  const updateField = (key: keyof EditableForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (success) setSuccess(null);
  };

  const handleCancel = () => {
    hapticFeedback.selection();
    if (detail) setForm(detailToForm(detail));
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    hapticFeedback.selection();
    setSuccess(null);
    setError(null);
    if (hasErrors) {
      hapticFeedback.error();
      setError("Revisa los campos marcados antes de guardar.");
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateNurseProfile({
        phone: form.phone.trim(),
        bankName: form.bankName.trim() || null,
        accountNumber: form.accountNumber.trim() || null,
        accountType: form.accountType.trim() || null,
        accountHolderName: form.accountHolderName.trim() || null,
      });
      setDetail(updated);
      setForm(detailToForm(updated));
      setIsEditing(false);
      setSuccess("Perfil actualizado correctamente.");
      hapticFeedback.success();
    } catch (nextError: unknown) {
      hapticFeedback.error();
      setError(nextError instanceof Error ? nextError.message : "No fue posible guardar tu perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MobileWorkspaceShell
      title="Mi Perfil"
      description="Tus datos de contacto y la cuenta donde recibes pago."
      testID={nurseTestIds.profile.screen}
      nativeID={nurseTestIds.profile.screen}
      primaryReturnLabel="Volver"
      onPrimaryReturn={() => goBackOrReplace(router, "/account")}
      systemActions={[
        isEditing
          ? {
              label: isSaving ? "Guardando…" : "Guardar",
              onPress: () => void handleSave(),
              variant: "primary",
              disabled: isSaving,
              testID: nurseTestIds.profile.saveButton,
            }
          : {
              label: "Editar",
              onPress: () => {
                hapticFeedback.selection();
                setIsEditing(true);
                setSuccess(null);
              },
              variant: "primary",
              testID: nurseTestIds.profile.editButton,
            },
      ]}
    >
      {isFetching ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator
            {...automationProps(nurseTestIds.profile.loadingIndicator)}
            color={designTokens.color.ink.accent}
          />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
          {error ? (
            <Text
              style={styles.errorBanner}
              testID={nurseTestIds.profile.errorBanner}
              nativeID={nurseTestIds.profile.errorBanner}
            >
              {error}
            </Text>
          ) : null}
          {success ? (
            <Text
              style={styles.successBanner}
              testID={nurseTestIds.profile.successBanner}
              nativeID={nurseTestIds.profile.successBanner}
            >
              {success}
            </Text>
          ) : null}

          {detail ? (
            <View style={styles.metaCard}>
              <ReadOnlyRow
                label="Nombre"
                value={fullName}
                testID={nurseTestIds.profile.nameValue}
              />
              <ReadOnlyRow
                label="Cédula"
                value={detail.identificationNumber || "Sin cédula"}
                testID={nurseTestIds.profile.identificationValue}
              />
              <ReadOnlyRow
                label="Correo"
                value={detail.email}
                testID={nurseTestIds.profile.emailValue}
              />
              <ReadOnlyRow
                label="Tarifa por visita"
                value={formatDOP(detail.visitDailyRate)}
                testID={nurseTestIds.profile.visitRateValue}
              />
              <ReadOnlyRow
                label="Tarifa mensual (hogar)"
                value={formatDOP(detail.homeCareMonthlyRate)}
                testID={nurseTestIds.profile.homeCareRateValue}
                last
              />
            </View>
          ) : null}

          <FormPanel eyebrow="Contacto y pago" testID="nurse-profile-editable-panel">
            <FormInput
              testID={nurseTestIds.profile.phoneInput}
              label="Teléfono"
              value={form.phone}
              editable={isEditing && !isSaving}
              keyboardType="phone-pad"
              error={phoneError}
              onChangeText={(value) => updateField("phone", sanitizeDigitsOnlyInput(value, 10))}
            />
            <BankSelector
              testID={nurseTestIds.profile.bankNameInput}
              label="Banco"
              value={form.bankName}
              onChange={(value) => updateField("bankName", value)}
              disabled={!isEditing || isSaving}
            />
            <FormInput
              testID={nurseTestIds.profile.accountNumberInput}
              label="Número de cuenta"
              value={form.accountNumber}
              editable={isEditing && !isSaving}
              keyboardType="number-pad"
              onChangeText={(value) => updateField("accountNumber", value)}
            />
            <FormInput
              testID={nurseTestIds.profile.accountTypeInput}
              label="Tipo de cuenta"
              value={form.accountType}
              editable={isEditing && !isSaving}
              onChangeText={(value) => updateField("accountType", value)}
            />
            <FormInput
              testID={nurseTestIds.profile.accountHolderNameInput}
              label="Titular de la cuenta"
              value={form.accountHolderName}
              editable={isEditing && !isSaving}
              autoCapitalize="words"
              onChangeText={(value) => updateField("accountHolderName", value)}
            />

            {isEditing ? (
              <Pressable
                testID={nurseTestIds.profile.cancelButton}
                nativeID={nurseTestIds.profile.cancelButton}
                accessibilityRole="button"
                accessibilityLabel="Cancelar edición"
                onPress={handleCancel}
                disabled={isSaving}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
              >
                <Text style={styles.cancelButtonText}>Cancelar edición</Text>
              </Pressable>
            ) : null}
          </FormPanel>

          {/* Mis Pagos — last 3 closed payroll periods */}
          {isLoadingPayroll ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={designTokens.color.ink.accent} accessibilityLabel="Cargando pagos..." />
            </View>
          ) : null}

          {payrollFetchDone && !isLoadingPayroll && payrollHistory.filter((p) => p.status === "Closed").length === 0 ? (
            <View style={styles.paymentsCard}>
              <Text style={styles.sectionTitle}>Mis Pagos</Text>
              <Text style={styles.emptyPayments}>Aún no hay períodos de pago cerrados.</Text>
            </View>
          ) : null}

          {!isLoadingPayroll && payrollHistory.filter((p) => p.status === "Closed").length > 0 ? (
            <View style={styles.paymentsCard}>
              <Text style={styles.sectionTitle}>Mis Pagos</Text>
              {payrollHistory
                .filter((p) => p.status === "Closed")
                .slice(0, 3)
                .map((period) => {
                  const pid = resolvePeriodId(period);
                  const rowKey = pid ?? `${period.startDate}-${period.endDate}`;
                  return (
                    <View key={rowKey} style={styles.paymentRow}>
                      <View style={styles.paymentInfo}>
                        <Text style={styles.paymentDates}>
                          {formatShortDate(period.startDate)} – {formatShortDate(period.endDate)}
                        </Text>
                        <Text style={styles.paymentAmount}>{formatDOP(period.totalCompensation)}</Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Descargar comprobante"
                        onPress={() => { if (pid) void handleDownloadVoucher(pid); }}
                        disabled={!pid || downloadingVoucherId === pid}
                        style={({ pressed }) => [styles.downloadBtn, pressed && styles.pressed]}
                        testID={`nurse-profile-download-voucher-${rowKey}`}
                        nativeID={`nurse-profile-download-voucher-${rowKey}`}
                      >
                        <Text style={styles.downloadBtnText}>
                          {downloadingVoucherId === pid ? "Descargando…" : "Descargar comprobante"}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
            </View>
          ) : null}
        </ScrollView>
      )}
    </MobileWorkspaceShell>
  );
}

function ReadOnlyRow({
  label,
  value,
  testID,
  last = false,
}: {
  label: string;
  value: string;
  testID: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} testID={testID} nativeID={testID} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    paddingVertical: designTokens.spacing.xxxl,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    gap: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.xxl,
  },
  metaCard: {
    ...mobileSurfaceCard,
    padding: designTokens.spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    ...designTokens.typography.label,
    color: designTokens.color.ink.secondary,
  },
  infoValue: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.primary,
    fontWeight: "800",
    flexShrink: 1,
    textAlign: "right",
  },
  errorBanner: {
    color: designTokens.color.status.dangerText,
    backgroundColor: designTokens.color.surface.danger,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
    fontWeight: "700",
  },
  successBanner: {
    color: designTokens.color.status.successText,
    backgroundColor: designTokens.color.surface.success,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
    fontWeight: "700",
  },
  cancelButton: {
    minHeight: 48,
    borderRadius: designTokens.radius.md,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: designTokens.color.ink.secondary,
    fontWeight: "800",
  },
  pressed: { opacity: 0.75 },
  paymentsCard: {
    ...mobileSurfaceCard,
    padding: designTokens.spacing.lg,
    gap: designTokens.spacing.sm,
  },
  sectionTitle: {
    ...designTokens.typography.label,
    color: designTokens.color.ink.secondary,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: designTokens.spacing.xs,
  },
  paymentRow: {
    gap: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  paymentInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentDates: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.primary,
  },
  paymentAmount: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.primary,
    fontWeight: "800",
  },
  downloadBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.radius.md,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    backgroundColor: designTokens.color.surface.secondary,
  },
  downloadBtnText: {
    ...designTokens.typography.label,
    color: designTokens.color.ink.accent,
    fontWeight: "700",
  },
  emptyPayments: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.muted,
    paddingVertical: designTokens.spacing.sm,
  },
});
