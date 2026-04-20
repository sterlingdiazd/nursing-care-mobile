import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import {
  createNurseProfileForAdmin,
  type CreateNurseProfileRequest,
} from "@/src/services/adminPortalService";
import { FormInput } from "@/src/components/form";
import { adminTestIds } from "@/src/testing/testIds";

const CATEGORIES = ["Auxiliar", "Técnico", "Profesional", "Especialista"];

export default function AdminCreateNurseProfileScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<CreateNurseProfileRequest>({
    name: "",
    lastName: "",
    identificationNumber: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    hireDate: new Date().toISOString().split("T")[0],
    specialty: "",
    licenseId: "",
    bankName: "",
    accountNumber: "",
    category: CATEGORIES[0],
    isOperationallyActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // UI States
  const [showBankingInfo, setShowBankingInfo] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!roles.includes("ADMIN")) return void router.replace("/");
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  const validateAll = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "El nombre es obligatorio";
    if (!form.lastName.trim()) newErrors.lastName = "El apellido es obligatorio";
    if (!form.identificationNumber.trim()) newErrors.identificationNumber = "La cédula es obligatoria";
    if (!form.phone.trim()) newErrors.phone = "El teléfono es obligatorio";
    
    if (!form.email.trim()) newErrors.email = "El correo electrónico es obligatorio";
    else if (!form.email.includes("@")) newErrors.email = "El correo debe ser válido";
    
    if (!form.password.trim()) newErrors.password = "La contraseña es obligatoria";
    else if (form.password.length < 8) newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    
    if (form.password && form.confirmPassword !== form.password) newErrors.confirmPassword = "Las contraseñas no coinciden";
    
    if (!form.hireDate.trim()) newErrors.hireDate = "La fecha de contratación es obligatoria";
    if (!form.specialty.trim()) newErrors.specialty = "La especialidad es obligatoria";
    if (!form.category.trim()) newErrors.category = "La categoría es obligatoria";
    
    if (!form.bankName.trim() && form.accountNumber?.trim()) {
      newErrors.bankName = "El banco es obligatorio si se ingresa cuenta";
      // Auto expand to show error
      setShowBankingInfo(true);
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateAll()) {
      setError("Por favor revise los campos en rojo.");
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      const result = await createNurseProfileForAdmin(form);
      router.push(`/admin/nurse-profiles/${result.userId}` as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear el perfil de la enfermera.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeCategoryIsCustom = !CATEGORIES.includes(form.category);

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) return null;

  return (
    <MobileWorkspaceShell
      eyebrow="Crear Perfil"
      title="Nueva enfermera"
      description="Crear perfil rápido y configuraciones base."
    >
      {!!error && <Text style={styles.error}>{error}</Text>}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* === SECTION: PERSONAL === */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos Básicos</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Nombre *</Text>
              <FormInput testID={adminTestIds.nurses.create.nameInput} style={[styles.input, errors.name ? styles.inputError : undefined]} placeholder="Nombre" value={form.name} onChangeText={(text) => setForm({ ...form, name: text })} />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Apellido *</Text>
              <FormInput testID={adminTestIds.nurses.create.lastNameInput} style={[styles.input, errors.lastName ? styles.inputError : undefined]} placeholder="Apellido" value={form.lastName} onChangeText={(text) => setForm({ ...form, lastName: text })} />
            </View>
          </View>

          <Text style={styles.label}>Cédula *</Text>
          <FormInput testID={adminTestIds.nurses.create.identificationInput} style={[styles.input, errors.identificationNumber ? styles.inputError : undefined]} placeholder="Número de identificación" value={form.identificationNumber} onChangeText={(text) => setForm({ ...form, identificationNumber: text })} keyboardType="numeric" />

          <Text style={styles.label}>Teléfono *</Text>
          <FormInput testID={adminTestIds.nurses.create.phoneInput} style={[styles.input, errors.phone ? styles.inputError : undefined]} placeholder="Ej: 8091234567" value={form.phone} onChangeText={(text) => setForm({ ...form, phone: text })} keyboardType="phone-pad" />

          <Text style={styles.label}>Correo electrónico *</Text>
          <FormInput testID={adminTestIds.nurses.create.emailInput} style={[styles.input, errors.email ? styles.inputError : undefined]} placeholder="Enfermera@correo.com" value={form.email} onChangeText={(text) => setForm({ ...form, email: text })} keyboardType="email-address" autoCapitalize="none" />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Contraseña *</Text>
              <FormInput testID={adminTestIds.nurses.create.passwordInput} style={[styles.input, errors.password ? styles.inputError : undefined]} placeholder="****" value={form.password} onChangeText={(text) => setForm({ ...form, password: text })} secureTextEntry />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Confirmar *</Text>
              <FormInput testID={adminTestIds.nurses.create.confirmPasswordInput} style={[styles.input, errors.confirmPassword ? styles.inputError : undefined]} placeholder="****" value={form.confirmPassword} onChangeText={(text) => setForm({ ...form, confirmPassword: text })} secureTextEntry />
            </View>
          </View>
          {(errors.password || errors.confirmPassword) && <Text style={styles.errorText}>Revise que las contraseñas coincidan y tengan mínimo 8 caracteres.</Text>}
        </View>

        {/* === SECTION: PROFESSIONAL === */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Perfil Profesional</Text>
          
          <Text style={styles.label}>Estado operacional</Text>
          <View style={styles.chipsContainer}>
            <Pressable 
              style={[styles.chip, form.isOperationallyActive && styles.chipSuccess]} 
              onPress={() => setForm({ ...form, isOperationallyActive: true })}
            >
              <Text style={[styles.chipText, form.isOperationallyActive && styles.chipTextSuccess]}>✓ Activa</Text>
            </Pressable>
            <Pressable 
              style={[styles.chip, !form.isOperationallyActive && styles.chipDanger]} 
              onPress={() => setForm({ ...form, isOperationallyActive: false })}
            >
              <Text style={[styles.chipText, !form.isOperationallyActive && styles.chipTextDanger]}>× Inactiva</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Categoría *</Text>
          <View style={styles.chipsContainer}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[styles.chip, form.category === cat && styles.chipActive]}
                onPress={() => { setForm({ ...form, category: cat }); setCustomCategory(""); }}
              >
                <Text style={[styles.chipText, form.category === cat && styles.chipTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </View>
          <FormInput
            testID={adminTestIds.nurses.create.categoryInput}
            style={[styles.input, activeCategoryIsCustom ? styles.inputActive : undefined, errors.category ? styles.inputError : undefined]}
            placeholder="Otra categoría"
            value={activeCategoryIsCustom ? form.category : customCategory}
            onChangeText={(text) => {
              setCustomCategory(text);
              setForm({ ...form, category: text || CATEGORIES[0] });
            }}
            onFocus={() => { if (!activeCategoryIsCustom) setForm({ ...form, category: "" }); }}
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Especialidad *</Text>
              <FormInput testID={adminTestIds.nurses.create.specialtyInput} style={[styles.input, errors.specialty ? styles.inputError : undefined]} placeholder="Ej: Pediatría" value={form.specialty} onChangeText={(text) => setForm({ ...form, specialty: text })} />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Licencia / Exequátur</Text>
              <FormInput testID={adminTestIds.nurses.create.licenseInput} style={styles.input} placeholder="(Opcional)" value={form.licenseId ?? ""} onChangeText={(text) => setForm({ ...form, licenseId: text })} />
            </View>
          </View>

          <Text style={styles.label}>Fecha de contratación *</Text>
          {Platform.OS === "web" ? (
             <FormInput testID={adminTestIds.nurses.create.hireDateInput} style={[styles.input, errors.hireDate ? styles.inputError : undefined]} value={form.hireDate} onChangeText={(text) => setForm({ ...form, hireDate: text })} {...({ type: "date" } as any)} />
          ) : (
            <FormInput testID={adminTestIds.nurses.create.hireDateInput} style={[styles.input, errors.hireDate ? styles.inputError : undefined]} placeholder="YYYY-MM-DD" value={form.hireDate} onChangeText={(text) => setForm({ ...form, hireDate: text })} />
          )}
        </View>

        {/* === SECTION: BANKING === */}
        <View style={styles.accordionWrap}>
          <Pressable style={styles.accordionHeader} onPress={() => setShowBankingInfo(!showBankingInfo)}>
            <Text style={styles.accordionTitle}>Información Bancaria (Opcional)</Text>
            <Text style={styles.accordionIcon}>{showBankingInfo ? "▲" : "▼"}</Text>
          </Pressable>
          {showBankingInfo && (
            <View style={styles.accordionContent}>
              <Text style={styles.label}>Nombre del Banco</Text>
              <FormInput testID={adminTestIds.nurses.create.bankNameInput} style={[styles.input, errors.bankName ? styles.inputError : undefined]} placeholder="Ej: Banreservas" value={form.bankName} onChangeText={(text) => setForm({ ...form, bankName: text })} />
              {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}

              <Text style={styles.label}>Número de Cuenta</Text>
              <FormInput testID={adminTestIds.nurses.create.accountNumberInput} style={styles.input} placeholder="Número de cuenta bancaria" value={form.accountNumber ?? ""} onChangeText={(text) => setForm({ ...form, accountNumber: text })} keyboardType="numeric" />
            </View>
          )}
        </View>

        <View style={{height: 80}} />
      </ScrollView>

      {/* STICKY FOOTER */}
      <View style={styles.stickyFooter}>
        <Pressable
          testID={adminTestIds.nurses.create.submitButton}
          nativeID={adminTestIds.nurses.create.submitButton}
          style={styles.buttonPrimary}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.buttonPrimaryText}>{submitting ? "Procesando..." : "Registrar Enfermera"}</Text>
        </Pressable>
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  error: { backgroundColor: "#fee", color: "#c00", padding: 12, borderRadius: 12, marginBottom: 12 },
  scrollContent: { paddingBottom: 24 },
  card: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#102a43", marginBottom: 6 },
  label: { fontSize: 14, fontWeight: "700", color: "#7c2d12", marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e0", borderRadius: 12, padding: 12, fontSize: 15 },
  inputActive: { borderColor: "#3b82f6", borderWidth: 2 },
  inputError: { borderColor: "#dc2626" },
  errorText: { color: "#dc2626", fontSize: 12, marginTop: 4 },
  
  row: { flexDirection: "row", gap: 8 },
  col: { flex: 1 },

  chipsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { backgroundColor: "#f0f4f8", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: "#dbe5f3" },
  chipActive: { backgroundColor: "#3b82f6", borderColor: "#2563eb" },
  chipSuccess: { backgroundColor: "#10b981", borderColor: "#059669" },
  chipDanger: { backgroundColor: "#ef4444", borderColor: "#dc2626" },
  chipText: { color: "#52637a", fontWeight: "600", fontSize: 14 },
  chipTextActive: { color: "#ffffff" },
  chipTextSuccess: { color: "#ffffff" },
  chipTextDanger: { color: "#ffffff" },

  accordionWrap: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, overflow: "hidden", marginBottom: 12 },
  accordionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#f8fafc" },
  accordionTitle: { fontSize: 15, fontWeight: "700", color: "#52637a" },
  accordionIcon: { fontSize: 14, color: "#52637a", fontWeight: "700" },
  accordionContent: { padding: 16, borderTopWidth: 1, borderTopColor: "#e2e8f0" },

  stickyFooter: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 32 : 16, backgroundColor: "#ffffff", borderTopWidth: 1, borderTopColor: "#e2e8f0", shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 12 },
  buttonPrimary: { backgroundColor: "#3b82f6", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  buttonPrimaryText: { color: "#ffffff", fontWeight: "800", fontSize: 16 },
});
