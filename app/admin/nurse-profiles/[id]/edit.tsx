import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { type FooterAction } from "@/src/components/navigation/AppFooter";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import { FormInput, FormSwitch } from "@/src/components/form";
import { BankSelector } from "@/components/BankSelector";
import {
  getNurseProfileForAdmin,
  updateNurseProfileForAdmin,
  type NurseProfileAdminRecordDto,
  type UpdateNurseProfileRequest,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";
import { buildAdminNurseProfileDetailPath, goBackOrReplace } from "@/src/utils/navigationEscapes";
import { hapticFeedback } from "@/src/utils/haptics";

const TOTAL_STEPS = 3;

const EMPTY_FORM: UpdateNurseProfileRequest = {
  name: "",
  lastName: "",
  identificationNumber: "",
  phone: "",
  email: "",
  hireDate: "",
  specialty: "",
  licenseId: "",
  bankName: "",
  accountNumber: "",
  accountType: "",
  accountHolderName: "",
  category: "",
  visitDailyRate: 0,
  homeCareMonthlyRate: 0,
  homeCareMonthlyExpectedDays: 23.83,
  optInWhatsApp: false,
};

function dtoToForm(d: NurseProfileAdminRecordDto): UpdateNurseProfileRequest {
  return {
    name: d.name || "",
    lastName: d.lastName || "",
    identificationNumber: d.identificationNumber || "",
    phone: d.phone || "",
    email: d.email || "",
    hireDate: d.hireDate || "",
    specialty: d.specialty || "",
    licenseId: d.licenseId || "",
    bankName: d.bankName || "",
    accountNumber: d.accountNumber || "",
    accountType: d.accountType || "",
    accountHolderName: d.accountHolderName || "",
    category: d.category || "",
    visitDailyRate: d.visitDailyRate ?? 0,
    homeCareMonthlyRate: d.homeCareMonthlyRate ?? 0,
    homeCareMonthlyExpectedDays: d.homeCareMonthlyExpectedDays ?? 23.83,
    optInWhatsApp: d.optInWhatsApp ?? false,
  };
}

function formsEqual(a: UpdateNurseProfileRequest, b: UpdateNurseProfileRequest) {
  const keys: (keyof UpdateNurseProfileRequest)[] = [
    "name", "lastName", "identificationNumber", "phone", "email",
    "hireDate", "specialty", "licenseId", "bankName", "accountNumber", "accountType", "accountHolderName", "category",
    "visitDailyRate", "homeCareMonthlyRate", "homeCareMonthlyExpectedDays", "optInWhatsApp",
  ];
  return keys.every((k) => (a[k] ?? "") === (b[k] ?? ""));
}

export default function AdminEditNurseProfileScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<NurseProfileAdminRecordDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<UpdateNurseProfileRequest>(EMPTY_FORM);
  const [originalForm, setOriginalForm] = useState<UpdateNurseProfileRequest>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const fetchedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (requiresProfileCompletion) {
      router.replace("/register");
      return;
    }
    if (!roles.includes("ADMIN")) {
      router.replace("/");
    }
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !id) return;
    if (fetchedIdRef.current === id) return;
    fetchedIdRef.current = id;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getNurseProfileForAdmin(id)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        const next = dtoToForm(data);
        setForm(next);
        setOriginalForm(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "No fue posible cargar el perfil de la enfermera.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isReady, isAuthenticated, id]);

  const isDirty = useMemo(() => !formsEqual(form, originalForm), [form, originalForm]);

  const validateStep1 = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "El nombre es obligatorio.";
    if (!form.lastName.trim()) next.lastName = "El apellido es obligatorio.";
    if (!form.identificationNumber.trim()) next.identificationNumber = "La cédula es obligatoria.";
    if (!form.phone.trim()) next.phone = "El teléfono es obligatorio.";
    if (!form.email.trim()) next.email = "El correo es obligatorio.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Correo no válido.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep2 = () => {
    const next: Record<string, string> = {};
    if (!form.hireDate.trim()) next.hireDate = "La fecha de contratación es obligatoria.";
    if (!form.specialty.trim()) next.specialty = "La especialidad es obligatoria.";
    if (!form.category.trim()) next.category = "La categoría es obligatoria.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep3 = () => {
    const next: Record<string, string> = {};
    if (!form.bankName.trim()) next.bankName = "El banco es obligatorio.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleNext = () => {
    hapticFeedback.selection();
    if (step === 1 && !validateStep1()) {
      hapticFeedback.error();
      return;
    }
    if (step === 2 && !validateStep2()) {
      hapticFeedback.error();
      return;
    }
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const handlePrevious = () => {
    hapticFeedback.selection();
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    if (!validateStep3() || !id) {
      hapticFeedback.error();
      return;
    }
    hapticFeedback.light();
    try {
      setSubmitError(null);
      setSubmitting(true);
      await updateNurseProfileForAdmin(id, form);
      router.replace(`/admin/nurse-profiles/${id}` as never);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "No fue posible actualizar el perfil de la enfermera.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const exitToDetail = () => {
    hapticFeedback.selection();
    setShowLeaveConfirm(false);
    if (id) {
      goBackOrReplace(router, buildAdminNurseProfileDetailPath(id));
    } else {
      goBackOrReplace(router, "/admin/nurse-profiles");
    }
  };

  const handleBack = () => {
    hapticFeedback.selection();
    if (isDirty) {
      setShowLeaveConfirm(true);
    } else {
      exitToDetail();
    }
  };

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) return null;

  const updateField = (key: keyof UpdateNurseProfileRequest, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (typeof value === "string" && errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const workflowActions: FooterAction[] = [
    ...(step > 1
      ? [
          {
            label: "Anterior",
            onPress: handlePrevious,
            variant: "secondary" as const,
            disabled: submitting,
            testID: "admin-edit-nurse-previous-button",
          },
        ]
      : []),
    step < TOTAL_STEPS
      ? {
          label: "Siguiente",
          onPress: handleNext,
          variant: "primary" as const,
          testID: "admin-edit-nurse-next-button",
        }
      : {
          label: submitting ? "Guardando…" : "Guardar",
          onPress: () => void handleSubmit(),
          variant: "primary" as const,
          disabled: submitting,
          testID: "admin-edit-nurse-save-button",
        },
  ];

  return (
    <MobileWorkspaceShell
      title="Editar Enfermera"
      onPrimaryReturn={handleBack}
      primaryReturnLabel="Volver"
      testID={adminTestIds.nurses.edit.screen}
      nativeID={adminTestIds.nurses.edit.screen}
      workflowActions={workflowActions}
    >
      {loadError ? (
        <View style={styles.errorBanner}>
          <Text
            testID={adminTestIds.nurses.edit.errorBanner}
            nativeID={adminTestIds.nurses.edit.errorBanner}
            style={styles.errorText}
          >
            {loadError}
          </Text>
        </View>
      ) : null}

      {submitError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{submitError}</Text>
        </View>
      ) : null}

      {loading && !profile ? <Text style={styles.loading}>Cargando...</Text> : null}

      {profile ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.stepPill}>
            <Text
              testID={adminTestIds.nurses.edit.progressChip}
              nativeID={adminTestIds.nurses.edit.progressChip}
              style={styles.stepPillText}
            >
              Paso {step} de {TOTAL_STEPS}
            </Text>
          </View>

          {step === 1 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Información Personal</Text>
              <FormInput
                testID="admin-edit-nurse-name-input"
                label="Nombre *"
                value={form.name}
                onChangeText={(v) => updateField("name", v)}
                errorMessage={errors.name}
                accessibilityLabel="Nombre"
              />
              <FormInput
                testID="admin-edit-nurse-lastname-input"
                label="Apellido *"
                value={form.lastName}
                onChangeText={(v) => updateField("lastName", v)}
                errorMessage={errors.lastName}
                accessibilityLabel="Apellido"
              />
              <FormInput
                testID="admin-edit-nurse-id-input"
                label="Cédula *"
                value={form.identificationNumber}
                onChangeText={(v) => updateField("identificationNumber", v)}
                errorMessage={errors.identificationNumber}
                keyboardType="number-pad"
                accessibilityLabel="Cédula"
              />
              <FormInput
                testID="admin-edit-nurse-phone-input"
                label="Teléfono *"
                value={form.phone}
                onChangeText={(v) => updateField("phone", v)}
                errorMessage={errors.phone}
                keyboardType="phone-pad"
                accessibilityLabel="Teléfono"
              />
              <FormInput
                testID="admin-edit-nurse-email-input"
                label="Correo *"
                value={form.email}
                onChangeText={(v) => updateField("email", v)}
                errorMessage={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel="Correo"
              />
              <FormSwitch
                testID="admin-edit-nurse-whatsapp-opt-in"
                label="Recibir comprobantes por WhatsApp"
                description="La enfermera consiente recibir sus comprobantes de pago por WhatsApp."
                value={form.optInWhatsApp ?? false}
                onValueChange={(v) => updateField("optInWhatsApp", v)}
              />
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Información Profesional</Text>
              <FormInput
                testID="admin-edit-nurse-hire-date-input"
                label="Fecha de Contratación *"
                placeholder="YYYY-MM-DD"
                value={form.hireDate}
                onChangeText={(v) => updateField("hireDate", v)}
                errorMessage={errors.hireDate}
                accessibilityLabel="Fecha de contratación"
              />
              <FormInput
                testID="admin-edit-nurse-specialty-input"
                label="Especialidad *"
                value={form.specialty}
                onChangeText={(v) => updateField("specialty", v)}
                errorMessage={errors.specialty}
                accessibilityLabel="Especialidad"
              />
              <FormInput
                testID="admin-edit-nurse-license-input"
                label="Licencia"
                value={form.licenseId ?? ""}
                onChangeText={(v) => updateField("licenseId", v)}
                accessibilityLabel="Licencia"
              />
              <FormInput
                testID="admin-edit-nurse-category-input"
                label="Categoría *"
                value={form.category}
                onChangeText={(v) => updateField("category", v)}
                errorMessage={errors.category}
                accessibilityLabel="Categoría"
              />
              <FormInput
                testID="admin-edit-nurse-visit-rate-input"
                label="Tarifa por día (domicilio) RD$"
                value={form.visitDailyRate ? String(form.visitDailyRate) : ""}
                onChangeText={(v) => setForm((prev) => ({ ...prev, visitDailyRate: Number(v.replace(/[^0-9.]/g, "")) || 0 }))}
                keyboardType="numeric"
                accessibilityLabel="Tarifa de pago por día para domicilio"
              />
              <FormInput
                testID="admin-edit-nurse-home-monthly-input"
                label="Monto mensual (casa hogar) RD$"
                value={form.homeCareMonthlyRate ? String(form.homeCareMonthlyRate) : ""}
                onChangeText={(v) => setForm((prev) => ({ ...prev, homeCareMonthlyRate: Number(v.replace(/[^0-9.]/g, "")) || 0 }))}
                keyboardType="numeric"
                accessibilityLabel="Monto mensual de casa hogar"
              />
              <FormInput
                testID="admin-edit-nurse-home-days-input"
                label="Días esperados/mes (casa hogar)"
                value={form.homeCareMonthlyExpectedDays ? String(form.homeCareMonthlyExpectedDays) : ""}
                onChangeText={(v) => setForm((prev) => ({ ...prev, homeCareMonthlyExpectedDays: Number(v.replace(/[^0-9.]/g, "")) || 23.83 }))}
                keyboardType="numeric"
                accessibilityLabel="Días esperados de trabajo en el mes"
              />
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Información Bancaria</Text>
              <BankSelector
                testID="admin-edit-nurse-bank-input"
                label="Banco"
                required
                value={form.bankName}
                onChange={(v) => updateField("bankName", v)}
                errorMessage={errors.bankName}
              />
              <FormInput
                testID="admin-edit-nurse-account-input"
                label="Número de Cuenta"
                value={form.accountNumber ?? ""}
                onChangeText={(v) => updateField("accountNumber", v)}
                keyboardType="numeric"
                accessibilityLabel="Número de cuenta"
              />
              <FormInput
                testID="admin-edit-nurse-account-type-input"
                label="Tipo de cuenta (ahorro / corriente)"
                value={form.accountType ?? ""}
                onChangeText={(v) => updateField("accountType", v)}
                accessibilityLabel="Tipo de cuenta"
              />
              <FormInput
                testID="admin-edit-nurse-account-holder-input"
                label="Titular de la cuenta"
                value={form.accountHolderName ?? ""}
                onChangeText={(v) => updateField("accountHolderName", v)}
                accessibilityLabel="Titular de la cuenta"
              />
            </View>
          ) : null}
        </ScrollView>
      ) : null}

      <Modal
        visible={showLeaveConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLeaveConfirm(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            hapticFeedback.selection();
            setShowLeaveConfirm(false);
          }}
        >
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>¿Salir sin guardar?</Text>
            <Text style={styles.modalBody}>
              Tienes cambios sin guardar. Si sales ahora se perderán.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  hapticFeedback.selection();
                  setShowLeaveConfirm(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Continuar editando"
                testID="admin-edit-nurse-leave-cancel-button"
              >
                <Text style={styles.modalButtonText}>Continuar Editando</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={exitToDetail}
                accessibilityRole="button"
                accessibilityLabel="Descartar cambios y salir"
                testID="admin-edit-nurse-leave-discard-button"
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextInverse]}>
                  Descartar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.xxl,
  },
  stepPill: {
    alignSelf: "flex-start",
    backgroundColor: designTokens.color.surface.secondary,
    borderRadius: designTokens.radius.pill,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
  },
  stepPillText: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  card: {
    ...mobileSurfaceCard,
    padding: designTokens.spacing.lg,
    gap: designTokens.spacing.sm,
  },
  cardTitle: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "900",
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.sm,
  },
  errorBanner: {
    backgroundColor: designTokens.color.surface.danger,
    borderColor: designTokens.color.border.danger,
    borderWidth: 1,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.sm,
  },
  errorText: {
    color: designTokens.color.status.dangerText,
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "700",
  },
  loading: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.body.fontSize,
    textAlign: "center",
    paddingVertical: designTokens.spacing.xxl,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: designTokens.spacing.xl,
  },
  modal: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.xl,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: designTokens.typography.section.fontSize,
    fontWeight: "900",
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.sm,
  },
  modalBody: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.body.fontSize,
    lineHeight: 20,
    marginBottom: designTokens.spacing.lg,
  },
  modalActions: {
    flexDirection: "row",
    gap: designTokens.spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radius.md,
    alignItems: "center",
  },
  modalButtonSecondary: {
    backgroundColor: designTokens.color.surface.secondary,
  },
  modalButtonDanger: {
    backgroundColor: designTokens.color.ink.danger,
  },
  modalButtonText: {
    color: designTokens.color.ink.primary,
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "800",
  },
  modalButtonTextInverse: {
    color: designTokens.color.ink.inverse,
  },
});
