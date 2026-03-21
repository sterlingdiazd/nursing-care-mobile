import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { createCorrelationId, logClientEvent } from "@/src/logging/clientLogger";
import { createCareRequest, getCareRequests } from "@/src/services/careRequestService";
import { CreateCareRequestDto } from "@/src/types/careRequest";

const SERVICE_TYPES: Record<
  string,
  { category: "hogar" | "domicilio" | "medicos"; basePrice: number; unitType: string }
> = {
  hogar_diario: { category: "hogar", basePrice: 2500, unitType: "dia_completo" },
  hogar_basico: { category: "hogar", basePrice: 55000, unitType: "mes" },
  hogar_estandar: { category: "hogar", basePrice: 60000, unitType: "mes" },
  hogar_premium: { category: "hogar", basePrice: 65000, unitType: "mes" },
  domicilio_dia_12h: { category: "domicilio", basePrice: 2500, unitType: "medio_dia" },
  domicilio_noche_12h: { category: "domicilio", basePrice: 2500, unitType: "medio_dia" },
  domicilio_24h: { category: "domicilio", basePrice: 3500, unitType: "dia_completo" },
  suero: { category: "medicos", basePrice: 2000, unitType: "sesion" },
  medicamentos: { category: "medicos", basePrice: 2000, unitType: "sesion" },
  sonda_vesical: { category: "medicos", basePrice: 2000, unitType: "sesion" },
  sonda_nasogastrica: { category: "medicos", basePrice: 3000, unitType: "sesion" },
  sonda_peg: { category: "medicos", basePrice: 4000, unitType: "sesion" },
  curas: { category: "medicos", basePrice: 2000, unitType: "sesion" },
};

const CATEGORY_FACTOR = { hogar: 1.0, domicilio: 1.2, medicos: 1.5 };
const DISTANCE_FACTORS: Record<string, number> = { local: 1.0, cercana: 1.1, media: 1.2, lejana: 1.3 };
const COMPLEXITY_FACTORS: Record<string, number> = { estandar: 1.0, moderada: 1.1, alta: 1.2, critica: 1.3 };
const SERVICE_LABELS: Record<string, string> = {
  hogar_diario: "Hogar diario",
  hogar_basico: "Hogar basico",
  hogar_estandar: "Hogar estandar",
  hogar_premium: "Hogar premium",
  domicilio_dia_12h: "Domicilio dia 12h",
  domicilio_noche_12h: "Domicilio noche 12h",
  domicilio_24h: "Domicilio 24h",
  suero: "Suero",
  medicamentos: "Medicamentos",
  sonda_vesical: "Sonda vesical",
  sonda_nasogastrica: "Sonda nasogastrica",
  sonda_peg: "Sonda PEG",
  curas: "Curas",
};
const DISTANCE_OPTIONS = [
  ["local", "Local"],
  ["cercana", "Cercana"],
  ["media", "Media"],
  ["lejana", "Lejana"],
] as const;
const COMPLEXITY_OPTIONS = [
  ["estandar", "Estandar"],
  ["moderada", "Moderada"],
  ["alta", "Alta"],
  ["critica", "Critica"],
] as const;

function volumeDiscountPercent(existingCount: number): number {
  if (existingCount >= 50) return 20;
  if (existingCount >= 20) return 15;
  if (existingCount >= 10) return 10;
  if (existingCount >= 5) return 5;
  if (existingCount >= 1) return 0;
  return 0;
}

