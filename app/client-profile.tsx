import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { FormInput } from "@/src/components/form";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import { getClientProfile, updateClientProfile } from "@/src/services/clientProfileService";
import type { UpdateClientProfileDto } from "@/src/types/client";
import { clientTestIds } from "@/src/testing/testIds";
import {
  getExactDigitsFieldError,
  getTextOnlyFieldError,
  sanitizeDigitsOnlyInput,
  sanitizeTextOnlyInput,
} from "@/src/utils/identityValidation";
import { hapticFeedback } from "@/src/utils/haptics";

export default function ClientProfileScreen() {
  const { isAuthenticated, isReady, roles } = useAuth();
  const [documentType, setDocumentType] = useState<"cedula" | "passport">("cedula");
  const [form, setForm] = useState<UpdateClientProfileDto>({
    name: "",
    lastName: "",
    identificationNumber: null,
    passportNumber: null,
    phone: "",
    preferredAddress: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!roles.includes("CLIENT")) {
      router.replace("/account");
    }
  }, [isAuthenticated, isReady, roles]);

  useEffect(() => {
    if (!isAuthenticated || !roles.includes("CLIENT")) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    void getClientProfile()
      .then((profile) => {
        if (cancelled) return;
        setDocumentType(profile.passportNumber ? "passport" : "cedula");
        setForm({
          name: profile.name ?? "",
          lastName: profile.lastName ?? "",
          identificationNumber: profile.identificationNumber ?? null,
          passportNumber: profile.passportNumber ?? null,
          phone: profile.phone ?? "",
          preferredAddress: profile.preferredAddress ?? "",
          emergencyContactName: profile.emergencyContactName ?? "",
          emergencyContactPhone: profile.emergencyContactPhone ?? "",
        });
      })
      .catch((nextError: unknown) => {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : "No fue posible cargar tu perfil.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, roles]);

  const errors = {
    name: getTextOnlyFieldError(form.name, "Nombre"),
    lastName: getTextOnlyFieldError(form.lastName, "Apellido"),
    identificationNumber: documentType === "cedula" ? getExactDigitsFieldError(form.identificationNumber ?? "", "Cédula", 11) : "",
    passportNumber: documentType === "passport" ? (!form.passportNumber?.trim() ? "El pasaporte es obligatorio" : form.passportNumber.trim().length > 9 ? "El pasaporte no puede tener más de 9 dígitos" : "") : "",
    phone: getExactDigitsFieldError(form.phone, "Teléfono", 10),
    emergencyContactName: getTextOnlyFieldError(form.emergencyContactName ?? "", "Contacto de emergencia", false),
    emergencyContactPhone: getExactDigitsFieldError(form.emergencyContactPhone ?? "", "Teléfono de emergencia", 10, false),
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const saveProfile = async () => {
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
      const updated = await updateClientProfile({
        ...form,
        identificationNumber: documentType === "cedula" ? form.identificationNumber?.trim() ?? null : null,
        passportNumber: documentType === "passport" ? form.passportNumber?.trim() ?? null : null,
        preferredAddress: form.preferredAddress?.trim() || null,
        emergencyContactName: form.emergencyContactName?.trim() || null,
        emergencyContactPhone: form.emergencyContactPhone?.trim() || null,
      });
      setForm({
        name: updated.name ?? "",
        lastName: updated.lastName ?? "",
        identificationNumber: updated.identificationNumber ?? null,
        passportNumber: updated.passportNumber ?? null,
        phone: updated.phone ?? "",
        preferredAddress: updated.preferredAddress ?? "",
        emergencyContactName: updated.emergencyContactName ?? "",
        emergencyContactPhone: updated.emergencyContactPhone ?? "",
      });
      setIsEditing(false);
      setSuccess("Perfil actualizado.");
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
      title="Mi perfil"
      description="Mantén tus datos listos para solicitar cuidado sin repetir información."
      testID={clientTestIds.profile.screen}
      nativeID={clientTestIds.profile.screen}
      primaryReturnLabel="Volver"
      onPrimaryReturn={() => router.back()}
      systemActions={[
        isEditing
          ? {
              label: isSaving ? "Guardando..." : "Guardar",
              onPress: saveProfile,
              variant: "primary",
              disabled: isSaving,
              testID: clientTestIds.profile.saveButton,
            }
          : {
              label: "Editar",
              onPress: () => {
                hapticFeedback.selection();
                setIsEditing(true);
                setSuccess(null);
              },
              variant: "primary",
              testID: clientTestIds.profile.editButton,
            },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={designTokens.color.ink.accentStrong} accessibilityLabel="Cargando..." />
            <Text style={styles.stateText}>Cargando tu perfil...</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
            {success ? <Text style={styles.successBanner}>{success}</Text> : null}

            <FormInput
              testID={clientTestIds.profile.nameInput}
              label="Nombre"
              value={form.name}
              editable={isEditing && !isSaving}
              error={isEditing ? errors.name : ""}
              onChangeText={(value) => setForm((prev) => ({ ...prev, name: sanitizeTextOnlyInput(value) }))}
            />
            <FormInput
              testID={clientTestIds.profile.lastNameInput}
              label="Apellido"
              value={form.lastName}
              editable={isEditing && !isSaving}
              error={isEditing ? errors.lastName : ""}
              onChangeText={(value) => setForm((prev) => ({ ...prev, lastName: sanitizeTextOnlyInput(value) }))}
            />
            <Text style={styles.docLabel}>Documento de identidad</Text>
            <View style={styles.docToggleRow}>
              <Pressable
                style={[styles.docChip, documentType === "cedula" ? styles.docChipActive : undefined]}
                onPress={() => { setDocumentType("cedula"); setForm((prev) => ({ ...prev, passportNumber: null })); }}
                disabled={!isEditing}
                accessibilityRole="button"
                accessibilityLabel="Cédula de identidad"
                accessibilityState={{ selected: documentType === "cedula", disabled: !isEditing }}
                testID="client-profile-document-type-cedula"
              >
                <Text style={[styles.docChipText, documentType === "cedula" ? styles.docChipTextActive : undefined]}>Cédula</Text>
              </Pressable>
              <Pressable
                style={[styles.docChip, documentType === "passport" ? styles.docChipActive : undefined]}
                onPress={() => { setDocumentType("passport"); setForm((prev) => ({ ...prev, identificationNumber: null })); }}
                disabled={!isEditing}
                accessibilityRole="button"
                accessibilityLabel="Pasaporte"
                accessibilityState={{ selected: documentType === "passport", disabled: !isEditing }}
                testID="client-profile-document-type-passport"
              >
                <Text style={[styles.docChipText, documentType === "passport" ? styles.docChipTextActive : undefined]}>Pasaporte</Text>
              </Pressable>
            </View>
            {documentType === "cedula" ? (
              <FormInput
                testID={clientTestIds.profile.identificationInput}
                label="Cédula"
                value={form.identificationNumber ?? ""}
                editable={isEditing && !isSaving}
                keyboardType="number-pad"
                error={isEditing ? errors.identificationNumber : ""}
                onChangeText={(value) => setForm((prev) => ({ ...prev, identificationNumber: sanitizeDigitsOnlyInput(value, 11) }))}
              />
            ) : (
              <FormInput
                testID="client-profile-passport-input"
                label="Pasaporte"
                value={form.passportNumber ?? ""}
                editable={isEditing && !isSaving}
                keyboardType="number-pad"
                maxLength={9}
                error={isEditing ? errors.passportNumber : ""}
                onChangeText={(value) => setForm((prev) => ({ ...prev, passportNumber: sanitizeDigitsOnlyInput(value, 9) }))}
              />
            )}
            <FormInput
              testID={clientTestIds.profile.phoneInput}
              label="Teléfono"
              value={form.phone}
              editable={isEditing && !isSaving}
              keyboardType="phone-pad"
              error={isEditing ? errors.phone : ""}
              onChangeText={(value) => setForm((prev) => ({ ...prev, phone: sanitizeDigitsOnlyInput(value, 10) }))}
            />
            <FormInput
              testID={clientTestIds.profile.addressInput}
              label="Dirección frecuente"
              value={form.preferredAddress ?? ""}
              editable={isEditing && !isSaving}
              onChangeText={(value) => setForm((prev) => ({ ...prev, preferredAddress: value }))}
              multiline
            />
            <FormInput
              testID={clientTestIds.profile.emergencyNameInput}
              label="Contacto de emergencia"
              value={form.emergencyContactName ?? ""}
              editable={isEditing && !isSaving}
              error={isEditing ? errors.emergencyContactName : ""}
              onChangeText={(value) => setForm((prev) => ({ ...prev, emergencyContactName: sanitizeTextOnlyInput(value) }))}
            />
            <FormInput
              testID={clientTestIds.profile.emergencyPhoneInput}
              label="Teléfono de emergencia"
              value={form.emergencyContactPhone ?? ""}
              editable={isEditing && !isSaving}
              keyboardType="phone-pad"
              error={isEditing ? errors.emergencyContactPhone : ""}
              onChangeText={(value) => setForm((prev) => ({ ...prev, emergencyContactPhone: sanitizeDigitsOnlyInput(value, 10) }))}
            />

            {isEditing ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar edicion"
                onPress={() => {
                  hapticFeedback.selection();
                  setIsEditing(false);
                  setError(null);
                }}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
              >
                <Text style={styles.cancelButtonText}>Cancelar edición</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: designTokens.spacing.xxl },
  card: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.lg,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    padding: designTokens.spacing.lg,
  },
  stateCard: {
    alignItems: "center",
    gap: designTokens.spacing.sm,
    padding: designTokens.spacing.xxl,
  },
  stateText: {
    color: designTokens.color.ink.secondary,
    fontWeight: "700",
  },
  errorBanner: {
    color: designTokens.color.status.dangerText,
    backgroundColor: designTokens.color.surface.danger,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.md,
    fontWeight: "700",
  },
  successBanner: {
    color: designTokens.color.status.successText,
    backgroundColor: designTokens.color.surface.success,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.md,
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
  docLabel: {
    color: designTokens.color.ink.secondary,
    fontWeight: "700" as const,
    fontSize: designTokens.typography.label.fontSize,
    marginBottom: designTokens.spacing.xs,
  },
  docToggleRow: {
    flexDirection: "row",
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.sm,
  },
  docChip: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.radius.pill,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    backgroundColor: designTokens.color.surface.secondary,
    minHeight: 36,
    justifyContent: "center" as const,
  },
  docChipActive: {
    borderColor: designTokens.color.ink.accent,
    backgroundColor: designTokens.color.ink.accent,
  },
  docChipText: {
    color: designTokens.color.ink.secondary,
    fontWeight: "700" as const,
    fontSize: 14,
  },
  docChipTextActive: {
    color: designTokens.color.ink.inverse,
  },
});
