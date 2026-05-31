import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { type FooterAction } from "@/src/components/navigation/AppFooter";
import { FormInput } from "@/src/components/form";
import { useAuth } from "@/src/context/AuthContext";
import { mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";
import {
  AdminClientDetailDto,
  getAdminClientDetail,
  updateAdminClient,
} from "@/src/services/adminPortalService";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { designTokens } from "@/src/design-system/tokens";

type FormState = {
  name: string;
  lastName: string;
  identificationNumber: string;
  phone: string;
  email: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  lastName: "",
  identificationNumber: "",
  phone: "",
  email: "",
};

function detailToForm(detail: AdminClientDetailDto): FormState {
  return {
    name: detail.name ?? "",
    lastName: detail.lastName ?? "",
    identificationNumber: detail.identificationNumber ?? "",
    phone: detail.phone ?? "",
    email: detail.email ?? "",
  };
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validateForm(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.name.trim()) errors.name = "El nombre es obligatorio.";
  if (!form.lastName.trim()) errors.lastName = "El apellido es obligatorio.";
  if (!form.identificationNumber.trim()) errors.identificationNumber = "La cédula es obligatoria.";
  if (!form.phone.trim()) errors.phone = "El teléfono es obligatorio.";
  if (!form.email.trim()) errors.email = "El correo es obligatorio.";
  else if (!isEmail(form.email)) errors.email = "Correo no válido.";
  return errors;
}

export default function AdminClientEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [detail, setDetail] = useState<AdminClientDetailDto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [originalForm, setOriginalForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
    setIsFetching(true);
    setServerError(null);
    getAdminClientDetail(id)
      .then((dto) => {
        if (cancelled) return;
        setDetail(dto);
        const next = detailToForm(dto);
        setForm(next);
        setOriginalForm(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setServerError(err instanceof Error ? err.message : "No se pudo cargar el cliente.");
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isReady, isAuthenticated, id]);

  const isDirty = useMemo(
    () =>
      form.name !== originalForm.name ||
      form.lastName !== originalForm.lastName ||
      form.identificationNumber !== originalForm.identificationNumber ||
      form.phone !== originalForm.phone ||
      form.email !== originalForm.email,
    [form, originalForm],
  );

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    if (successMessage) setSuccessMessage(null);
  };

  const handleDiscard = () => {
    setForm(originalForm);
    setErrors({});
    setServerError(null);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    if (!id) return;
    const validation = validateForm(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setErrors({});
    setServerError(null);
    setSuccessMessage(null);
    setIsSaving(true);
    try {
      const updated = await updateAdminClient(id, {
        name: form.name.trim(),
        lastName: form.lastName.trim(),
        identificationNumber: form.identificationNumber.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      });
      setDetail(updated);
      const next = detailToForm(updated);
      setForm(next);
      setOriginalForm(next);
      setSuccessMessage("Cliente actualizado correctamente.");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "No se pudo guardar el cliente.");
    } finally {
      setIsSaving(false);
    }
  };

  const workflowActions: FooterAction[] = [
    {
      label: "Descartar",
      onPress: handleDiscard,
      variant: "secondary",
      disabled: !isDirty || isSaving,
      testID: "admin-client-edit-cancel-button",
    },
    {
      label: isSaving ? "Guardando…" : "Guardar",
      onPress: () => void handleSave(),
      variant: "primary",
      disabled: !isDirty || isSaving,
      testID: "admin-client-edit-save-button",
    },
  ];

  return (
    <MobileWorkspaceShell
      title={detail ? `Editar ${detail.displayName}` : "Editar Cliente"}
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminClients)}
      primaryReturnLabel="Volver"
      testID="admin-client-edit-screen"
      nativeID="admin-client-edit-screen"
      workflowActions={workflowActions}
    >
      {isFetching ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={mobileTheme.colors.ink.accent} />
        </View>
      ) : (
        <View style={styles.container}>
          {serverError ? (
            <View style={[styles.banner, styles.errorBanner]}>
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={[styles.banner, styles.successBanner]}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          <View style={styles.formCard}>
            <FormInput
              testID="admin-client-edit-name-input"
              label="Nombre"
              value={form.name}
              onChangeText={(v) => updateField("name", v)}
              autoCapitalize="words"
              error={errors.name}
              editable={!isSaving}
            />
            <FormInput
              testID="admin-client-edit-last-name-input"
              label="Apellido"
              value={form.lastName}
              onChangeText={(v) => updateField("lastName", v)}
              autoCapitalize="words"
              error={errors.lastName}
              editable={!isSaving}
            />
            <FormInput
              testID="admin-client-edit-identification-input"
              label="Cédula"
              value={form.identificationNumber}
              onChangeText={(v) => updateField("identificationNumber", v)}
              keyboardType="number-pad"
              error={errors.identificationNumber}
              editable={!isSaving}
            />
            <FormInput
              testID="admin-client-edit-phone-input"
              label="Teléfono"
              value={form.phone}
              onChangeText={(v) => updateField("phone", v)}
              keyboardType="phone-pad"
              error={errors.phone}
              editable={!isSaving}
            />
            <FormInput
              testID="admin-client-edit-email-input"
              label="Correo"
              value={form.email}
              onChangeText={(v) => updateField("email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
              editable={!isSaving}
            />
          </View>
        </View>
      )}
    </MobileWorkspaceShell>
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
  banner: {
    borderRadius: mobileTheme.radius.lg,
    padding: designTokens.spacing.md,
  },
  errorBanner: {
    backgroundColor: mobileTheme.colors.surface.danger,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.danger,
  },
  successBanner: {
    backgroundColor: mobileTheme.colors.surface.success,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.success,
  },
  errorText: {
    color: mobileTheme.colors.ink.danger,
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "700",
  },
  successText: {
    color: mobileTheme.colors.status.successText,
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "700",
  },
  formCard: {
    ...mobileSurfaceCard,
    padding: designTokens.spacing.lg,
    gap: designTokens.spacing.md,
  },
});
