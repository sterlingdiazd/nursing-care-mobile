import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { Banner } from "@/src/components/shared/Banner";
import { FormInput } from "@/src/components/form";
import { FormPanel } from "@/src/components/shared/FormPanel";
import { useAuth } from "@/src/context/AuthContext";
import { mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";
import {
  AdminUserDetailDto,
  getAdminUserDetail,
  updateAdminUser,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";
import { automationProps } from "@/src/utils/adminOperationalUx";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { formatRoleLabels } from "@/src/utils/roleLabels";
import { formatDateES } from "@/src/utils/spanishTextValidator";

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

function detailToForm(detail: AdminUserDetailDto): FormState {
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
  if (!form.identificationNumber.trim()) {
    errors.identificationNumber = "La cédula es obligatoria.";
  }
  if (!form.phone.trim()) errors.phone = "El teléfono es obligatorio.";
  if (!form.email.trim()) {
    errors.email = "El correo es obligatorio.";
  } else if (!isEmail(form.email)) {
    errors.email = "Correo no válido.";
  }
  return errors;
}

export default function AdminProfileScreen() {
  const { userId, isReady, isAuthenticated } = useAuth();
  const [detail, setDetail] = useState<AdminUserDetailDto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [originalForm, setOriginalForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login" as any);
    }
  }, [isReady, isAuthenticated]);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    if (!userId) {
      setIsFetching(false);
      setServerError("No se pudo identificar el usuario actual.");
      return;
    }
    if (fetchedRef.current === userId) return;
    fetchedRef.current = userId;

    let cancelled = false;
    setIsFetching(true);
    setServerError(null);
    getAdminUserDetail(userId)
      .then((dto) => {
        if (cancelled) return;
        setDetail(dto);
        const next = detailToForm(dto);
        setForm(next);
        setOriginalForm(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "No se pudo cargar el perfil.";
        setServerError(message);
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isReady, isAuthenticated, userId]);

  const isDirty = useMemo(() => {
    return (
      form.name !== originalForm.name ||
      form.lastName !== originalForm.lastName ||
      form.identificationNumber !== originalForm.identificationNumber ||
      form.phone !== originalForm.phone ||
      form.email !== originalForm.email
    );
  }, [form, originalForm]);

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
    if (!userId) return;
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
      const updated = await updateAdminUser(userId, {
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
      setSuccessMessage("Perfil actualizado correctamente.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el perfil.";
      setServerError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MobileWorkspaceShell
      title="Mi Perfil"
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      primaryReturnLabel="Volver"
      testID={adminTestIds.profile.screen}
      nativeID={adminTestIds.profile.screen}
      workflowActions={[
        {
          label: "Descartar",
          onPress: handleDiscard,
          variant: "secondary",
          disabled: !isDirty || isSaving,
          testID: adminTestIds.profile.cancelButton,
        },
        {
          label: isSaving ? "Guardando…" : "Guardar",
          onPress: () => void handleSave(),
          variant: "primary",
          disabled: !isDirty || isSaving,
          testID: adminTestIds.profile.saveButton,
        },
      ]}
    >
      {isFetching ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator
            {...automationProps(adminTestIds.profile.loadingIndicator)}
            color={mobileTheme.colors.ink.accent}
          />
        </View>
      ) : (
        <View style={styles.container}>
          <Banner
            tone="error"
            message={serverError}
            testID={adminTestIds.profile.errorBanner}
          />

          <Banner
            tone="success"
            message={successMessage}
            testID={adminTestIds.profile.successBanner}
          />

          {detail ? (
            <View style={styles.metaCard}>
              {detail.roleNames.length > 0 ? (
                <Text style={styles.metaLine}>
                  Rol: <Text style={styles.metaValue}>{formatRoleLabels(detail.roleNames)}</Text>
                </Text>
              ) : null}
              <Text style={styles.metaLine}>
                Estado:{" "}
                <Text style={styles.metaValue}>{detail.isActive ? "Activo" : "Inactivo"}</Text>
              </Text>
              <Text style={styles.metaLine}>
                Creado: <Text style={styles.metaValue}>{formatDateES(detail.createdAtUtc)}</Text>
              </Text>
            </View>
          ) : null}

          <FormPanel
            eyebrow="Datos personales"
            testID="profile-personal-panel"
          >
            <FormInput
              testID={adminTestIds.profile.nameInput}
              label="Nombre"
              value={form.name}
              onChangeText={(v) => updateField("name", v)}
              autoCapitalize="words"
              error={errors.name}
              editable={!isSaving}
            />
            <FormInput
              testID={adminTestIds.profile.lastNameInput}
              label="Apellido"
              value={form.lastName}
              onChangeText={(v) => updateField("lastName", v)}
              autoCapitalize="words"
              error={errors.lastName}
              editable={!isSaving}
            />
            <FormInput
              testID={adminTestIds.profile.identificationInput}
              label="Cédula"
              value={form.identificationNumber}
              onChangeText={(v) => updateField("identificationNumber", v)}
              keyboardType="number-pad"
              error={errors.identificationNumber}
              editable={!isSaving}
            />
            <FormInput
              testID={adminTestIds.profile.phoneInput}
              label="Teléfono"
              value={form.phone}
              onChangeText={(v) => updateField("phone", v)}
              keyboardType="phone-pad"
              error={errors.phone}
              editable={!isSaving}
            />
            <FormInput
              testID={adminTestIds.profile.emailInput}
              label="Correo"
              value={form.email}
              onChangeText={(v) => updateField("email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
              editable={!isSaving}
            />
          </FormPanel>
        </View>
      )}
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    gap: 14,
    paddingBottom: 24,
  },
  metaCard: {
    ...mobileSurfaceCard,
    padding: 12,
    gap: 4,
  },
  metaLine: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 13,
  },
  metaValue: {
    color: mobileTheme.colors.ink.primary,
    fontWeight: "800",
  },
});
