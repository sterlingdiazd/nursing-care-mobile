import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { hapticFeedback } from "@/src/utils/haptics";
import { authTestIds } from "@/src/testing/authTestIds";
import { FormButton, FormInput, DateField } from "@/src/components/form";
import { designTokens } from "@/src/design-system/tokens";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import { BankSelector } from "@/components/BankSelector";
import { Banner } from "@/src/components/shared/Banner";
import { testProps } from "@/src/testing/testIds";

const clientProfileCopy =
  "Perfil de cliente seleccionado. No hay campos adicionales por completar en esta etapa y el acceso operativo queda disponible cuando termine el registro.";

const nurseProfileCopy =
  "Perfil de enfermería seleccionado. Podrás iniciar sesión al terminar el registro, pero el panel quedará en revisión administrativa hasta que completen tu perfil.";

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
  const [documentType, setDocumentType] = useState<"cedula" | "passport">("cedula");
  const [passportNumber, setPassportNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileType, setProfileType] = useState<UserProfileType>(UserProfileType.CLIENT);
  const [hireDate, setHireDate] = useState("");
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
  const [passportError, setPassportError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [hireDateError, setHireDateError] = useState("");
  const [licenseIdError, setLicenseIdError] = useState("");
  const [bankNameError, setBankNameError] = useState("");
  const [accountNumberError, setAccountNumberError] = useState("");
  const [generalError, setGeneralError] = useState("");


  const getEmailError = (value: string) => {
    if (!value) return "El correo es obligatorio";
    if (!validateEmail(value)) return "El formato del correo no es valido";
    return "";
  };

  const getPasswordError = (value: string) => {
    if (!value) return "La contraseña es obligatoria";
    const validation = validatePassword(value);
    return validation.isValid ? "" : validation.message;
  };

  const getConfirmPasswordError = (value: string) => {
    if (!value) return "Confirma tu contraseña";
    if (value !== password) return "Las contraseñas no coinciden";
    return "";
  };

  const validateIdentity = () => {
    const nextNameError = getTextOnlyFieldError(name, "El nombre");
    const nextLastNameError = getTextOnlyFieldError(lastName, "El apellido");
    const nextPhoneError = getExactDigitsFieldError(phone, "El teléfono", 10);

    let nextIdentificationNumberError = "";
    let nextPassportError = "";

    if (documentType === "cedula") {
      nextIdentificationNumberError = getExactDigitsFieldError(identificationNumber, "La cédula", 11);
    } else {
      nextPassportError = !passportNumber.trim()
        ? "El pasaporte es obligatorio"
        : passportNumber.trim().length > 9
        ? "El pasaporte no puede tener más de 9 dígitos"
        : "";
    }

    setNameError(nextNameError);
    setLastNameError(nextLastNameError);
    setIdentificationNumberError(nextIdentificationNumberError);
    setPassportError(nextPassportError);
    setPhoneError(nextPhoneError);

    return !(nextNameError || nextLastNameError || nextIdentificationNumberError || nextPassportError || nextPhoneError);
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
    const nextLicenseIdError = getOptionalDigitsFieldError(licenseId, "La licencia");
    const nextAccountNumberError = getOptionalDigitsFieldError(accountNumber, "El número de cuenta");

    setLicenseIdError(nextLicenseIdError);
    setAccountNumberError(nextAccountNumberError);

    return !(nextLicenseIdError || nextAccountNumberError);
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
          documentType === "cedula" ? identificationNumber.trim() : null,
          documentType === "passport" ? passportNumber.trim() : null,
          phone.trim(),
          effectiveEmail.trim(),
          password,
          confirmPassword,
          isNurseRegistration ? hireDate.trim() : null,
          null,
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
        accessibilityLabel="Nombre"
        label="Nombre"
        placeholder="Tu nombre"
        value={name}
        onChangeText={(val) => setName(sanitizeTextOnlyInput(val))}
        error={nameError}
      />

      <FormInput
        testID={authTestIds.register.lastNameInput}
        accessibilityLabel="Apellido"
        label="Apellido"
        placeholder="Tu apellido"
        value={lastName}
        onChangeText={(val) => setLastName(sanitizeTextOnlyInput(val))}
        error={lastNameError}
      />

      {/* Document type toggle */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Documento de identidad</Text>
        <View style={styles.chipGroup}>
          <TouchableOpacity
            style={[styles.chip, documentType === "cedula" ? styles.chipActive : null]}
            onPress={() => { setDocumentType("cedula"); setPassportNumber(""); setPassportError(""); }}
            accessibilityRole="button"
            accessibilityLabel="Cédula de identidad"
            accessibilityState={{ selected: documentType === "cedula" }}
            testID="register-document-type-cedula"
          >
            <Text style={[styles.chipText, documentType === "cedula" ? styles.chipTextActive : null]}>Cédula</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, documentType === "passport" ? styles.chipActive : null]}
            onPress={() => { setDocumentType("passport"); setIdentificationNumber(""); setIdentificationNumberError(""); }}
            accessibilityRole="button"
            accessibilityLabel="Pasaporte"
            accessibilityState={{ selected: documentType === "passport" }}
            testID="register-document-type-passport"
          >
            <Text style={[styles.chipText, documentType === "passport" ? styles.chipTextActive : null]}>Pasaporte</Text>
          </TouchableOpacity>
        </View>
      </View>

      {documentType === "cedula" ? (
        <FormInput
          testID={authTestIds.register.identificationInput}
          accessibilityLabel="Cédula"
          label="Cédula"
          placeholder="00112345678"
          value={identificationNumber}
          onChangeText={(val) => setIdentificationNumber(sanitizeDigitsOnlyInput(val, 11))}
          error={identificationNumberError}
          keyboardType="number-pad"
          maxLength={11}
        />
      ) : (
        <FormInput
          testID="register-passport-input"
          accessibilityLabel="Pasaporte"
          label="Pasaporte"
          placeholder="Máx. 9 dígitos"
          value={passportNumber}
          onChangeText={(val) => setPassportNumber(sanitizeDigitsOnlyInput(val, 9))}
          error={passportError}
          keyboardType="number-pad"
          maxLength={9}
        />
      )}

      <FormInput
        testID={authTestIds.register.phoneInput}
        accessibilityLabel="Teléfono"
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
        accessibilityRole="radio"
        accessibilityLabel="Perfil cliente"
        accessibilityState={{ selected: profileType === UserProfileType.CLIENT }}
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
        accessibilityRole="radio"
        accessibilityLabel="Perfil enfermería"
        accessibilityState={{ selected: profileType === UserProfileType.NURSE }}
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
        accessibilityLabel="Correo electrónico"
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
        accessibilityLabel="Contraseña"
        label="Contraseña"
        placeholder="Mínimo 6 caracteres"
        value={password}
        onChangeText={setPassword}
        error={passwordError}
        secureTextEntry
      />

      <FormInput
        testID={authTestIds.register.confirmPasswordInput}
        accessibilityLabel="Confirmar contraseña"
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

      <DateField
        testID={authTestIds.register.hireDateInput}
        accessibilityLabel="Fecha de contratación"
        label="Fecha de Contratación"
        value={hireDate}
        onChange={setHireDate}
        errorMessage={hireDateError}
      />

      <FormInput
        testID="register-license-input"
        accessibilityLabel="Número de licencia"
        label="Licencia"
        placeholder="Opcional"
        value={licenseId}
        onChangeText={(val) => setLicenseId(sanitizeDigitsOnlyInput(val))}
        error={licenseIdError}
        keyboardType="number-pad"
      />

      <BankSelector
        testID="register-bank-name-input"
        label="Banco"
        placeholder="Selecciona un banco"
        value={bankName}
        onChange={setBankName}
        errorMessage={bankNameError}
      />

      <FormInput
        testID="register-account-number-input"
        accessibilityLabel="Número de cuenta bancaria"
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
            <View style={styles.bannerSlot}>
              <Banner tone="error" message={generalError} />
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
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.selection();
                  router.push("/login");
                }}
                accessibilityRole="link"
                accessibilityLabel="Inicia sesión"
              >
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
    ...designTokens.typography.bodyStrong,
    color: designTokens.color.ink.primary,
  },
  roleCardText: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.secondary,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: designTokens.radius.pill,
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
  bannerSlot: {
    marginBottom: designTokens.spacing.lg,
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
    ...designTokens.typography.caption,
    color: designTokens.color.ink.danger,
    marginTop: designTokens.spacing.xs,
    fontWeight: "600",
  },
});
