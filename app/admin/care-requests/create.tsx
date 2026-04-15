import { createElement, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import {
  createAdminCareRequest,
  getAdminCareRequestClients,
  type CreateAdminCareRequestDto,
  type AdminCareRequestClientOptionDto,
} from "@/src/services/adminPortalService";
import { getAvailableNurses } from "@/src/services/catalogOptionsService";
import type { AvailableNurseOption } from "@/src/types/catalog";

const CARE_TYPES = [
  "Cuidado Básico",
  "Cuidado Especializado",
  "Terapia Física",
  "Acompañamiento",
];

const formatDateToIso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function CreateAdminCareRequestScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState<CreateAdminCareRequestDto>({
    clientUserId: "",
    careRequestDescription: "",
    careRequestType: CARE_TYPES[0],
    unit: 1,
    suggestedNurse: "",
    price: undefined,
    clientBasePriceOverride: undefined,
    distanceFactor: "",
    complexityLevel: "",
    medicalSuppliesCost: undefined,
    careRequestDate: formatDateToIso(new Date()),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // UI state
  const [customCareType, setCustomCareType] = useState("");
  const [showAdvancedPricing, setShowAdvancedPricing] = useState(false);

  // Client search
  const [clientSearch, setClientSearch] = useState("");
  const [clients, setClients] = useState<AdminCareRequestClientOptionDto[]>([]);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [selectedClient, setSelectedClient] = useState<AdminCareRequestClientOptionDto | null>(null);
  
  // Nurse search
  const [nurses, setNurses] = useState<AvailableNurseOption[]>([]);
  const [nurseLookupLoading, setNurseLookupLoading] = useState(false);
  const [showNursePicker, setShowNursePicker] = useState(false);
  
  // Date Picker
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [draftServiceDate, setDraftServiceDate] = useState<Date>(new Date());

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login" as any);
    if (requiresProfileCompletion) return void router.replace("/register" as any);
    if (!roles.includes("ADMIN")) return void router.replace("/" as any);
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (clientSearch.trim()) {
        try {
          const result = await getAdminCareRequestClients(clientSearch);
          setClients(result);
        } catch (err) {
          console.error("Error loading clients:", err);
        }
      } else {
        setClients([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  useEffect(() => {
    setNurseLookupLoading(true);
    void getAvailableNurses()
      .then((result) => setNurses(result))
      .catch(() => setNurses([]))
      .finally(() => setNurseLookupLoading(false));
  }, []);

  const filteredNurses = useMemo(() => {
    const query = (form.suggestedNurse ?? "").trim().toLocaleLowerCase();
    if (!query) return nurses.slice(0, 8);
    return nurses
      .filter((nurse) =>
        [nurse.displayName, nurse.specialty, nurse.category]
          .filter(Boolean)
          .some((value) => value.toLocaleLowerCase().includes(query)),
      )
      .slice(0, 8);
  }, [form.suggestedNurse, nurses]);

  const parseIsoDate = (value?: string) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parsedDate = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) return null;
    return parsedDate;
  };

  const openDatePicker = () => {
    setDraftServiceDate(parseIsoDate(form.careRequestDate ?? undefined) ?? new Date());
    setIsDatePickerVisible(true);
  };

  const closeDatePicker = () => setIsDatePickerVisible(false);

  const confirmDateSelection = () => {
    setForm((prev) => ({ ...prev, careRequestDate: formatDateToIso(draftServiceDate) }));
    setIsDatePickerVisible(false);
  };

  const clearSelectedDate = () => setForm((prev) => ({ ...prev, careRequestDate: "" }));

  const handleNativeDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      if (event.type === "set" && selectedDate) {
        setForm((prev) => ({ ...prev, careRequestDate: formatDateToIso(selectedDate) }));
      }
      setIsDatePickerVisible(false);
      return;
    }
    if (selectedDate) setDraftServiceDate(selectedDate);
  };

  const validateAll = () => {
    const newErrors: Record<string, string> = {};
    if (!form.clientUserId) newErrors.clientUserId = "Debe seleccionar un cliente";
    if (!form.careRequestDescription.trim()) newErrors.careRequestDescription = "La descripción es obligatoria";
    if (!form.careRequestType.trim()) newErrors.careRequestType = "El tipo es obligatorio";
    if (!form.unit || form.unit <= 0) newErrors.unit = "Las unidades deben ser mayores a 0";
    if (!form.careRequestDate) newErrors.careRequestDate = "La fecha es obligatoria";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateAll()) {
      setError("Por favor complete todos los campos obligatorios");
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      const result = await createAdminCareRequest(form);
      router.push(`/admin/care-requests/${result.id}` as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear la solicitud");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectClient = (client: AdminCareRequestClientOptionDto) => {
    setSelectedClient(client);
    setForm({ ...form, clientUserId: client.userId });
    setShowClientPicker(false);
    setClientSearch("");
  };

  const incrementUnit = () => setForm((prev) => ({ ...prev, unit: (prev.unit || 0) + 1 }));
  const decrementUnit = () => setForm((prev) => ({ ...prev, unit: Math.max(1, (prev.unit || 0) - 1) }));

  // Check custom vs predefined care type
  const activeTypeIsCustom = !CARE_TYPES.includes(form.careRequestType);

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) return null;

  return (
    <MobileWorkspaceShell
      eyebrow="Crear Solicitud"
      title="Nueva solicitud de cuidado"
      description="Crear una solicitud de servicio en nombre de un cliente."
    >
      {!!error && <Text style={styles.error}>{error}</Text>}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* === SECTION: CLIENT & BASIC INFO === */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Información del Servicio</Text>

          <Text style={styles.label}>Cliente *</Text>
          {selectedClient ? (
            <View style={styles.selectedClient}>
              <View>
                <Text style={styles.selectedClientName}>{selectedClient.displayName}</Text>
                <Text style={styles.selectedClientEmail}>{selectedClient.email}</Text>
              </View>
              <Pressable onPress={() => { setSelectedClient(null); setForm({ ...form, clientUserId: "" }); }}>
                <Text style={styles.changeLink}>Cambiar</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <TextInput
                style={[styles.input, errors.clientUserId ? styles.inputError : undefined]}
                placeholder="Buscar cliente por nombre o correo"
                value={clientSearch}
                onChangeText={setClientSearch}
                onFocus={() => setShowClientPicker(true)}
              />
              {showClientPicker && clients.length > 0 && (
                <View style={styles.clientPicker}>
                  {clients.map((client) => (
                    <Pressable key={client.userId} style={styles.clientOption} onPress={() => handleSelectClient(client)}>
                      <Text style={styles.clientOptionName}>{client.displayName}</Text>
                      <Text style={styles.clientOptionEmail}>{client.email}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          <Text style={styles.label}>Fecha programada *</Text>
          {Platform.OS === "web" ? (
            <View>
              {createElement("input", {
                type: "date",
                value: form.careRequestDate,
                onChange: (e: any) => setForm({ ...form, careRequestDate: e.target.value }),
                placeholder: "YYYY-MM-DD",
                style: {
                  padding: "12px",
                  borderRadius: "12px",
                  border: errors.careRequestDate ? "1px solid #dc2626" : "1px solid #cbd5e0",
                  backgroundColor: "#ffffff",
                  fontSize: "15px",
                  minHeight: "48px",
                  width: "100%",
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box"
                }
              })}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <Pressable 
                  style={{ flex: 1, backgroundColor: "#f0f4f8", padding: 8, borderRadius: 8, alignItems: "center" }}
                  onPress={() => setForm({ ...form, careRequestDate: formatDateToIso(new Date()) })}
                >
                  <Text style={{ fontSize: 13, color: "#102a43", fontWeight: "600" }}>Hoy</Text>
                </Pressable>
                <Pressable 
                  style={{ flex: 1, backgroundColor: "#f0f4f8", padding: 8, borderRadius: 8, alignItems: "center" }}
                  onPress={() => {
                    const d = new Date(); d.setDate(d.getDate() + 1);
                    setForm({ ...form, careRequestDate: formatDateToIso(d) });
                  }}
                >
                  <Text style={{ fontSize: 13, color: "#102a43", fontWeight: "600" }}>Mañana</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={openDatePicker} style={({ pressed }) => [styles.input, styles.datePickerTrigger, pressed && styles.buttonPressed, errors.careRequestDate ? styles.inputError : undefined]}>
              <Text style={form.careRequestDate ? styles.dateValue : styles.datePlaceholder}>
                {form.careRequestDate || "Selecciona una fecha"}
              </Text>
            </Pressable>
          )}

          <Text style={styles.label}>Tipo de solicitud *</Text>
          <View style={styles.chipsContainer}>
            {CARE_TYPES.map(type => (
              <Pressable 
                key={type} 
                style={[styles.chip, form.careRequestType === type && styles.chipActive]}
                onPress={() => { setForm({ ...form, careRequestType: type }); setCustomCareType(""); }}
              >
                <Text style={[styles.chipText, form.careRequestType === type && styles.chipTextActive]}>{type}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[styles.input, activeTypeIsCustom ? styles.inputActive : undefined]}
            placeholder="Otro tipo (especificar)"
            value={activeTypeIsCustom ? form.careRequestType : customCareType}
            onChangeText={(text) => {
              setCustomCareType(text);
              setForm({ ...form, careRequestType: text || CARE_TYPES[0] });
            }}
            onFocus={() => {
              if (!activeTypeIsCustom) {
                setForm({ ...form, careRequestType: "" });
              }
            }}
          />

          <Text style={styles.label}>Unidades *</Text>
          <View style={styles.stepperContainer}>
            <Pressable onPress={decrementUnit} style={styles.stepperBtn}><Text style={styles.stepperBtnText}>-</Text></Pressable>
            <Text style={styles.stepperValue}>{form.unit}</Text>
            <Pressable onPress={incrementUnit} style={styles.stepperBtn}><Text style={styles.stepperBtnText}>+</Text></Pressable>
          </View>

          <Text style={styles.label}>Descripción de la solicitud *</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.careRequestDescription ? styles.inputError : undefined]}
            placeholder="Detalles sobre lo requerido..."
            value={form.careRequestDescription}
            onChangeText={(text) => setForm({ ...form, careRequestDescription: text })}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* === SECTION: NURSE (Optional) === */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Enfermera Sugerida (Opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre de la enfermera"
            value={form.suggestedNurse ?? ""}
            onChangeText={(text) => {
              setForm({ ...form, suggestedNurse: text });
              setShowNursePicker(true);
            }}
            onFocus={() => setShowNursePicker(true)}
          />
          {showNursePicker && (
            <View style={styles.clientPicker}>
              {nurseLookupLoading ? (
                <View style={styles.autocompleteLoadingRow}>
                  <ActivityIndicator color="#3b82f6" />
                  <Text style={styles.autocompleteHelperText}>Buscando...</Text>
                </View>
              ) : filteredNurses.length > 0 ? (
                filteredNurses.map((nurse) => (
                  <Pressable
                    key={nurse.userId}
                    style={styles.clientOption}
                    onPress={() => {
                      setForm({ ...form, suggestedNurse: nurse.displayName });
                      setShowNursePicker(false);
                    }}
                  >
                    <Text style={styles.clientOptionName}>{nurse.displayName}</Text>
                    <Text style={styles.clientOptionEmail}>{[nurse.specialty, nurse.category].filter(Boolean).join(" • ")}</Text>
                  </Pressable>
                ))
              ) : (
                <View style={styles.autocompleteLoadingRow}><Text style={styles.autocompleteHelperText}>Sin resultados</Text></View>
              )}
            </View>
          )}
        </View>

        {/* === SECTION: ADVANCED PRICING (Accordion) === */}
        <View style={styles.accordionWrap}>
          <Pressable style={styles.accordionHeader} onPress={() => setShowAdvancedPricing(!showAdvancedPricing)}>
            <Text style={styles.accordionTitle}>Mostrar configuraciones de precio</Text>
            <Text style={styles.accordionIcon}>{showAdvancedPricing ? "▲" : "▼"}</Text>
          </Pressable>

          {showAdvancedPricing && (
            <View style={styles.accordionContent}>
              <Text style={styles.subtitle}>Estos valores sobreescriben la tarifa base calculada.</Text>
              
              <Text style={styles.label}>Precio base fijo (override)</Text>
              <TextInput style={styles.input} placeholder="Ej: 1500" value={form.clientBasePriceOverride?.toString() || ""} onChangeText={(text) => setForm({ ...form, clientBasePriceOverride: parseFloat(text) || undefined })} keyboardType="numeric" />

              <Text style={styles.label}>Costo de insumos médicos</Text>
              <TextInput style={styles.input} placeholder="Costo extra" value={form.medicalSuppliesCost?.toString() || ""} onChangeText={(text) => setForm({ ...form, medicalSuppliesCost: parseFloat(text) || undefined })} keyboardType="numeric" />

              <Text style={styles.label}>Factor de distancia (Multiplicador)</Text>
              <TextInput style={styles.input} placeholder="Ej: Cerca, Lejos..." value={form.distanceFactor} onChangeText={(text) => setForm({ ...form, distanceFactor: text })} />

              <Text style={styles.label}>Nivel de complejidad</Text>
              <TextInput style={styles.input} placeholder="Ej: Avanzado" value={form.complexityLevel} onChangeText={(text) => setForm({ ...form, complexityLevel: text })} />
            </View>
          )}
        </View>
        
        {/* Spacer for sticky footer */}
        <View style={{height: 80}} />
      </ScrollView>

      {/* STICKY FOOTER */}
      <View style={styles.stickyFooter}>
        <Pressable style={styles.buttonPrimary} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.buttonPrimaryText}>{submitting ? "Creando Solicitud..." : "Generar Solicitud de Cuidado"}</Text>
        </Pressable>
      </View>

      {/* Modal for DatePicker on iOS */}
      {isDatePickerVisible && Platform.OS !== "web" ? (
        Platform.OS === "ios" ? (
          <Modal transparent animationType="slide" visible={isDatePickerVisible} onRequestClose={closeDatePicker}>
            <View style={styles.dateModalBackdrop}>
              <View style={styles.dateModalContent}>
                <Text style={styles.dateModalTitle}>Seleccionar Fecha</Text>
                <DateTimePicker value={draftServiceDate} mode="date" display="spinner" onChange={handleNativeDateChange} />
                <View style={styles.dateModalActions}>
                  <Pressable style={styles.dateModalCancelButton} onPress={closeDatePicker}><Text style={styles.dateModalCancelText}>Cancelar</Text></Pressable>
                  <Pressable style={styles.dateModalConfirmButton} onPress={confirmDateSelection}><Text style={styles.dateModalConfirmText}>Guardar Fecha</Text></Pressable>
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker value={parseIsoDate(form.careRequestDate ?? undefined) ?? new Date()} mode="date" display="default" onChange={handleNativeDateChange} />
        )
      ) : null}

    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  error: { backgroundColor: "#fee", color: "#c00", padding: 12, borderRadius: 12, marginBottom: 12 },
  scrollContent: { paddingBottom: 24 },
  card: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#102a43", marginBottom: 12 },
  subtitle: { fontSize: 13, color: "#52637a", marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "700", color: "#7c2d12", marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e0", borderRadius: 12, padding: 12, fontSize: 15 },
  inputActive: { borderColor: "#3b82f6", borderWidth: 2 },
  inputError: { borderColor: "#dc2626" },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  
  chipsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { backgroundColor: "#f0f4f8", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: "#dbe5f3" },
  chipActive: { backgroundColor: "#3b82f6", borderColor: "#2563eb" },
  chipText: { color: "#52637a", fontWeight: "600", fontSize: 14 },
  chipTextActive: { color: "#ffffff" },
  
  stepperContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f4f8", borderRadius: 12, alignSelf: "flex-start", borderWidth: 1, borderColor: "#cbd5e0" },
  stepperBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  stepperBtnText: { fontSize: 20, fontWeight: "700", color: "#102a43" },
  stepperValue: { fontSize: 16, fontWeight: "800", color: "#102a43", minWidth: 40, textAlign: "center" },

  accordionWrap: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#cbd5e0", borderRadius: 18, overflow: "hidden", marginBottom: 12 },
  accordionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#f8fafc" },
  accordionTitle: { fontSize: 15, fontWeight: "700", color: "#52637a" },
  accordionIcon: { fontSize: 14, color: "#52637a", fontWeight: "700" },
  accordionContent: { padding: 16, borderTopWidth: 1, borderTopColor: "#e2e8f0" },

  selectedClient: { backgroundColor: "#f0f4f8", borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  selectedClientName: { fontSize: 16, fontWeight: "700", color: "#102a43" },
  selectedClientEmail: { fontSize: 14, color: "#52637a", marginTop: 2 },
  changeLink: { color: "#3b82f6", fontSize: 14, fontWeight: "600" },
  clientPicker: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e0", borderRadius: 12, marginTop: 4, maxHeight: 180, overflow: "hidden" },
  clientOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  clientOptionName: { fontSize: 15, fontWeight: "700", color: "#102a43" },
  clientOptionEmail: { fontSize: 13, color: "#52637a", marginTop: 2 },
  autocompleteLoadingRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  autocompleteHelperText: { fontSize: 13, color: "#52637a" },
  
  datePickerTrigger: { minHeight: 48, justifyContent: "center" },
  dateValue: { color: "#102a43", fontSize: 15, fontWeight: "600" },
  datePlaceholder: { color: "#64748b", fontSize: 15 },
  
  dateModalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "flex-end" },
  dateModalContent: { backgroundColor: "#ffffff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 },
  dateModalTitle: { fontSize: 16, fontWeight: "800", color: "#102a43", marginBottom: 8 },
  dateModalActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  dateModalCancelButton: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: "#cbd5e0", alignItems: "center", paddingVertical: 12 },
  dateModalCancelText: { color: "#102a43", fontWeight: "700" },
  dateModalConfirmButton: { flex: 1, borderRadius: 10, backgroundColor: "#3b82f6", alignItems: "center", paddingVertical: 12 },
  dateModalConfirmText: { color: "#ffffff", fontWeight: "700" },

  stickyFooter: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 32 : 16, backgroundColor: "#ffffff", borderTopWidth: 1, borderTopColor: "#e2e8f0", shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 12 },
  buttonPrimary: { backgroundColor: "#3b82f6", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  buttonPrimaryText: { color: "#ffffff", fontWeight: "800", fontSize: 16 },
  buttonPressed: { opacity: 0.8 },
});