export default function CreateCareRequestScreen() {
  const { isAuthenticated, isReady, token, userId, roles } = useAuth();
  const canCreateRequest = roles.includes("Client") || roles.includes("Admin");
  const [form, setForm] = useState<CreateCareRequestDto>({
    careRequestDescription: "",
    suggestedNurse: "",
    careRequestDate: undefined,
    careRequestType: "domicilio_24h",
    unit: 1,
    distanceFactor: "local",
    complexityLevel: "estandar",
    clientBasePriceOverride: undefined,
    medicalSuppliesCost: undefined,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [existingSameUnitTypeCount, setExistingSameUnitTypeCount] = useState<number>(0);

  const selectedService = SERVICE_TYPES[form.careRequestType] ?? SERVICE_TYPES.domicilio_24h;
  const selectedCategory = selectedService.category;
  const derivedUnitType = selectedService.unitType;

  const basePrice =
    typeof form.clientBasePriceOverride === "number" && form.clientBasePriceOverride > 0
      ? form.clientBasePriceOverride
      : selectedService.basePrice;

  const categoryFactor = CATEGORY_FACTOR[selectedCategory];
  const distanceFactorValue =
    selectedCategory === "domicilio" ? DISTANCE_FACTORS[form.distanceFactor ?? "local"] ?? 1.0 : 1.0;
  const complexityFactor =
    selectedCategory === "hogar" || selectedCategory === "domicilio"
      ? COMPLEXITY_FACTORS[form.complexityLevel ?? "estandar"] ?? 1.0
      : 1.0;

  const volumeDiscount = volumeDiscountPercent(existingSameUnitTypeCount);
  const unitPrice =
    basePrice * categoryFactor * distanceFactorValue * complexityFactor * (1 - volumeDiscount / 100);
  const medicalSupplies =
    selectedCategory === "medicos" &&
    typeof form.medicalSuppliesCost === "number" &&
    form.medicalSuppliesCost >= 0
      ? form.medicalSuppliesCost
      : 0;
  const estimatedTotal = unitPrice * (form.unit ?? 1) + medicalSupplies;

  const resetForm = () => {
    setForm({
      careRequestDescription: "",
      suggestedNurse: "",
      careRequestDate: undefined,
      careRequestType: "domicilio_24h",
      unit: 1,
      distanceFactor: "local",
      complexityLevel: "estandar",
      clientBasePriceOverride: undefined,
      medicalSuppliesCost: undefined,
    });
    setSuccessMessage(null);
  };

  const onSubmit = async () => {
    if (!form.careRequestDescription.trim() || !form.careRequestType) {
      logClientEvent("mobile.ui", "Solicitud bloqueada por validacion", {
        descriptionPresent: Boolean(form.careRequestDescription.trim()),
        careRequestTypePresent: Boolean(form.careRequestType),
      });
      Alert.alert(
        "Validacion",
        "La descripcion de la solicitud y el tipo de servicio son obligatorios.",
      );
      return;
    }

    if (!canCreateRequest) {
      Alert.alert(
        "Accion no permitida",
        "Solo los perfiles de cliente o administracion pueden crear solicitudes de cuidado.",
      );
      return;
    }

    if (!isReady) {
      logClientEvent("mobile.ui", "Solicitud bloqueada mientras la sesion termina de cargar");
      Alert.alert(
        "Sesion cargando",
        "La sesion todavia se esta preparando. Espera un momento e intenta de nuevo.",
      );
      return;
    }

    if (!token || !userId) {
      logClientEvent("mobile.ui", "Solicitud bloqueada por sesion incompleta");
      Alert.alert(
        "Autenticacion requerida",
        "Inicia sesion nuevamente antes de crear una solicitud.",
      );
      return;
    }

    if (isLoading) {
      return;
    }

    const correlationId = createCorrelationId();

    setIsLoading(true);
    setSuccessMessage(null);
    logClientEvent("mobile.ui", "Formulario de solicitud enviado", {
      correlationId,
      userId,
      careRequestType: form.careRequestType,
      descriptionLength: form.careRequestDescription.length,
    });

    try {
      const response = await createCareRequest(form, correlationId);
      logClientEvent("mobile.ui", "Solicitud creada correctamente", {
        correlationId: response.correlationId ?? correlationId,
        userId,
        createdId: response.id,
      });
      setSuccessMessage(`Solicitud creada correctamente: ${response.id}`);
      Alert.alert("Solicitud creada", `ID: ${response.id}`, [
        {
          text: "Aceptar",
          onPress: () => {
            resetForm();
            router.push({
              pathname: "/care-requests/[id]",
              params: { id: response.id },
            } as never);
          },
        },
      ]);
    } catch (error: any) {
      const errorMessage = error.message || "No fue posible crear la solicitud";
      logClientEvent(
        "mobile.ui",
        "Error al crear la solicitud",
        {
          correlationId,
          userId,
          errorMessage,
        },
        "error",
      );
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady || !isAuthenticated || !userId || !form.careRequestType) {
      setExistingSameUnitTypeCount(0);
      return;
    }

    getCareRequests()
      .then((list) => {
        const count = list.filter(
          (request) => request.userID === userId && (request.unitType ?? "") === derivedUnitType,
        ).length;
        setExistingSameUnitTypeCount(count);
      })
      .catch(() => setExistingSameUnitTypeCount(0));
  }, [derivedUnitType, form.careRequestType, isAuthenticated, isReady, userId]);

  return (
    <MobileWorkspaceShell
      eyebrow="Nueva solicitud"
      title="Crea una solicitud clara con un flujo guiado."
      description="La captura ahora se organiza como una experiencia de trabajo: contexto principal primero, opciones guiadas despues y ajustes opcionales al final."
      actions={
        <>
          <Pressable
            onPress={onSubmit}
            disabled={isLoading || !canCreateRequest}
            style={({ pressed }) => [
              styles.heroPrimaryButton,
              (isLoading || !canCreateRequest) && styles.buttonDisabled,
              pressed && !isLoading && canCreateRequest && styles.buttonPressed,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="#132d75" />
            ) : (
              <Text style={styles.heroPrimaryButtonText}>Crear solicitud</Text>
            )}
          </Pressable>

          <Pressable
            onPress={resetForm}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.heroSecondaryButton,
              pressed && !isLoading && styles.buttonPressed,
            ]}
          >
            <Text style={styles.heroSecondaryButtonText}>Limpiar formulario</Text>
          </Pressable>
        </>
      }
    >
      <View style={styles.flow}>
          <View style={styles.statusCard}>
            <Text style={styles.statusEyebrow}>Estado de sesion</Text>
            <Text style={styles.statusTitle}>
              {isAuthenticated ? "Sesion autenticada" : "Sesion no autenticada"}
            </Text>
            <Text style={styles.statusCopy}>
              La solicitud se asociara automaticamente al usuario autenticado actual.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Datos de la solicitud</Text>
            <Text style={styles.sectionCopy}>
              Esta solicitud se enviara al mismo backend protegido que usa la app web.
            </Text>
          </View>

            {!canCreateRequest && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  Solo los perfiles de cliente o administracion pueden crear solicitudes. Usa la
                  cola para revisar el trabajo ya asignado.
                </Text>
              </View>
            )}

            {isReady && isAuthenticated && !userId && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  No hay un identificador de usuario disponible en la sesion. Vuelve a iniciar
                  sesion antes de continuar.
                </Text>
              </View>
            )}

            <Text style={styles.label}>Descripcion de la solicitud</Text>
            <TextInput
              value={form.careRequestDescription}
              onChangeText={(text) => setForm((prev) => ({ ...prev, careRequestDescription: text }))}
              placeholder="Describe el cuidado requerido, urgencia, detalles clinicos y notas operativas."
              multiline
              textAlignVertical="top"
              editable={!isLoading}
              style={[styles.input, styles.textArea, isLoading && styles.inputDisabled]}
            />
            <Text style={styles.helperText}>
              {form.careRequestDescription.trim().length} caracteres
            </Text>

            <Text style={styles.label}>Enfermera sugerida (opcional)</Text>
            <TextInput
              value={form.suggestedNurse ?? ""}
              onChangeText={(text) => setForm((prev) => ({ ...prev, suggestedNurse: text }))}
              placeholder="Nombre de la enfermera preferida"
              editable={!isLoading}
              style={[styles.input, isLoading && styles.inputDisabled]}
            />
            <Text style={styles.helperText}>
              Administracion decidira si asigna la enfermera sugerida u otra disponible.
            </Text>

            <Text style={styles.label}>Fecha del servicio (opcional)</Text>
            <TextInput
              value={form.careRequestDate ?? ""}
              onChangeText={(text) => setForm((prev) => ({ ...prev, careRequestDate: text }))}
              placeholder="YYYY-MM-DD"
              editable={!isLoading}
              style={[styles.input, isLoading && styles.inputDisabled]}
            />
            <Text style={styles.helperText}>
              La enfermera asignada no podra completar la solicitud antes de la fecha indicada.
            </Text>

            <Text style={styles.label}>Servicio</Text>
            <View style={styles.optionGrid}>
              {Object.entries(SERVICE_LABELS).map(([value, label]) => {
                const selected = form.careRequestType === value;

                return (
                  <Pressable
                    key={value}
                    onPress={() => setForm((prev) => ({ ...prev, careRequestType: value }))}
                    style={({ pressed }) => [
                      styles.optionButton,
                      selected && styles.optionButtonSelected,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.checklist}>
              <Text style={styles.checklistTitle}>Estimacion de servicio</Text>
              <Text style={styles.checkItem}>
                Total estimado: {Number.isFinite(estimatedTotal) ? estimatedTotal.toFixed(2) : "0.00"}
              </Text>
              <Text style={styles.checkItem}>
                Servicio: {SERVICE_LABELS[form.careRequestType] ?? form.careRequestType}
              </Text>
              <Text style={styles.checkItem}>
                Tipo de unidad: {derivedUnitType} • Categoria: {selectedCategory}
              </Text>
            </View>

            <Text style={styles.label}>Cantidad</Text>
            <TextInput
              value={String(form.unit ?? 1)}
              onChangeText={(text) => {
                const value = Number(text);
                setForm((prev) => ({ ...prev, unit: Number.isFinite(value) && value > 0 ? value : 1 }));
              }}
              placeholder="1"
              keyboardType="numeric"
              editable={!isLoading}
              returnKeyType="done"
              style={[styles.input, isLoading && styles.inputDisabled]}
            />

            {selectedCategory === "domicilio" && (
              <>
                <Text style={styles.label}>Zona de desplazamiento</Text>
                <View style={styles.inlineOptions}>
                  {DISTANCE_OPTIONS.map(([value, label]) => {
                    const selected = (form.distanceFactor ?? "local") === value;

                    return (
                      <Pressable
                        key={value}
                        onPress={() => setForm((prev) => ({ ...prev, distanceFactor: value }))}
                        style={({ pressed }) => [
                          styles.inlineOption,
                          selected && styles.inlineOptionSelected,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.inlineOptionText,
                            selected && styles.inlineOptionTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {(selectedCategory === "hogar" || selectedCategory === "domicilio") && (
              <>
                <Text style={styles.label}>Nivel de complejidad</Text>
                <View style={styles.inlineOptions}>
                  {COMPLEXITY_OPTIONS.map(([value, label]) => {
                    const selected = (form.complexityLevel ?? "estandar") === value;

                    return (
                      <Pressable
                        key={value}
                        onPress={() => setForm((prev) => ({ ...prev, complexityLevel: value }))}
                        style={({ pressed }) => [
                          styles.inlineOption,
                          selected && styles.inlineOptionSelected,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.inlineOptionText,
                            selected && styles.inlineOptionTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={styles.label}>Ajuste de precio base para cliente (opcional)</Text>
            <TextInput
              value={form.clientBasePriceOverride == null ? "" : String(form.clientBasePriceOverride)}
              onChangeText={(text) => {
                if (text.trim() === "") {
                  setForm((prev) => ({ ...prev, clientBasePriceOverride: undefined }));
                  return;
                }
                const value = Number(text);
                setForm((prev) => ({
                  ...prev,
                  clientBasePriceOverride: Number.isFinite(value) ? value : undefined,
                }));
              }}
              placeholder="Ejemplo: 3000"
              keyboardType="numeric"
              editable={!isLoading}
              style={[styles.input, isLoading && styles.inputDisabled]}
            />

            {selectedCategory === "medicos" && (
              <>
                <Text style={styles.label}>Costo de insumos medicos (opcional)</Text>
                <TextInput
                  value={form.medicalSuppliesCost == null ? "" : String(form.medicalSuppliesCost)}
                  onChangeText={(text) => {
                    if (text.trim() === "") {
                      setForm((prev) => ({ ...prev, medicalSuppliesCost: undefined }));
                      return;
                    }
                    const value = Number(text);
                    setForm((prev) => ({
                      ...prev,
                      medicalSuppliesCost: Number.isFinite(value) ? value : undefined,
                    }));
                  }}
                  placeholder="Ejemplo: 800"
                  keyboardType="numeric"
                  editable={!isLoading}
                  style={[styles.input, isLoading && styles.inputDisabled]}
                />
              </>
            )}

            <View style={styles.checklist}>
              <Text style={styles.checklistTitle}>Checklist de envio</Text>
              <Text style={styles.checkItem}>
                {userId ? "• Usuario autenticado identificado" : "• Falta el usuario autenticado"}
              </Text>
              <Text style={styles.checkItem}>
                {form.careRequestDescription.trim().length > 24
                  ? "• La descripcion tiene contexto suficiente"
                  : "• Agrega una descripcion mas especifica"}
              </Text>
              <Text style={styles.checkItem}>
                • Se aplicara el descuento por volumen segun solicitudes previas del mismo usuario
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                onPress={onSubmit}
                disabled={isLoading || !canCreateRequest}
                style={({ pressed }) => [
                  styles.button,
                  (isLoading || !canCreateRequest) && styles.buttonDisabled,
                  pressed && !isLoading && canCreateRequest && styles.buttonPressed,
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Crear solicitud</Text>
                )}
              </Pressable>

              <Pressable
                onPress={resetForm}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && !isLoading && styles.buttonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Limpiar</Text>
              </Pressable>
            </View>

            {successMessage && <Text style={styles.successMessage}>{successMessage}</Text>}
          </View>
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  flow: {
    gap: 18,
  },
  statusCard: {
    backgroundColor: "#123047",
    borderRadius: 24,
    padding: 18,
  },
  statusEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    color: "#bde0dd",
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: "#fffef8",
    marginBottom: 8,
  },
  statusCopy: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(232, 241, 247, 0.78)",
  },
  card: {
    backgroundColor: "#fffdf9",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#dbe5f3",
  },
  sectionHeader: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#102a43",
    marginBottom: 6,
  },
  sectionCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: "#52637a",
  },
  warningBox: {
    backgroundColor: "#fff7ed",
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#fdba74",
  },
  warningText: {
    color: "#9a3412",
    lineHeight: 20,
    fontWeight: "600",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 18,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 160,
  },
  optionGrid: {
    gap: 10,
    marginBottom: 18,
  },
  optionButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe5f3",
  },
  optionButtonSelected: {
    backgroundColor: "#eff6ff",
    borderColor: "#93c5fd",
  },
  optionLabel: {
    color: "#102a43",
    fontSize: 15,
    fontWeight: "700",
  },
  optionLabelSelected: {
    color: "#1d4ed8",
  },
  inlineOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  inlineOption: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe5f3",
  },
  inlineOptionSelected: {
    backgroundColor: "#eff6ff",
    borderColor: "#93c5fd",
  },
  inlineOptionText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
  },
  inlineOptionTextSelected: {
    color: "#1d4ed8",
  },
  helperText: {
    marginTop: -10,
    marginBottom: 16,
    fontSize: 12,
    color: "#64748b",
  },
  inputDisabled: {
    opacity: 0.6,
  },
  checklist: {
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  checklistTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1d4ed8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  checkItem: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1e3a5f",
    marginBottom: 4,
  },
  buttonRow: {
    gap: 12,
  },
  button: {
    backgroundColor: "#1d4ed8",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryButtonText: {
    color: "#334155",
    fontWeight: "700",
    fontSize: 15,
  },
  heroPrimaryButton: {
    backgroundColor: "#fef3c7",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  heroSecondaryButton: {
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroPrimaryButtonText: {
    color: "#132d75",
    fontWeight: "800",
    fontSize: 16,
  },
  heroSecondaryButtonText: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 15,
  },
  successMessage: {
    marginTop: 14,
    color: "#166534",
    fontWeight: "700",
  },
});
