import { createElement, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { createCorrelationId, logClientEvent } from "@/src/logging/clientLogger";
import { getAvailableNurses, getCareRequestOptions } from "@/src/services/catalogOptionsService";
import { createCareRequest, getCareRequests } from "@/src/services/careRequestService";
import type { AvailableNurseOption, CatalogOptionsResponse } from "@/src/types/catalog";
import { CreateCareRequestDto } from "@/src/types/careRequest";
import { estimateCareRequestPricingFromCatalog } from "@/src/utils/pricingFromCatalogOptions";

export default function CreateCareRequestScreen() {
  const { isAuthenticated, isReady, token, userId, roles } = useAuth();
  const canCreateRequest = roles.includes("CLIENT") || roles.includes("ADMIN");
  const [form, setForm] = useState<CreateCareRequestDto>({
    careRequestDescription: "",
    suggestedNurse: "",
    careRequestDate: undefined,
    careRequestType: "",
    unit: 1,
    distanceFactor: "local",
    complexityLevel: "estandar",
    clientBasePriceOverride: undefined,
    medicalSuppliesCost: undefined,
  });
  const [isLoading, setIsLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [existingSameUnitTypeCount, setExistingSameUnitTypeCount] = useState<number>(0);
  const [catalogOptions, setCatalogOptions] = useState<CatalogOptionsResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [availableNurses, setAvailableNurses] = useState<AvailableNurseOption[]>([]);
  const [nurseLookupLoading, setNurseLookupLoading] = useState(false);
  const [nurseLookupError, setNurseLookupError] = useState<string | null>(null);
  const [showSuggestedNurseOptions, setShowSuggestedNurseOptions] = useState(false);
  const [selectedNurse, setSelectedNurse] = useState<AvailableNurseOption | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [draftServiceDate, setDraftServiceDate] = useState<Date>(new Date());
  
  // UX States
  const [draftCareRequestType, setDraftCareRequestType] = useState("");

  const incrementUnit = () => setForm((prev) => ({ ...prev, unit: (prev.unit || 0) + 1 }));
  const decrementUnit = () => setForm((prev) => ({ ...prev, unit: Math.max(1, (prev.unit || 0) - 1) }));

  const normalizeSearchValue = (value: string) => value.trim().toLocaleLowerCase();
  const formatDateToIso = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const parseIsoDate = (value?: string) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const parsedDate = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }
    return parsedDate;
  };

  const buildNurseDisplayName = (nurse: AvailableNurseOption) => nurse.displayName;

  const selectedType = catalogOptions?.careRequestTypes.find((t) => t.code === form.careRequestType);
  const selectedCategory = selectedType?.careRequestCategoryCode ?? "";
  const derivedUnitType = selectedType?.unitTypeCode ?? "";
  const isDomicilio = selectedCategory === "domicilio";
  const isHogarOrDomicilio = selectedCategory === "hogar" || isDomicilio;
  const isMedicos = selectedCategory === "medicos";

  const categoryDisplayName =
    catalogOptions?.careRequestCategories.find((c) => c.code === selectedCategory)?.displayName ??
    selectedCategory;

  const pricingEstimate = useMemo(() => {
    if (!catalogOptions || !form.careRequestType) {
      return null;
    }

    try {
      return estimateCareRequestPricingFromCatalog(catalogOptions, {
        careRequestTypeCode: form.careRequestType,
        unit: form.unit ?? 1,
        clientBasePriceOverride: form.clientBasePriceOverride,
        distanceFactorCode: isDomicilio ? form.distanceFactor : undefined,
        complexityLevelCode: isHogarOrDomicilio ? form.complexityLevel : undefined,
        medicalSuppliesCost:
          isMedicos && typeof form.medicalSuppliesCost === "number" ? form.medicalSuppliesCost : undefined,
        existingSameUnitTypeCount,
      });
    } catch {
      return null;
    }
  }, [
    catalogOptions,
    form.careRequestType,
    form.unit,
    form.clientBasePriceOverride,
    form.distanceFactor,
    form.complexityLevel,
    form.medicalSuppliesCost,
    isDomicilio,
    isHogarOrDomicilio,
    isMedicos,
    existingSameUnitTypeCount,
  ]);

  const filteredNurseSuggestions = useMemo(() => {
    const query = normalizeSearchValue(form.suggestedNurse ?? "");
    if (!query) {
      return availableNurses.slice(0, 8);
    }

    return availableNurses
      .filter((nurse) => {
        const displayName = buildNurseDisplayName(nurse);
        const specialty = nurse.specialty ?? "";
        const category = nurse.category ?? "";

        return [displayName, specialty, category].some((value) =>
          normalizeSearchValue(value).includes(query),
        );
      })
      .slice(0, 8);
  }, [availableNurses, form.suggestedNurse]);

  const unitPrice = pricingEstimate?.unitPriceAfterVolumeDiscount ?? 0;
  const medicalSupplies =
    isMedicos && typeof form.medicalSuppliesCost === "number" && form.medicalSuppliesCost >= 0
      ? form.medicalSuppliesCost
      : 0;
  const estimatedTotal = pricingEstimate?.grandTotal ?? 0;

  const resetForm = () => {
    const firstType = catalogOptions?.careRequestTypes[0]?.code ?? "";
    setForm({
      careRequestDescription: "",
      suggestedNurse: "",
      careRequestDate: undefined,
      careRequestType: firstType,
      unit: 1,
      distanceFactor: catalogOptions?.distanceFactors[0]?.code ?? "local",
      complexityLevel: catalogOptions?.complexityLevels[0]?.code ?? "estandar",
      clientBasePriceOverride: undefined,
      medicalSuppliesCost: undefined,
    });
    setSelectedNurse(null);
    setShowSuggestedNurseOptions(false);
    setDraftCareRequestType(firstType);
    setSuccessMessage(null);
    setFormError(null);
  };

  const openDatePicker = () => {
    setDraftServiceDate(parseIsoDate(form.careRequestDate) ?? new Date());
    setIsDatePickerVisible(true);
  };

  const confirmDateSelection = () => {
    setForm((prev) => ({ ...prev, careRequestDate: formatDateToIso(draftServiceDate) }));
    setIsDatePickerVisible(false);
  };

  const closeDatePicker = () => {
    setIsDatePickerVisible(false);
  };

  const clearSelectedDate = () => {
    setForm((prev) => ({ ...prev, careRequestDate: undefined }));
  };

  const handleNativeDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      if (event.type === "set" && selectedDate) {
        setForm((prev) => ({ ...prev, careRequestDate: formatDateToIso(selectedDate) }));
      }
      setIsDatePickerVisible(false);
      return;
    }

    if (selectedDate) {
      setDraftServiceDate(selectedDate);
    }
  };

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === "web") {
      // On web, Alert.alert is a no-op; use window.alert as fallback for blocking feedback
      if (typeof window !== "undefined" && window.alert) {
        window.alert(`${title}\n${message}`);
      }
      onOk?.();
    } else {
      Alert.alert(title, message, onOk ? [{ text: "Aceptar", onPress: onOk }] : undefined);
    }
  };

  const onSubmit = async () => {
    // Synchronous guard to prevent duplicate submissions
    if (isSubmittingRef.current) return;

    if (!form.careRequestDescription.trim() || !form.careRequestType) {
      logClientEvent("mobile.ui", "Solicitud bloqueada por validacion", {
        descriptionPresent: Boolean(form.careRequestDescription.trim()),
        careRequestTypePresent: Boolean(form.careRequestType),
      });
      const msg = "La descripcion de la solicitud y el tipo de servicio son obligatorios.";
      setFormError(msg);

      showAlert("Validacion", msg);
      return;
    }

    if (!canCreateRequest) {
      const msg = "Solo los perfiles de cliente o administracion pueden crear solicitudes de cuidado.";
      setFormError(msg);

      showAlert("Accion no permitida", msg);
      return;
    }

    if (!isReady) {
      logClientEvent("mobile.ui", "Solicitud bloqueada mientras la sesion termina de cargar");
      const msg = "La sesion todavia se esta preparando. Espera un momento e intenta de nuevo.";
      setFormError(msg);

      showAlert("Sesion cargando", msg);
      return;
    }

    if (!token || !userId) {
      logClientEvent("mobile.ui", "Solicitud bloqueada por sesion incompleta");
      const msg = "Inicia sesion nuevamente antes de crear una solicitud.";
      setFormError(msg);

      showAlert("Autenticacion requerida", msg);
      return;
    }

    const correlationId = createCorrelationId();

    isSubmittingRef.current = true;
    setIsLoading(true);
    setSuccessMessage(null);
    setFormError(null);
    logClientEvent("mobile.ui", "Formulario de solicitud enviado", {
      correlationId,
      userId,
      careRequestType: form.careRequestType,
      descriptionLength: form.careRequestDescription.length,
    });

    try {
      const response = await createCareRequest(
        {
          ...form,
          suggestedNurse: selectedNurse?.displayName,
        },
        correlationId,
      );
      logClientEvent("mobile.ui", "Solicitud creada correctamente", {
        correlationId: response.correlationId ?? correlationId,
        userId,
        createdId: response.id,
      });

      // Reset form and redirect immediately (don't depend on Alert callback)
      resetForm();
      router.push("/care-requests" as any);
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
      setFormError(errorMessage);

      showAlert("Error", errorMessage);
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isReady && isAuthenticated && !canCreateRequest) {
      router.replace("/care-requests");
    }
  }, [canCreateRequest, isAuthenticated, isReady]);

  useEffect(() => {
    if (!token) {
      setCatalogLoading(false);
      return;
    }

    setCatalogLoading(true);
    setCatalogError(null);
    void getCareRequestOptions(token)
      .then((options) => {
        setCatalogOptions(options);
        setForm((prev) => {
          const nextType =
            prev.careRequestType && options.careRequestTypes.some((t) => t.code === prev.careRequestType)
              ? prev.careRequestType
              : options.careRequestTypes[0]?.code ?? "";
          return {
            ...prev,
            careRequestType: nextType,
            distanceFactor: options.distanceFactors[0]?.code ?? "local",
            complexityLevel: options.complexityLevels[0]?.code ?? "estandar",
          };
        });
      })
      .catch((e: unknown) => {
        setCatalogError(e instanceof Error ? e.message : "No fue posible cargar el catalogo.");
      })
      .finally(() => setCatalogLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !canCreateRequest) {
      setAvailableNurses([]);
      setSelectedNurse(null);
      setNurseLookupLoading(false);
      setNurseLookupError(null);
      return;
    }

    setNurseLookupLoading(true);
    setNurseLookupError(null);
    void getAvailableNurses()
      .then((nurses) => {
        setAvailableNurses(nurses);
        setNurseLookupError(null);
      })
      .catch((error: unknown) => {
        setAvailableNurses([]);
        setNurseLookupError(
          error instanceof Error ? error.message : "No fue posible cargar la lista de enfermeras.",
        );
      })
      .finally(() => setNurseLookupLoading(false));
  }, [canCreateRequest, token]);

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
      actions={null}
    >
      <View style={styles.flow}>
          {!!formError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{formError}</Text>
              <Pressable onPress={() => setFormError(null)}>
                <Text style={styles.errorBannerDismiss}>✕</Text>
              </Pressable>
            </View>
          )}
          {!!successMessage && (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>{successMessage}</Text>
            </View>
          )}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Datos de la solicitud</Text>
              <Text style={styles.sectionCopy}>
                Esta solicitud se enviara al mismo backend protegido que usa la app web.
              </Text>
            </View>

            {catalogError ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{catalogError}</Text>
              </View>
            ) : null}

            {catalogLoading ? (
              <View style={styles.warningBox}>
                <ActivityIndicator color="#132d75" />
                <Text style={styles.warningText}>Cargando catalogo de precios...</Text>
              </View>
            ) : null}

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

            <Text style={styles.label}>Fecha del servicio (opcional)</Text>
            {Platform.OS === "web" ? (
              <View>
                {createElement("input", {
                  type: "date",
                  value: form.careRequestDate || "",
                  onChange: (e: any) => setForm((prev) => ({ ...prev, careRequestDate: e.target.value || undefined })),
                  disabled: isLoading,
                  placeholder: "YYYY-MM-DD",
                  style: {
                    padding: "12px",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e0",
                    backgroundColor: isLoading ? "#f1f5f9" : "#ffffff",
                    fontSize: "15px",
                    minHeight: "48px",
                    width: "100%",
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                    opacity: isLoading ? 0.5 : 1
                  }
                })}
                {!isLoading && (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <Pressable 
                      style={{ flex: 1, backgroundColor: "#f0f4f8", padding: 8, borderRadius: 8, alignItems: "center" }}
                      onPress={() => setForm((prev) => ({ ...prev, careRequestDate: formatDateToIso(new Date()) }))}
                    >
                      <Text style={{ fontSize: 13, color: "#102a43", fontWeight: "600" }}>Hoy</Text>
                    </Pressable>
                    <Pressable 
                      style={{ flex: 1, backgroundColor: "#f0f4f8", padding: 8, borderRadius: 8, alignItems: "center" }}
                      onPress={() => {
                        const d = new Date(); d.setDate(d.getDate() + 1);
                        setForm((prev) => ({ ...prev, careRequestDate: formatDateToIso(d) }));
                      }}
                    >
                      <Text style={{ fontSize: 13, color: "#102a43", fontWeight: "600" }}>Mañana</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : (
              <Pressable
                onPress={openDatePicker}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.input,
                  styles.datePickerTrigger,
                  isLoading && styles.inputDisabled,
                  pressed && !isLoading && styles.buttonPressed,
                ]}
              >
                <Text style={form.careRequestDate ? styles.dateValue : styles.datePlaceholder}>
                  {form.careRequestDate ?? "Selecciona una fecha"}
                </Text>
              </Pressable>
            )}
            <View style={styles.dateActionsRow}>
              {Platform.OS !== "web" && (
                <Pressable
                  onPress={openDatePicker}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.dateActionButton,
                    styles.datePrimaryAction,
                    isLoading && styles.buttonDisabled,
                    pressed && !isLoading && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.datePrimaryActionText}>Elegir fecha</Text>
                </Pressable>
              )}
              <Pressable
                onPress={clearSelectedDate}
                disabled={isLoading || !form.careRequestDate}
                style={({ pressed }) => [
                  styles.dateActionButton,
                  styles.dateSecondaryAction,
                  (isLoading || !form.careRequestDate) && styles.buttonDisabled,
                  pressed && !isLoading && styles.buttonPressed,
                ]}
              >
                <Text style={styles.dateSecondaryActionText}>Limpiar fecha</Text>
              </Pressable>
            </View>
            <Text style={styles.helperText}>
              La enfermera asignada no podra completar la solicitud antes de la fecha indicada.
            </Text>

            <Text style={styles.label}>Servicio *</Text>
            {catalogLoading ? (
               <ActivityIndicator color="#132d75" style={{ alignSelf: "flex-start", marginVertical: 8 }} />
            ) : (
              <View style={styles.chipsContainer}>
                {(catalogOptions?.careRequestTypes ?? []).map(row => (
                  <Pressable 
                    key={row.code}
                    onPress={() => setForm({ ...form, careRequestType: row.code })}
                    style={[styles.chip, form.careRequestType === row.code && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, form.careRequestType === row.code && styles.chipTextActive]}>
                      {row.displayName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.label}>Cantidad *</Text>
            <View style={styles.stepperContainer}>
              <Pressable onPress={decrementUnit} style={styles.stepperBtn}><Text style={styles.stepperBtnText}>-</Text></Pressable>
              <Text style={styles.stepperValue}>{form.unit}</Text>
              <Pressable onPress={incrementUnit} style={styles.stepperBtn}><Text style={styles.stepperBtnText}>+</Text></Pressable>
            </View>

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
          </View>

          {/* === CARD 2: NURSE === */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Enfermera sugerida (opcional)</Text>
            </View>

            <TextInput
              value={form.suggestedNurse ?? ""}
              onChangeText={(text) => {
                setForm((prev) => ({ ...prev, suggestedNurse: text }));
                setSelectedNurse((prev) =>
                  prev && normalizeSearchValue(prev.displayName) === normalizeSearchValue(text) ? prev : null,
                );
                setShowSuggestedNurseOptions(true);
              }}
              placeholder="Nombre de la enfermera preferida"
              editable={!isLoading}
              onFocus={() => setShowSuggestedNurseOptions(true)}
              testID="create-care-request-suggested-nurse-input"
              nativeID="create-care-request-suggested-nurse-input"
              style={[styles.input, isLoading && styles.inputDisabled]}
            />
            {showSuggestedNurseOptions && !isLoading && (
                <View
                  style={styles.autocompletePanel}
                  testID="create-care-request-suggested-nurse-options"
                  nativeID="create-care-request-suggested-nurse-options"
                >
                  {nurseLookupLoading ? (
                    <View style={styles.autocompleteLoadingRow}>
                      <ActivityIndicator color="#132d75" />
                      <Text style={styles.autocompleteHelperText}>Buscando enfermeras activas...</Text>
                    </View>
                  ) : nurseLookupError ? (
                    <View style={styles.autocompleteLoadingRow}>
                      <Text style={styles.autocompleteHelperText}>{nurseLookupError}</Text>
                    </View>
                  ) : filteredNurseSuggestions.length === 0 ? (
                    <View style={styles.autocompleteLoadingRow}>
                      <Text style={styles.autocompleteHelperText}>No se encontraron enfermeras.</Text>
                    </View>
                  ) : (
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                      style={styles.autocompleteList}
                    >
                      {filteredNurseSuggestions.map((nurse) => {
                        const displayName = buildNurseDisplayName(nurse);
                        const meta = [nurse.specialty, nurse.category].filter(Boolean).join(" • ");

                        return (
                          <Pressable
                            key={nurse.userId}
                            onPress={() => {
                              setSelectedNurse(nurse);
                              setForm((prev) => ({ ...prev, suggestedNurse: displayName }));
                              setShowSuggestedNurseOptions(false);
                            }}
                            style={({ pressed }) => [
                              styles.autocompleteOption,
                              pressed && styles.buttonPressed,
                            ]}
                            testID={`create-care-request-suggested-nurse-option-${nurse.userId}`}
                            nativeID={`create-care-request-suggested-nurse-option-${nurse.userId}`}
                          >
                            <Text style={styles.autocompletePrimaryText}>{displayName}</Text>
                            {meta ? <Text style={styles.autocompleteSecondaryText}>{meta}</Text> : null}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}
            <Text style={styles.helperText}>
              Administracion decidira si asigna la enfermera sugerida u otra disponible.
            </Text>
          </View>

          {/* ADVANCED PRICING REMOVED FOR CLIENT APP */}

          {/* === CARD 3: CHECKLIST AND ESTIMATION === */}
          <View style={styles.card}>
            <View style={styles.checklist}>
              <Text style={styles.checklistTitle}>Estimacion de servicio</Text>
              <Text style={styles.checkItem}>
                Total estimado: {Number.isFinite(estimatedTotal) ? estimatedTotal.toFixed(2) : "0.00"}
              </Text>
              <Text style={styles.checkItem}>
                Servicio: {selectedType?.displayName ?? form.careRequestType}
              </Text>
              <Text style={styles.checkItem}>
                Tipo de unidad: {derivedUnitType} • Categoria: {categoryDisplayName}
              </Text>
            </View>

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

            <View style={{height: 80}} />
          </View>
      </View>
      <View style={styles.stickyFooter}>
        <Pressable style={styles.buttonPrimary} onPress={onSubmit} disabled={isLoading || !canCreateRequest}>
          <Text style={styles.buttonPrimaryText}>{isLoading ? "Creando Solicitud..." : "Generar Solicitud de Cuidado"}</Text>
        </Pressable>
      </View>
      {isDatePickerVisible && Platform.OS !== "web" ? (
        Platform.OS === "ios" ? (
          <Modal transparent animationType="slide" visible={isDatePickerVisible} onRequestClose={closeDatePicker}>
            <View style={styles.dateModalBackdrop}>
              <View style={styles.dateModalContent}>
                <Text style={styles.dateModalTitle}>Selecciona la fecha del servicio</Text>
                <DateTimePicker
                  value={draftServiceDate}
                  mode="date"
                  display="spinner"
                  onChange={handleNativeDateChange}
                />
                <View style={styles.dateModalActions}>
                  <Pressable style={styles.dateModalCancelButton} onPress={closeDatePicker}>
                    <Text style={styles.dateModalCancelText}>Cancelar</Text>
                  </Pressable>
                  <Pressable style={styles.dateModalConfirmButton} onPress={confirmDateSelection}>
                    <Text style={styles.dateModalConfirmText}>Guardar</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={parseIsoDate(form.careRequestDate) ?? new Date()}
            mode="date"
            display="default"
            onChange={handleNativeDateChange}
          />
        )
      ) : null}
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  flow: {
    gap: 16,
  },
  subtitle: { fontSize: 13, color: "#5f7280", marginBottom: 12 },
  chipsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { backgroundColor: "#f4f2ec", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: "rgba(23, 48, 66, 0.15)" },
  chipActive: { backgroundColor: "#1f4b6e", borderColor: "#173042" },
  chipText: { color: "#5f7280", fontWeight: "600", fontSize: 14 },
  chipTextActive: { color: "#ffffff" },
  
  stepperContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#f4f2ec", borderRadius: 12, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(23, 48, 66, 0.15)", marginBottom: 18 },
  stepperBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  stepperBtnText: { fontSize: 20, fontWeight: "700", color: "#173042" },
  stepperValue: { fontSize: 16, fontWeight: "800", color: "#173042", minWidth: 40, textAlign: "center" },

  stickyFooter: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 32 : 16, backgroundColor: "#ffffff", borderTopWidth: 1, borderTopColor: "#e2e8f0", shadowColor: "#152230", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 12 },
  buttonPrimary: { backgroundColor: "#1f4b6e", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  buttonPrimaryText: { color: "#ffffff", fontWeight: "800", fontSize: 16 },
  card: {
    backgroundColor: "#fffdf8",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#152230",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.08)",
  },
  sectionHeader: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#173042",
    marginBottom: 6,
  },
  sectionCopy: {
    fontSize: 14,
    lineHeight: 22,
    color: "#5f7280",
  },
  warningBox: {
    backgroundColor: "#fff5f5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#fed7d7",
  },
  warningText: {
    color: "#b91c1c",
    lineHeight: 20,
    fontWeight: "600",
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#173042",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 18,
    fontSize: 16,
    color: "#173042",
    backgroundColor: "#ffffff",
  },
  textArea: {
    minHeight: 120,
  },
  datePickerTrigger: {
    justifyContent: "center",
  },
  dateValue: {
    fontSize: 16,
    color: "#173042",
  },
  datePlaceholder: {
    fontSize: 16,
    color: "#5f7280",
  },
  dateActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: -8,
    marginBottom: 16,
  },
  dateActionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  datePrimaryAction: {
    borderColor: "rgba(31, 75, 110, 0.2)",
    backgroundColor: "#f4f2ec",
  },
  dateSecondaryAction: {
    borderColor: "rgba(23, 48, 66, 0.15)",
    backgroundColor: "#ffffff",
  },
  datePrimaryActionText: {
    color: "#1f4b6e",
    fontWeight: "700",
  },
  dateSecondaryActionText: {
    color: "#5f7280",
    fontWeight: "700",
  },
  dateModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(23, 48, 66, 0.4)",
    justifyContent: "flex-end",
  },
  dateModalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 26,
    gap: 12,
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#173042",
    textAlign: "center",
  },
  dateModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  dateModalCancelButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.15)",
    paddingVertical: 12,
    alignItems: "center",
  },
  dateModalCancelText: {
    color: "#5f7280",
    fontWeight: "700",
  },
  dateModalConfirmButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#1f4b6e",
    paddingVertical: 12,
    alignItems: "center",
  },
  dateModalConfirmText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  helperText: {
    marginTop: -10,
    marginBottom: 16,
    fontSize: 13,
    color: "#5f7280",
  },
  inputDisabled: {
    opacity: 0.65,
  },
  autocompletePanel: {
    marginTop: -8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.15)",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    zIndex: 20,
    elevation: 6,
  },
  autocompleteList: {
    maxHeight: 220,
  },
  autocompleteLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  autocompleteOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f2ec",
  },
  autocompletePrimaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#173042",
  },
  autocompleteSecondaryText: {
    marginTop: 4,
    fontSize: 13,
    color: "#5f7280",
  },
  autocompleteHelperText: {
    fontSize: 13,
    color: "#5f7280",
  },
  checklist: {
    backgroundColor: "#f4f2ec",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.08)",
  },
  checklistTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1f4b6e",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  checkItem: {
    fontSize: 14,
    lineHeight: 22,
    color: "#173042",
    marginBottom: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  errorBannerText: {
    color: "#991b1b",
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  errorBannerDismiss: {
    color: "#991b1b",
    fontSize: 18,
    fontWeight: "800",
    paddingHorizontal: 4,
  },
  successBanner: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 12,
    padding: 14,
  },
  successBannerText: {
    color: "#166534",
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 20,
  },
});
