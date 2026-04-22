import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth, UserProfileType } from "@/src/context/AuthContext";
import { validateEmail, validatePassword } from "@/src/api/auth";
import {
  getExactDigitsFieldError,
  getOptionalDigitsFieldError,
  getRejectedDigitsOnlyInputError,
  getRejectedTextOnlyInputError,
  getTextOnlyFieldError,
  sanitizeDigitsOnlyInput,
  sanitizeTextOnlyInput,
} from "@/src/utils/identityValidation";
import { getNurseProfileOptions } from "@/src/services/catalogOptionsService";
import type { CatalogCodeNameOption } from "@/src/types/catalog";
import { hapticFeedback } from "@/src/utils/haptics";
import { authTestIds } from "@/src/testing/authTestIds";
import { FormButton, FormInput } from "@/src/components/form";
import { designTokens } from "@/src/design-system/tokens";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import { testProps } from "@/src/testing/testIds";

const clientProfileCopy =
  "Perfil de cliente seleccionado. No hay campos adicionales por completar en esta etapa y el acceso operativo queda disponible cuando termine el registro.";

const nurseProfileCopy =
  "Perfil de enfermeria seleccionado. Podras iniciar sesion al terminar el registro, pero el panel quedara en revision administrativa hasta que completen tu perfil.";

enum RegisterStep {
  IDENTITY = 0,
  ROLE = 1,
  CREDENTIALS = 2,
  NURSE_DETAILS = 3,
}

