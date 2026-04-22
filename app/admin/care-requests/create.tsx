import { createElement, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRef } from "react";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import {
  createAdminCareRequest,
  getAdminCareRequestClients,
  type CreateAdminCareRequestDto,
  type AdminCareRequestClientOptionDto,
} from "@/src/services/adminPortalService";
import { FormInput } from "@/src/components/form";
import { adminTestIds } from "@/src/testing/testIds";
import { getAvailableNurses } from "@/src/services/catalogOptionsService";
import type { AvailableNurseOption } from "@/src/types/catalog";
import { getAdminCareCreateProgress } from "@/src/utils/adminCreationUx";

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
  const isSubmittingRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);

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
    if (isSubmittingRef.current) return;
    
    if (!validateAll()) {
      setError("Por favor complete todos los campos obligatorios");
      setTimeout(() => scrollViewRef.current?.scrollTo({ y: 0, animated: true }), 100);
      return;
    }

    try {
      isSubmittingRef.current = true;
      setSubmitting(true);
      setError(null);
      
      const payload: CreateAdminCareRequestDto = {
        ...form,
        distanceFactor: form.distanceFactor?.trim() || undefined,
        complexityLevel: form.complexityLevel?.trim() || undefined,
        suggestedNurse: form.suggestedNurse?.trim() || undefined,
      };

      await createAdminCareRequest(payload);
      
      // Limpiar formulario al completar
      setForm({
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
      setSelectedClient(null);
      setClientSearch("");
      setCustomCareType("");
      setShowAdvancedPricing(false);

      // Redirigir a la lista en lugar del detalle
      router.push(`/admin/care-requests` as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear la solicitud");
      setTimeout(() => scrollViewRef.current?.scrollTo({ y: 0, animated: true }), 100);
    } finally {
      isSubmittingRef.current = false;
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
  const creationProgress = getAdminCareCreateProgress(form);
  const advancedPricingLocked = !creationProgress.coreReady;

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) return null;

  return (
    <MobileWorkspaceShell
      eyebrow="Crear Solicitud"
      title="Nueva solicitud de cuidado"
      description="Crear una solicitud de servicio en nombre de un cliente."
      testID={adminTestIds.careRequests.create.screen}
      nativeID={adminTestIds.careRequests.create.screen}
    >
      <View style={styles.progressCard}>
        <Text
          testID={adminTestIds.careRequests.create.stepState}
          nativeID={adminTestIds.careRequests.create.stepState}
          style={[
            styles.statusChip,
            creationProgress.status.tone === "success" ? styles.statusChipSuccess : styles.statusChipWarning,
          ]}
        >
          {creationProgress.status.label}
        </Text>
        <Text style={styles.progressHelper}>{creationProgress.status.helper}</Text>
      </View>

      {!!error && (
        <Text
          testID={adminTestIds.careRequests.create.errorBanner}
          nativeID={adminTestIds.careRequests.create.errorBanner}
          style={styles.error}
        >
          {error}
        </Text>
      )}

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
        
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
              <FormInput
                testID={adminTestIds.careRequests.create.clientSearchInput}
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
          {errors.clientUserId && <Text style={styles.errorText}>{errors.clientUserId}</Text>}

          <Text style={styles.label}>Fecha programada *</Text>
          {Platform.OS === "web" ? (
            <View>
              {createElement("input", {
                type: "date",
                value: form.careRequestDate,
                onChange: (e: any) => setForm({ ...form, careRequestDate: e.target.value }),
                placeholder: "YYYY-MM-DD",
                "data-testid": adminTestIds.careRequests.create.dateInput,
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
            <Pressable
              testID={adminTestIds.careRequests.create.dateInput}
              nativeID={adminTestIds.careRequests.create.dateInput}
              onPress={openDatePicker}
              style={({ pressed }) => [
                styles.input,
                styles.datePickerTrigger,
                pressed && styles.buttonPressed,
                errors.careRequestDate ? styles.inputError : undefined,
              ]}
            >
              <Text style={form.careRequestDate ? styles.dateValue : styles.datePlaceholder}>
                {form.careRequestDate || "Selecciona una fecha"}
              </Text>
            </Pressable>
          )}
          {errors.careRequestDate && <Text style={styles.errorText}>{errors.careRequestDate}</Text>}

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
          <FormInput
            testID={adminTestIds.careRequests.create.customTypeInput}
            style={[
              styles.input,
              activeTypeIsCustom ? styles.inputActive : undefined,
              errors.careRequestType ? styles.inputError : undefined,
            ]}
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
          {errors.careRequestType && <Text style={styles.errorText}>{errors.careRequestType}</Text>}

          <Text style={styles.label}>Unidades *</Text>
          <View style={styles.stepperContainer}>
            <Pressable onPress={decrementUnit} style={styles.stepperBtn}><Text style={styles.stepperBtnText}>-</Text></Pressable>
            <Text style={styles.stepperValue}>{form.unit}</Text>
            <Pressable onPress={incrementUnit} style={styles.stepperBtn}><Text style={styles.stepperBtnText}>+</Text></Pressable>
          </View>
          {errors.unit && <Text style={styles.errorText}>{errors.unit}</Text>}

          <Text style={styles.label}>Descripción de la solicitud *</Text>
          <FormInput
            testID={adminTestIds.careRequests.create.descriptionInput}
            style={[styles.input, styles.textArea, errors.careRequestDescription ? styles.inputError : undefined]}
            placeholder="Detalles sobre lo requerido..."
            value={form.careRequestDescription}
            onChangeText={(text) => setForm({ ...form, careRequestDescription: text })}
            multiline
            numberOfLines={3}
          />
          {errors.careRequestDescription && <Text style={styles.errorText}>{errors.careRequestDescription}</Text>}
        </View>

        {/* === SECTION: NURSE (Optional) === */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Enfermera Sugerida (Opcional)</Text>
          <FormInput
            testID={adminTestIds.careRequests.create.nurseInput}
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

        <View style={styles.reviewCard}>
          <Text style={styles.cardTitle}>Revisión previa</Text>
          <Text style={styles.reviewHelper}>
            {creationProgress.coreReady
              ? "Verifica estos datos antes de crear la solicitud."
              : "Completa la información clave para desbloquear la revisión y los ajustes de precio."}
          </Text>
          <View style={styles.reviewChecklist}>
            {creationProgress.checklist.map((item) => (
              <View key={item.key} style={styles.reviewChecklistItem}>
                <Text
                  style={[
                    styles.reviewChecklistDot,
                    item.complete ? styles.reviewChecklistDotComplete : styles.reviewChecklistDotPending,
                  ]}
                >
                  {item.complete ? "●" : "○"}
                </Text>
                <Text style={styles.reviewChecklistText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* === SECTION: ADVANCED PRICING (Accordion) === */}
        <View style={styles.accordionWrap}>
          <Pressable
            style={[styles.accordionHeader, advancedPricingLocked ? styles.accordionHeaderDisabled : undefined]}
            onPress={() => {
              if (advancedPricingLocked) return;
              setShowAdvancedPricing(!showAdvancedPricing);
            }}
          >
            <Text style={styles.accordionTitle}>Mostrar configuraciones de precio</Text>
            <Text style={styles.accordionIcon}>{showAdvancedPricing ? "▲" : "▼"}</Text>
          </Pressable>
          {advancedPricingLocked ? (
            <View style={styles.lockedAccordionNotice}>
              <Text style={styles.lockedAccordionText}>Completa cliente, fecha, tipo, unidades y descripción antes de ajustar precios.</Text>
            </View>
          ) : null}

          {showAdvancedPricing && (
            <View style={styles.accordionContent}>
              <Text style={styles.subtitle}>Estos valores sobreescriben la tarifa base calculada.</Text>
              
              <Text style={styles.label}>Precio base fijo (override)</Text>
              <FormInput testID={adminTestIds.careRequests.create.priceOverrideInput} style={styles.input} placeholder="Ej: 1500" value={form.clientBasePriceOverride?.toString() || ""} onChangeText={(text) => setForm({ ...form, clientBasePriceOverride: parseFloat(text) || undefined })} keyboardType="numeric" />

              <Text style={styles.label}>Costo de insumos médicos</Text>
              <FormInput testID={adminTestIds.careRequests.create.medicalSuppliesInput} style={styles.input} placeholder="Costo extra" value={form.medicalSuppliesCost?.toString() || ""} onChangeText={(text) => setForm({ ...form, medicalSuppliesCost: parseFloat(text) || undefined })} keyboardType="numeric" />

              <Text style={styles.label}>Factor de distancia (Multiplicador)</Text>
              <FormInput testID={adminTestIds.careRequests.create.distanceFactorInput} style={styles.input} placeholder="Ej: Cerca, Lejos..." value={form.distanceFactor} onChangeText={(text) => setForm({ ...form, distanceFactor: text })} />

              <Text style={styles.label}>Nivel de complejidad</Text>
              <FormInput testID={adminTestIds.careRequests.create.complexityInput} style={styles.input} placeholder="Ej: Avanzado" value={form.complexityLevel} onChangeText={(text) => setForm({ ...form, complexityLevel: text })} />
            </View>
          )}
        </View>
        
        {/* Spacer for sticky footer */}
        <View style={{height: 80}} />
      </ScrollView>

      {/* STICKY FOOTER */}
      <View style={styles.stickyFooter}>
        <Pressable
          testID={adminTestIds.careRequests.create.submitButton}
          nativeID={adminTestIds.careRequests.create.submitButton}
          style={styles.buttonPrimary}
          onPress={handleSubmit}
          disabled={submitting}
        >
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
  progressCard: { backgroundColor: "#f8fbff", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14, marginBottom: 12, gap: 8 },
  statusChip: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, fontWeight: "800" },
  statusChipWarning: { backgroundColor: "#fef3c7", color: "#92400e" },
  statusChipSuccess: { backgroundColor: "#dcfce7", color: "#166534" },
  progressHelper: { color: "#52637a", fontSize: 13, lineHeight: 18 },
  scrollContent: { paddingBottom: 24 },
  card: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#102a43", marginBottom: 12 },
  subtitle: { fontSize: 13, color: "#52637a", marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "700", color: "#7c2d12", marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e0", borderRadius: 12, padding: 12, fontSize: 15 },
  inputActive: { borderColor: "#3b82f6", borderWidth: 2 },
  inputError: { borderColor: "#dc2626" },
  errorText: { color: "#dc2626", fontSize: 12, marginTop: 4 },
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
  accordionHeaderDisabled: { opacity: 0.6 },
  accordionTitle: { fontSize: 15, fontWeight: "700", color: "#52637a" },
  accordionIcon: { fontSize: 14, color: "#52637a", fontWeight: "700" },
  accordionContent: { padding: 16, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  lockedAccordionNotice: { paddingHorizontal: 16, paddingBottom: 16 },
  lockedAccordionText: { color: "#7c2d12", fontSize: 13, lineHeight: 18 },
  reviewCard: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14, marginBottom: 12 },
  reviewHelper: { color: "#52637a", fontSize: 13, lineHeight: 18, marginBottom: 12 },
  reviewChecklist: { gap: 8 },
  reviewChecklistItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewChecklistDot: { fontSize: 14, fontWeight: "800" },
  reviewChecklistDotComplete: { color: "#16a34a" },
  reviewChecklistDotPending: { color: "#92400e" },
  reviewChecklistText: { color: "#102a43", fontSize: 14 },

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
