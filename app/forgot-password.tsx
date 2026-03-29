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
import { forgotPassword, validateEmail } from "@/src/api/auth";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const validateEmailField = (value: string) => {
    if (!value) {
      setEmailError("El correo es obligatorio");
    } else if (!validateEmail(value)) {
      setEmailError("El formato del correo no es valido");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async () => {
    validateEmailField(email);
    if (!email || !validateEmail(email)) {
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(email.trim());
      Alert.alert(
        "Código enviado",
        "Si el correo está registrado, recibirás un código de 6 dígitos para restablecer tu contraseña.",
        [
          {
            text: "Ir a ingresar código",
            onPress: () => router.push({
              pathname: "/reset-password",
              params: { email: email.trim() }
            }),
          },
        ]
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "No fue posible procesar la solicitud";
      Alert.alert("Error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Recuperar contraseña</Text>
      <Text style={styles.subtitle}>
        Ingresa tu correo electrónico y te enviaremos un código para restablecer tu acceso.
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={[styles.input, emailError ? styles.inputError : null]}
          placeholder="tu@correo.com"
          value={email}
          onChangeText={setEmail}
          onBlur={() => validateEmailField(email)}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading}
          placeholderTextColor="#999"
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading ? styles.buttonDisabled : null]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={styles.buttonText}>Enviar código</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => router.push({
          pathname: "/reset-password",
          params: { email: email.trim() }
        })}
        style={styles.linkContainer}
      >
        <Text style={styles.linkText}>¿Ya tienes un código? </Text>
        <Text style={styles.link}>Ingrésalo aquí</Text>
      </TouchableOpacity>
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
    paddingVertical: 60,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: "#0066cc",
    fontWeight: "600",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 10,
    color: "#000",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 30,
    lineHeight: 22,
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
  button: {
    backgroundColor: "#0066cc",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  linkText: {
    fontSize: 14,
    color: "#666",
  },
  link: {
    fontSize: 14,
    color: "#0066cc",
    fontWeight: "600",
  },
});