export default function RegisterScreen() {
  const router = useRouter();
  const {
    register,
    completeProfile,
    isLoading,
    email: authEmail,
    isAuthenticated,
    requiresProfileCompletion,
  } = useAuth();

  const isProfileCompletionMode = isAuthenticated && requiresProfileCompletion;

  // Form state
  const [step, setStep] = useState<RegisterStep>(RegisterStep.IDENTITY);
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [identificationNumber, setIdentificationNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileType, setProfileType] = useState<UserProfileType>(UserProfileType.CLIENT);
  const [hireDate, setHireDate] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [licenseId, setLicenseId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const isNurseRegistration = !isProfileCompletionMode && profileType === UserProfileType.NURSE;
  const effectiveEmail = isProfileCompletionMode ? authEmail ?? "" : email;

  // Validation errors
  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [identificationNumberError, setIdentificationNumberError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [hireDateError, setHireDateError] = useState("");
  const [specialtyError, setSpecialtyError] = useState("");
  const [licenseIdError, setLicenseIdError] = useState("");
  const [bankNameError, setBankNameError] = useState("");
  const [accountNumberError, setAccountNumberError] = useState("");
  const [specialtyOptions, setSpecialtyOptions] = useState<CatalogCodeNameOption[]>([]);
  const [generalError, setGeneralError] = useState("");

  useEffect(() => {
    void getNurseProfileOptions()
      .then((response) => setSpecialtyOptions(response.specialties))
      .catch(() => setSpecialtyOptions([]));
  }, []);

  const getEmailError = (value: string) => {
    if (!value) return "El correo es obligatorio";
    if (!validateEmail(value)) return "El formato del correo no es valido";
    return "";
  };

  const getPasswordError = (value: string) => {
    if (!value) return "La contrasena es obligatoria";
    const validation = validatePassword(value);
    return validation.isValid ? "" : validation.message;
  };

  const getConfirmPasswordError = (value: string) => {
    if (!value) return "Confirma tu contrasena";
    if (value !== password) return "Las contrasenas no coinciden";
    return "";
  };

  const validateIdentity = () => {
    const nextNameError = getTextOnlyFieldError(name, "El nombre");
    const nextLastNameError = getTextOnlyFieldError(lastName, "El apellido");
    const nextIdentificationNumberError = getExactDigitsFieldError(identificationNumber, "La cedula", 11);
    const nextPhoneError = getExactDigitsFieldError(phone, "El telefono", 10);

    setNameError(nextNameError);
    setLastNameError(nextLastNameError);
    setIdentificationNumberError(nextIdentificationNumberError);
    setPhoneError(nextPhoneError);

    return !(nextNameError || nextLastNameError || nextIdentificationNumberError || nextPhoneError);
  };

  const validateCredentials = () => {
    const nextEmailError = getEmailError(effectiveEmail);
    const nextPasswordError = getPasswordError(password);
    const nextConfirmPasswordError = getConfirmPasswordError(confirmPassword);

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setConfirmPasswordError(nextConfirmPasswordError);

    return !(nextEmailError || nextPasswordError || nextConfirmPasswordError);
  };

  const validateNurseDetails = () => {
    const nextHireDateError = !hireDate.trim() ? "La fecha de contratacion es obligatoria" : "";
    const nextSpecialtyError = !specialty.trim() ? "La especialidad es obligatoria" : "";
    const nextLicenseIdError = getOptionalDigitsFieldError(licenseId, "La licencia");
    const nextBankNameError = getTextOnlyFieldError(bankName, "El banco");
    const nextAccountNumberError = getOptionalDigitsFieldError(accountNumber, "El numero de cuenta");

    setHireDateError(nextHireDateError);
    setSpecialtyError(nextSpecialtyError);
    setLicenseIdError(nextLicenseIdError);
    setBankNameError(nextBankNameError);
    setAccountNumberError(nextAccountNumberError);

    return !(nextHireDateError || nextSpecialtyError || nextLicenseIdError || nextBankNameError || nextAccountNumberError);
  };

  const handleNext = () => {
    hapticFeedback.selection();
    setGeneralError("");

    if (step === RegisterStep.IDENTITY) {
      if (validateIdentity()) {
        if (isProfileCompletionMode) {
          void handleSubmit();
        } else {
          setStep(RegisterStep.ROLE);
        }
      } else {
        hapticFeedback.error();
      }
    } else if (step === RegisterStep.ROLE) {
      setStep(RegisterStep.CREDENTIALS);
    } else if (step === RegisterStep.CREDENTIALS) {
      if (validateCredentials()) {
        if (profileType === UserProfileType.NURSE) {
          setStep(RegisterStep.NURSE_DETAILS);
        } else {
          void handleSubmit();
        }
      } else {
        hapticFeedback.error();
      }
    } else if (step === RegisterStep.NURSE_DETAILS) {
      if (validateNurseDetails()) {
        void handleSubmit();
      } else {
        hapticFeedback.error();
      }
    }
  };

  const handleBack = () => {
    hapticFeedback.selection();
    if (step === RegisterStep.NURSE_DETAILS) {
      setStep(RegisterStep.CREDENTIALS);
    } else if (step === RegisterStep.CREDENTIALS) {
      setStep(RegisterStep.ROLE);
    } else if (step === RegisterStep.ROLE) {
      setStep(RegisterStep.IDENTITY);
    }
  };

  const handleSubmit = async () => {
    try {
      if (isProfileCompletionMode) {
        await completeProfile(name.trim(), lastName.trim(), identificationNumber.trim(), phone.trim());
        router.replace("/");
      } else {
        await register(
          name.trim(),
          lastName.trim(),
          identificationNumber.trim(),
          phone.trim(),
          effectiveEmail.trim(),
          password,
          confirmPassword,
          isNurseRegistration ? hireDate.trim() : null,
          isNurseRegistration ? specialty.trim() : null,
          isNurseRegistration ? licenseId.trim() || null : null,
          isNurseRegistration ? bankName.trim() : null,
          isNurseRegistration ? accountNumber.trim() || null : null,
          profileType
        );
        router.replace("/");
      }
    } catch (error) {
      hapticFeedback.error();
      setGeneralError(error instanceof Error ? error.message : "No fue posible completar el registro");
    }
  };

  const renderIdentityStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Información Personal</Text>
      <Text style={styles.stepSubtitle}>Cuéntanos un poco sobre ti</Text>

      <FormInput
        testID={authTestIds.register.nameInput}
        label="Nombre"
        placeholder="Tu nombre"
        value={name}
        onChangeText={(val) => setName(sanitizeTextOnlyInput(val))}
        error={nameError}
      />

      <FormInput
        testID={authTestIds.register.lastNameInput}
        label="Apellido"
        placeholder="Tu apellido"
        value={lastName}
        onChangeText={(val) => setLastName(sanitizeTextOnlyInput(val))}
        error={lastNameError}
      />

      <FormInput
        testID={authTestIds.register.identificationInput}
        label="Cédula"
        placeholder="00112345678"
        value={identificationNumber}
        onChangeText={(val) => setIdentificationNumber(sanitizeDigitsOnlyInput(val, 11))}
        error={identificationNumberError}
        keyboardType="number-pad"
        maxLength={11}
      />

      <FormInput
        testID={authTestIds.register.phoneInput}
        label="Teléfono"
        placeholder="8095550101"
        value={phone}
        onChangeText={(val) => setPhone(sanitizeDigitsOnlyInput(val, 10))}
        error={phoneError}
        keyboardType="number-pad"
        maxLength={10}
      />
    </View>
  );

  const renderRoleStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Tipo de Perfil</Text>
      <Text style={styles.stepSubtitle}>¿Cómo usarás Nursing Care?</Text>

      <TouchableOpacity
        style={[
          styles.roleCard,
          profileType === UserProfileType.CLIENT ? styles.roleCardActive : null,
        ]}
        onPress={() => {
          hapticFeedback.selection();
          setProfileType(UserProfileType.CLIENT);
        }}
        {...testProps(authTestIds.register.profileTypeClientRadio)}
      >
        <View style={styles.roleCardHeader}>
          <Text style={styles.roleCardTitle}>Cliente</Text>
          <View style={[
            styles.radioCircle,
            profileType === UserProfileType.CLIENT ? styles.radioCircleActive : null
          ]} />
        </View>
        <Text style={styles.roleCardText}>{clientProfileCopy}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.roleCard,
          profileType === UserProfileType.NURSE ? styles.roleCardActive : null,
        ]}
        onPress={() => {
          hapticFeedback.selection();
          setProfileType(UserProfileType.NURSE);
        }}
        {...testProps(authTestIds.register.profileTypeNurseRadio)}
      >
        <View style={styles.roleCardHeader}>
          <Text style={styles.roleCardTitle}>Enfermería</Text>
          <View style={[
            styles.radioCircle,
            profileType === UserProfileType.NURSE ? styles.radioCircleActive : null
          ]} />
        </View>
        <Text style={styles.roleCardText}>{nurseProfileCopy}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCredentialsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Acceso</Text>
      <Text style={styles.stepSubtitle}>Configura tu correo y contraseña</Text>

      <FormInput
        testID={authTestIds.register.emailInput}
        label="Correo Electrónico"
        placeholder="tu@correo.com"
        value={email}
        onChangeText={setEmail}
        error={emailError}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <FormInput
        testID={authTestIds.register.passwordInput}
        label="Contraseña"
        placeholder="Mínimo 6 caracteres"
        value={password}
        onChangeText={setPassword}
        error={passwordError}
        secureTextEntry
      />

      <FormInput
        testID={authTestIds.register.confirmPasswordInput}
        label="Confirmar Contraseña"
        placeholder="Vuelve a escribir tu contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={confirmPasswordError}
        secureTextEntry
      />
    </View>
  );

  const renderNurseDetailsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Datos Profesionales</Text>
      <Text style={styles.stepSubtitle}>Información para validación administrativa</Text>

      <FormInput
        testID={authTestIds.register.hireDateInput}
        label="Fecha de Contratación"
        placeholder="AAAA-MM-DD"
        value={hireDate}
        onChangeText={setHireDate}
        error={hireDateError}
      />

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Especialidad</Text>
        <View style={styles.chipGroup}>
          {specialtyOptions.map((opt) => (
            <TouchableOpacity
              key={opt.code}
              style={[
                styles.chip,
                specialty === opt.code ? styles.chipActive : null,
              ]}
              onPress={() => {
                hapticFeedback.selection();
                setSpecialty(opt.code);
              }}
            >
              <Text style={[
                styles.chipText,
                specialty === opt.code ? styles.chipTextActive : null,
              ]}>{opt.displayName}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {specialtyError ? <Text style={styles.fieldError}>{specialtyError}</Text> : null}
      </View>

      <FormInput
        testID="register-license-input"
        label="Licencia"
        placeholder="Opcional"
        value={licenseId}
        onChangeText={(val) => setLicenseId(sanitizeDigitsOnlyInput(val))}
        error={licenseIdError}
        keyboardType="number-pad"
      />

      <FormInput
        testID="register-bank-name-input"
        label="Banco"
        placeholder="Nombre del banco"
        value={bankName}
        onChangeText={(val) => setBankName(sanitizeTextOnlyInput(val))}
        error={bankNameError}
      />

      <FormInput
        testID="register-account-number-input"
        label="Número de Cuenta"
        placeholder="Opcional"
        value={accountNumber}
        onChangeText={(val) => setAccountNumber(sanitizeDigitsOnlyInput(val))}
        error={accountNumberError}
        keyboardType="number-pad"
      />
    </View>
  );

  const renderStepContent = () => {
    switch (step) {
      case RegisterStep.IDENTITY: return renderIdentityStep();
      case RegisterStep.ROLE: return renderRoleStep();
      case RegisterStep.CREDENTIALS: return renderCredentialsStep();
      case RegisterStep.NURSE_DETAILS: return renderNurseDetailsStep();
    }
  };

  const getStepProgress = () => {
    const total = isNurseRegistration ? 4 : 3;
    const current = step + 1;
    return (current / total) * 100;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${getStepProgress()}%` }]} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {isProfileCompletionMode ? "Completar Perfil" : "Nueva Cuenta"}
            </Text>
          </View>

          {generalError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            {renderStepContent()}
          </View>

          <View style={styles.actions}>
            {step > RegisterStep.IDENTITY ? (
              <FormButton
                testID="register-back-button"
                variant="secondary"
                onPress={handleBack}
                style={styles.backButton}
              >
                Anterior
              </FormButton>
            ) : null}

            <FormButton
              testID={authTestIds.register.submitButton}
              onPress={handleNext}
              isLoading={isLoading}
              style={styles.nextButton}
            >
              {step === (isNurseRegistration ? RegisterStep.NURSE_DETAILS : RegisterStep.CREDENTIALS) 
                ? (isProfileCompletionMode ? "Completar" : "Registrarse")
                : "Siguiente"}
            </FormButton>
          </View>

          {step === RegisterStep.IDENTITY && !isProfileCompletionMode ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
              <TouchableOpacity onPress={() => router.push("/login")}>
                <Text style={styles.loginLink}>Inicia Sesión</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.color.surface.canvas,
  },
  flex: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: designTokens.color.border.subtle,
    width: "100%",
  },
  progressFill: {
    height: "100%",
    backgroundColor: designTokens.color.ink.accent,
  },
  scrollContent: {
    padding: designTokens.spacing.xl,
  },
  header: {
    marginBottom: designTokens.spacing.xl,
  },
  title: {
    ...designTokens.typography.title,
    color: designTokens.color.ink.primary,
  },
  card: {
    ...mobileSurfaceCard,
    padding: designTokens.spacing.xl,
    marginBottom: designTokens.spacing.xl,
  },
  stepContainer: {
    width: "100%",
  },
  stepTitle: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.xs,
  },
  stepSubtitle: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.secondary,
    marginBottom: designTokens.spacing.xl,
  },
  roleCard: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.lg,
    borderWidth: 2,
    borderColor: designTokens.color.border.strong,
    marginBottom: designTokens.spacing.lg,
  },
  roleCardActive: {
    borderColor: designTokens.color.ink.accent,
    backgroundColor: designTokens.color.surface.accent,
  },
  roleCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: designTokens.spacing.sm,
  },
  roleCardTitle: {
    ...designTokens.typography.label,
    fontSize: 16,
    color: designTokens.color.ink.primary,
  },
  roleCardText: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.secondary,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: designTokens.color.border.strong,
  },
  radioCircleActive: {
    borderColor: designTokens.color.ink.accent,
    backgroundColor: designTokens.color.ink.accent,
  },
  actions: {
    flexDirection: "row",
    gap: designTokens.spacing.md,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: designTokens.spacing.xxl,
  },
  footerText: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.secondary,
  },
  loginLink: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.accent,
    fontWeight: "800",
    marginLeft: designTokens.spacing.xs,
  },
  errorBanner: {
    backgroundColor: designTokens.color.status.dangerBg,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.radius.md,
    marginBottom: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: designTokens.color.border.danger,
  },
  errorBannerText: {
    ...designTokens.typography.body,
    color: designTokens.color.status.dangerText,
    fontWeight: "600",
    textAlign: "center",
  },
  fieldGroup: {
    marginBottom: designTokens.spacing.lg,
  },
  fieldLabel: {
    ...designTokens.typography.label,
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.sm,
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designTokens.spacing.sm,
  },
  chip: {
    backgroundColor: designTokens.color.surface.secondary,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.radius.pill,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
  },
  chipActive: {
    backgroundColor: designTokens.color.ink.accent,
    borderColor: designTokens.color.ink.accent,
  },
  chipText: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.secondary,
    fontWeight: "600",
  },
  chipTextActive: {
    color: designTokens.color.ink.inverse,
  },
  fieldError: {
    ...designTokens.typography.body,
    fontSize: 12,
    color: designTokens.color.ink.danger,
    marginTop: designTokens.spacing.xs,
    fontWeight: "600",
  },
});
