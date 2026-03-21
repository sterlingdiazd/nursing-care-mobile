import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth, UserProfileType } from "@/src/context/AuthContext";
import { validateEmail, validatePassword } from "@/src/api/auth";
import * as Linking from "expo-linking";
import {
  getGoogleOAuthStartUrl,
  getLocalHttpsCertificateWarning,
} from "@/src/services/authService";
import {
  getExactDigitsFieldError,
  getOptionalDigitsFieldError,
  getRejectedDigitsOnlyInputError,
  getRejectedTextOnlyInputError,
  getTextOnlyFieldError,
  sanitizeDigitsOnlyInput,
  sanitizeTextOnlyInput,
} from "@/src/utils/identityValidation";

const nurseSpecialties = [
  "Adult Care",
  "Pediatric Care",
  "Geriatric Care",
  "Critical Care",
  "Home Care",
];

const clientProfileCopy =
  "Perfil de cliente seleccionado. No hay campos adicionales por completar en esta etapa y el acceso operativo queda disponible cuando termine el registro.";

const nurseProfileCopy =
  "Perfil de enfermeria seleccionado. Podras iniciar sesion al terminar el registro, pero el panel quedara en revision administrativa hasta que completen tu perfil.";

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

  // Form state
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [identificationNumber, setIdentificationNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileType, setProfileType] = useState<UserProfileType>(UserProfileType.Client);
  const [hireDate, setHireDate] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [licenseId, setLicenseId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const isProfileCompletionMode = isAuthenticated && requiresProfileCompletion;
  const isNurseRegistration = !isProfileCompletionMode && profileType === UserProfileType.Nurse;
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

  const getEmailError = (value: string) => {
    if (!value) {
      return "El correo es obligatorio";
    }

    if (!validateEmail(value)) {
      return "El formato del correo no es valido";
    }

    return "";
  };

  const getPasswordError = (value: string) => {
    if (!value) {
      return "La contrasena es obligatoria";
    }

    const validation = validatePassword(value);
    return validation.isValid ? "" : validation.message;
  };

  const getConfirmPasswordError = (value: string) => {
    if (!value) {
      return "Confirma tu contrasena";
    }

    if (value !== password) {
      return "Las contrasenas no coinciden";
    }

    return "";
  };

  // Validation functions
  const validateEmailField = (value: string) => {
    setEmailError(getEmailError(value));
  };

  const validatePasswordField = (value: string) => {
    setPasswordError(getPasswordError(value));
  };

  const validateConfirmPasswordField = (value: string) => {
    setConfirmPasswordError(getConfirmPasswordError(value));
  };

  // Handle registration submission
  const handleSubmit = async () => {
    // Validate all fields
    const nextNameError = getTextOnlyFieldError(name, "El nombre");
    const nextLastNameError = getTextOnlyFieldError(lastName, "El apellido");
    const nextIdentificationNumberError = getExactDigitsFieldError(
      identificationNumber,
      "La cedula",
      11
    );
    const nextPhoneError = getExactDigitsFieldError(phone, "El telefono", 10);
    const nextEmailError = getEmailError(effectiveEmail);
    const nextPasswordError = isProfileCompletionMode ? "" : getPasswordError(password);
    const nextConfirmPasswordError = isProfileCompletionMode ? "" : getConfirmPasswordError(confirmPassword);
    const nextHireDateError = isNurseRegistration && !hireDate.trim() ? "La fecha de contratacion es obligatoria" : "";
    const nextSpecialtyError = isNurseRegistration && !specialty.trim() ? "La especialidad es obligatoria" : "";
    const nextLicenseIdError = isNurseRegistration ? getOptionalDigitsFieldError(licenseId, "La licencia") : "";
    const nextBankNameError = isNurseRegistration ? getTextOnlyFieldError(bankName, "El banco") : "";
    const nextAccountNumberError = isNurseRegistration ? getOptionalDigitsFieldError(accountNumber, "El numero de cuenta") : "";

    setNameError(nextNameError);
    setLastNameError(nextLastNameError);
    setIdentificationNumberError(nextIdentificationNumberError);
    setPhoneError(nextPhoneError);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setConfirmPasswordError(nextConfirmPasswordError);
    setHireDateError(nextHireDateError);
    setSpecialtyError(nextSpecialtyError);
    setLicenseIdError(nextLicenseIdError);
    setBankNameError(nextBankNameError);
    setAccountNumberError(nextAccountNumberError);

    if (
      nextNameError ||
      nextLastNameError ||
      nextIdentificationNumberError ||
      nextPhoneError ||
      nextEmailError ||
      nextPasswordError ||
      nextConfirmPasswordError ||
      nextHireDateError ||
      nextSpecialtyError ||
      nextLicenseIdError ||
      nextBankNameError ||
      nextAccountNumberError
    ) {
      Alert.alert("Validacion", "Corrige los errores antes de enviar el formulario.");
      return;
    }

    try {
      if (isProfileCompletionMode) {
        await completeProfile(
          name.trim(),
          lastName.trim(),
          identificationNumber.trim(),
          phone.trim()
        );
        Alert.alert("Registro completado", "Tu cuenta ya esta activa y lista para usar.", [
          {
            text: "Continuar",
            onPress: () => router.replace("/care-requests"),
          },
        ]);
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

        // Show success message based on profile type
        if (profileType === UserProfileType.Nurse) {
          Alert.alert(
            "Registro exitoso",
            "Tu cuenta ya puede iniciar sesion, pero el panel mostrara que administracion debe completar tu perfil de enfermeria antes de habilitar el acceso operativo.",
            [
              {
                text: "Aceptar",
                onPress: () => router.replace("/"),
              },
            ]
          );
        } else {
          Alert.alert(
            "Registro exitoso",
            "Tu cuenta ya entro al espacio autenticado.",
            [
              {
                text: "Continuar",
                onPress: () => router.replace("/"),
              },
            ]
          );
        }
      }

      // Clear form
      setName("");
      setLastName("");
      setIdentificationNumber("");
      setPhone("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setHireDate("");
      setSpecialty("");
      setLicenseId("");
      setBankName("");
      setAccountNumber("");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "No fue posible completar el registro";
      Alert.alert("Error de registro", errorMsg);
    }
  };

  const handleGoogleSignIn = async () => {
    const certificateWarning = getLocalHttpsCertificateWarning();

    if (certificateWarning) {
      Alert.alert("Certificado local requerido", certificateWarning);
    }

    try {
      await Linking.openURL(getGoogleOAuthStartUrl("mobile"));
    } catch (error) {
      Alert.alert(
        "Error con Google",
        error instanceof Error ? error.message : "No fue posible abrir el acceso con Google."
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Title */}
      <Text style={styles.title}>{isProfileCompletionMode ? "Completar registro" : "Crear cuenta"}</Text>

      {/* Email Input */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={[styles.input, nameError ? styles.inputError : null]}
          placeholder="Tu nombre"
          value={name}
          onChangeText={(value) => {
            setName(sanitizeTextOnlyInput(value));
            setNameError(getRejectedTextOnlyInputError(value, "El nombre"));
          }}
          onBlur={() => setNameError(getTextOnlyFieldError(name, "El nombre"))}
          editable={!isLoading}
          placeholderTextColor="#999"
        />
        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Apellido</Text>
        <TextInput
          style={[styles.input, lastNameError ? styles.inputError : null]}
          placeholder="Tu apellido"
          value={lastName}
          onChangeText={(value) => {
            setLastName(sanitizeTextOnlyInput(value));
            setLastNameError(getRejectedTextOnlyInputError(value, "El apellido"));
          }}
          onBlur={() => setLastNameError(getTextOnlyFieldError(lastName, "El apellido"))}
          editable={!isLoading}
          placeholderTextColor="#999"
        />
        {lastNameError ? <Text style={styles.errorText}>{lastNameError}</Text> : null}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Cédula</Text>
        <TextInput
          style={[styles.input, identificationNumberError ? styles.inputError : null]}
          placeholder="00112345678"
          value={identificationNumber}
          onChangeText={(value) => {
            setIdentificationNumber(sanitizeDigitsOnlyInput(value, 11));
            setIdentificationNumberError(getRejectedDigitsOnlyInputError(value, "La cedula", 11));
          }}
          onBlur={() => setIdentificationNumberError(getExactDigitsFieldError(identificationNumber, "La cedula", 11))}
          keyboardType="number-pad"
          maxLength={11}
          editable={!isLoading}
          placeholderTextColor="#999"
        />
        {identificationNumberError ? (
          <Text style={styles.errorText}>{identificationNumberError}</Text>
        ) : null}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Telefono</Text>
        <TextInput
          style={[styles.input, phoneError ? styles.inputError : null]}
          placeholder="8095550101"
          value={phone}
          onChangeText={(value) => {
            setPhone(sanitizeDigitsOnlyInput(value, 10));
            setPhoneError(getRejectedDigitsOnlyInputError(value, "El telefono", 10));
          }}
          onBlur={() => setPhoneError(getExactDigitsFieldError(phone, "El telefono", 10))}
          keyboardType="number-pad"
          maxLength={10}
          editable={!isLoading}
          placeholderTextColor="#999"
        />
        {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Correo</Text>
        <TextInput
          style={[styles.input, emailError ? styles.inputError : null]}
          placeholder="tu@correo.com"
          value={effectiveEmail}
          onChangeText={setEmail}
          onBlur={() => validateEmailField(effectiveEmail)}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading && !isProfileCompletionMode}
          placeholderTextColor="#999"
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
      </View>

      {!isProfileCompletionMode && (
        <>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Contrasena</Text>
            <TextInput
              style={[styles.input, passwordError ? styles.inputError : null]}
              placeholder="Minimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              onBlur={() => validatePasswordField(password)}
              secureTextEntry
              editable={!isLoading}
              placeholderTextColor="#999"
            />
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirmar contrasena</Text>
            <TextInput
              style={[styles.input, confirmPasswordError ? styles.inputError : null]}
              placeholder="Vuelve a escribir tu contrasena"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onBlur={() => validateConfirmPasswordField(confirmPassword)}
              secureTextEntry
              editable={!isLoading}
              placeholderTextColor="#999"
            />
            {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
          </View>
        </>
      )}

      {!isProfileCompletionMode && (
        <View style={styles.formGroup}>
          <Text style={styles.label}>Registrarse como:</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setProfileType(UserProfileType.Client)}
              disabled={isLoading}
            >
              <View
                style={[
                  styles.radioButton,
                  profileType === UserProfileType.Client ? styles.radioButtonSelected : null,
                ]}
              />
              <Text style={styles.radioLabel}>Cliente</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setProfileType(UserProfileType.Nurse)}
              disabled={isLoading}
            >
              <View
                style={[
                  styles.radioButton,
                  profileType === UserProfileType.Nurse ? styles.radioButtonSelected : null,
                ]}
              />
              <Text style={styles.radioLabel}>Enfermeria (requiere completacion administrativa)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!isProfileCompletionMode && (
        <View
          style={[
            styles.profileInfoBox,
            profileType === UserProfileType.Nurse ? styles.nurseInfoBox : styles.clientInfoBox,
          ]}
        >
          <Text style={styles.profileInfoTitle}>
            {profileType === UserProfileType.Nurse ? "Perfil de enfermeria" : "Perfil de cliente"}
          </Text>
          <Text style={styles.profileInfoText}>
            {profileType === UserProfileType.Nurse ? nurseProfileCopy : clientProfileCopy}
          </Text>
        </View>
      )}

      {isNurseRegistration ? (
        <>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>Datos del perfil de enfermeria</Text>
            <Text style={styles.sectionCardCopy}>
              Completa estos datos para que administracion pueda terminar la configuracion del perfil.
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Fecha de contratacion</Text>
            <TextInput
              style={[styles.input, hireDateError ? styles.inputError : null]}
              placeholder="2026-03-21"
              value={hireDate}
              onChangeText={setHireDate}
              editable={!isLoading}
              placeholderTextColor="#999"
            />
            {hireDateError ? <Text style={styles.errorText}>{hireDateError}</Text> : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Especialidad</Text>
            <View style={styles.specialtyList}>
              {nurseSpecialties.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.specialtyChip,
                    specialty === option ? styles.specialtyChipSelected : null,
                  ]}
                  onPress={() => setSpecialty(option)}
                  disabled={isLoading}
                >
                  <Text
                    style={[
                      styles.specialtyChipText,
                      specialty === option ? styles.specialtyChipTextSelected : null,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {specialtyError ? <Text style={styles.errorText}>{specialtyError}</Text> : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Licencia</Text>
            <TextInput
              style={[styles.input, licenseIdError ? styles.inputError : null]}
              placeholder="Opcional"
              value={licenseId}
              onChangeText={(value) => {
                setLicenseId(sanitizeDigitsOnlyInput(value));
                setLicenseIdError(getRejectedDigitsOnlyInputError(value, "La licencia"));
              }}
              onBlur={() => setLicenseIdError(getOptionalDigitsFieldError(licenseId, "La licencia"))}
              keyboardType="number-pad"
              editable={!isLoading}
              placeholderTextColor="#999"
            />
            {licenseIdError ? <Text style={styles.errorText}>{licenseIdError}</Text> : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Banco</Text>
            <TextInput
              style={[styles.input, bankNameError ? styles.inputError : null]}
              placeholder="Banco principal"
              value={bankName}
              onChangeText={(value) => {
                setBankName(sanitizeTextOnlyInput(value));
                setBankNameError(getRejectedTextOnlyInputError(value, "El banco"));
              }}
              onBlur={() => setBankNameError(getTextOnlyFieldError(bankName, "El banco"))}
              editable={!isLoading}
              placeholderTextColor="#999"
            />
            {bankNameError ? <Text style={styles.errorText}>{bankNameError}</Text> : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Numero de cuenta</Text>
            <TextInput
              style={[styles.input, accountNumberError ? styles.inputError : null]}
              placeholder="Opcional"
              value={accountNumber}
              onChangeText={(value) => {
                setAccountNumber(sanitizeDigitsOnlyInput(value));
                setAccountNumberError(getRejectedDigitsOnlyInputError(value, "El numero de cuenta"));
              }}
              onBlur={() => setAccountNumberError(getOptionalDigitsFieldError(accountNumber, "El numero de cuenta"))}
              keyboardType="number-pad"
              editable={!isLoading}
              placeholderTextColor="#999"
            />
            {accountNumberError ? <Text style={styles.errorText}>{accountNumberError}</Text> : null}
          </View>
        </>
      ) : null}

      {/* Info Alert */}
      {!isProfileCompletionMode && profileType === UserProfileType.Nurse ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Despues del registro veras un panel autenticado que indica que administracion debe completar tu perfil antes de habilitar las acciones clinicas.
          </Text>
        </View>
      ) : null}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.button, isLoading ? styles.buttonDisabled : null]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={styles.buttonText}>{isProfileCompletionMode ? "Completar registro" : "Crear cuenta"}</Text>
        )}
      </TouchableOpacity>

      {!isProfileCompletionMode && (
        <>
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.secondaryButton, isLoading ? styles.buttonDisabled : null]}
            onPress={() => {
              void handleGoogleSignIn();
            }}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Continuar con Google</Text>
          </TouchableOpacity>

          <Text style={styles.secondaryHint}>
            Google te llevara a completar este mismo formulario antes de usar la app.
          </Text>
        </>
      )}

      {/* Login Link */}
      {!isProfileCompletionMode && (
        <View style={styles.loginLinkContainer}>
          <Text style={styles.loginLinkText}>¿Ya tienes cuenta? </Text>
          <TouchableOpacity onPress={() => router.push("/login")} disabled={isLoading}>
            <Text style={styles.loginLink}>Inicia sesion</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 30,
    textAlign: "center",
    color: "#000",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#000",
    backgroundColor: "#f9f9f9",
  },
  inputError: {
    borderColor: "#d32f2f",
    backgroundColor: "#ffebee",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 12,
    marginTop: 4,
  },
  radioGroup: {
    marginVertical: 10,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#0066cc",
    marginRight: 12,
  },
  radioButtonSelected: {
    backgroundColor: "#0066cc",
  },
  radioLabel: {
    fontSize: 14,
    color: "#333",
  },
  specialtyList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  specialtyChip: {
    borderWidth: 1,
    borderColor: "#c9d8eb",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f4f7fb",
  },
  specialtyChipSelected: {
    backgroundColor: "#0f4c81",
    borderColor: "#0f4c81",
  },
  specialtyChipText: {
    color: "#24415b",
    fontSize: 13,
    fontWeight: "600",
  },
  specialtyChipTextSelected: {
    color: "#fff",
  },
  profileInfoBox: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  clientInfoBox: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  nurseInfoBox: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  profileInfoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#102a43",
    marginBottom: 6,
  },
  profileInfoText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#52637a",
  },
  sectionCard: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#dbe5f3",
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#102a43",
    marginBottom: 4,
  },
  sectionCardCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: "#52637a",
  },
  infoBox: {
    backgroundColor: "#e3f2fd",
    borderLeftWidth: 4,
    borderLeftColor: "#0066cc",
    padding: 12,
    marginBottom: 20,
    borderRadius: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#0066cc",
    lineHeight: 18,
  },
  button: {
    backgroundColor: "#0066cc",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loginLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginLinkText: {
    fontSize: 14,
    color: "#666",
  },
  loginLink: {
    fontSize: 14,
    color: "#0066cc",
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#777",
    fontSize: 13,
    fontWeight: "500",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#0066cc",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    backgroundColor: "#f5f9ff",
  },
  secondaryButtonText: {
    color: "#0066cc",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryHint: {
    textAlign: "center",
    color: "#666",
    fontSize: 13,
    marginBottom: 20,
  },
});
