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
  View,
} from "react-native";
import { router } from "expo-router";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { FormInput } from "@/src/components/form";
import { designTokens } from "@/src/design-system/tokens";
import { careRequestTestIds } from "@/src/testing/testIds";
import { useAuth } from "@/src/context/AuthContext";
import { createCorrelationId, logClientEvent } from "@/src/logging/clientLogger";
import { getAvailableNurses, getCareRequestOptions } from "@/src/services/catalogOptionsService";
import { createCareRequest, getCareRequests } from "@/src/services/careRequestService";
import {
  getAdminClients,
  type AdminClientListItemDto,
} from "@/src/services/adminPortalService";
import type {
  AvailableNurseOption,
  CareRequestTypeOption,
  CatalogOptionsResponse,
} from "@/src/types/catalog";
import { CreateCareRequestDto } from "@/src/types/careRequest";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { estimateCareRequestPricingFromCatalog } from "@/src/utils/pricingFromCatalogOptions";

// Category labels + order — keep in sync with the admin create page so the
// two surfaces look the same. The list shown to the user is built by
// grouping `catalog.careRequestTypes` by their `careRequestCategoryCode`.
const CATEGORY_LABELS: Record<string, string> = {
  hogar: "Hogar",
  domicilio: "Domicilio",
  medicos: "Médicos",
};
const CATEGORY_ORDER = ["hogar", "domicilio", "medicos"];

export default function CreateCareRequestScreen() {
  const { isAuthenticated, isReady, token, userId, roles } = useAuth();
  const isAdminCaller = roles.includes("ADMIN");
  const canCreateRequest = roles.includes("CLIENT") || isAdminCaller;
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
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [activeCategoryCode, setActiveCategoryCode] = useState<string>("hogar");

  // Client selector (admin-only). When ADMIN creates a care request, the form
  // requires picking a real CLIENT user. The selected client's userId is sent
  // as `clientUserId`; the backend uses it instead of the JWT subject.
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<AdminClientListItemDto | null>(null);
  const [clientOptions, setClientOptions] = useState<AdminClientListItemDto[]>([]);
  const [clientLookupLoading, setClientLookupLoading] = useState(false);
  const [clientLookupError, setClientLookupError] = useState<string | null>(null);
  const [showClientOptions, setShowClientOptions] = useState(false);

  // UX States
  const [draftCareRequestType, setDraftCareRequestType] = useState("");

  // Form is "dirty" when the user touched any meaningful field. Initial defaults
  // (empty description, no type, unit=1, distance=local, complexity=estandar)
  // are NOT dirty — only user edits beyond that count.
  const isDirty =
    form.careRequestDescription.trim().length > 0 ||
    !!form.careRequestType ||
    !!form.suggestedNurse?.trim() ||
    !!form.careRequestDate ||
    (form.unit ?? 1) !== 1 ||
    !!selectedNurse ||
    !!selectedClient ||
    clientSearchTerm.trim().length > 0;

  const exitToList = () => {
    setShowLeaveConfirm(false);
    goBackOrReplace(router, mobileNavigationEscapes.createCareRequest);
  };

  const handleBackPress = () => {
    if (isDirty && !isLoading) {
      setShowLeaveConfirm(true);
    } else {
      exitToList();
    }
  };

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

  // Group flat list of types by their category code. Ordering: prefer the
  // static CATEGORY_ORDER (hogar → domicilio → médicos), fall back to
  // appearance order if the backend ever introduces a new category.
  const typesByCategory = useMemo(() => {
    const map = new Map<string, CareRequestTypeOption[]>();
    if (!catalogOptions) return map;
    for (const t of catalogOptions.careRequestTypes) {
      const arr = map.get(t.careRequestCategoryCode);
      if (arr) arr.push(t);
      else map.set(t.careRequestCategoryCode, [t]);
    }
    return map;
  }, [catalogOptions]);

  const orderedCategoryCodes = useMemo(() => {
    if (!catalogOptions) return [] as string[];
    const present = Array.from(typesByCategory.keys());
    const known = CATEGORY_ORDER.filter((code) => present.includes(code));
    const extras = present.filter((code) => !CATEGORY_ORDER.includes(code));
    return [...known, ...extras];
  }, [catalogOptions, typesByCategory]);

  // Sync the active category tab with the picked type — when the user picks
  // a service from one category, the tab for that category becomes active so
  // the chip stays visible on subsequent re-renders.
  useEffect(() => {
    if (selectedType && selectedType.careRequestCategoryCode !== activeCategoryCode) {
      setActiveCategoryCode(selectedType.careRequestCategoryCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType?.code]);

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

  const filteredClientSuggestions = useMemo(() => {
    const query = normalizeSearchValue(clientSearchTerm);
    if (!query) return clientOptions.slice(0, 8);
    return clientOptions
      .filter((client) => {
        const fields = [
          client.displayName,
          client.email,
          client.identificationNumber ?? "",
          client.phone ?? "",
        ];
        return fields.some((value) => normalizeSearchValue(value).includes(query));
      })
      .slice(0, 8);
  }, [clientOptions, clientSearchTerm]);

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
    setSelectedClient(null);
    setClientSearchTerm("");
    setShowClientOptions(false);
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

    if (isAdminCaller && !selectedClient) {
      const msg = "Selecciona el cliente para el cual se crea la solicitud.";
      setFormError(msg);
      showAlert("Cliente requerido", msg);
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
          // Admin caller: send the picked client's userId so the backend
          // creates the request FOR that client (not for the admin).
          // Client caller: leave undefined; backend uses the JWT subject.
          clientUserId: isAdminCaller ? selectedClient?.userId : undefined,
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

  // Load the client list for admins. Searches re-fetch on the server when the
  // term gets long enough; while typing 1–2 chars we filter the cached page
  // client-side to avoid spamming the API.
  useEffect(() => {
    if (!isAdminCaller || !token) {
      setClientOptions([]);
      return;
    }
    let cancelled = false;
    setClientLookupLoading(true);
    setClientLookupError(null);
    const trimmed = clientSearchTerm.trim();
    const params = trimmed.length >= 3 ? { search: trimmed, status: "active" as const } : { status: "active" as const };
    getAdminClients(params)
      .then((clients) => {
        if (cancelled) return;
        setClientOptions(clients);
        setClientLookupError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setClientOptions([]);
        setClientLookupError(err instanceof Error ? err.message : "No fue posible cargar la lista de clientes.");
      })
      .finally(() => {
        if (!cancelled) setClientLookupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdminCaller, token, clientSearchTerm]);

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
      title="Nueva Solicitud"
      testID={careRequestTestIds.create.screen}
      nativeID={careRequestTestIds.create.screen}
      primaryReturnLabel="Volver"
      onPrimaryReturn={handleBackPress}
      workflowActions={[
        {
          label: isLoading ? "Creando…" : "Crear",
          onPress: onSubmit,
          variant: "primary",
          disabled: isLoading || !canCreateRequest,
          testID: careRequestTestIds.create.submitButton,
        },
      ]}
    >
      <View style={styles.flow}>
          {!!formError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{formError}</Text>
              <Pressable
                onPress={() => setFormError(null)}
                accessibilityRole="button"
                accessibilityLabel="Cerrar mensaje de error"
              >
                <Text style={styles.errorBannerDismiss}>✕</Text>
              </Pressable>
            </View>
          )}
          {!!successMessage && (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>{successMessage}</Text>
            </View>
          )}
          {isAdminCaller ? (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Cliente</Text>
              </View>

              <FormInput
                testID={careRequestTestIds.create.clientInput}
                value={selectedClient ? `${selectedClient.displayName}` : clientSearchTerm}
                onChangeText={(text) => {
                  setClientSearchTerm(text);
                  if (selectedClient && normalizeSearchValue(selectedClient.displayName) !== normalizeSearchValue(text)) {
                    setSelectedClient(null);
                  }
                  setShowClientOptions(true);
                }}
                onFocus={() => setShowClientOptions(true)}
                placeholder="Buscar por nombre, correo, cédula o teléfono"
                editable={!isLoading}
                style={isLoading ? styles.inputDisabled : undefined}
              />

              {selectedClient ? (
                <View style={styles.selectedClientRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedClientName} numberOfLines={1}>
                      {selectedClient.displayName}
                    </Text>
                    <Text style={styles.selectedClientMeta} numberOfLines={1}>
                      {selectedClient.email}
                      {selectedClient.identificationNumber ? ` • Cédula ${selectedClient.identificationNumber}` : ""}
                    </Text>
                  </View>
                  <Pressable
                    testID={careRequestTestIds.create.clientClearButton}
                    nativeID={careRequestTestIds.create.clientClearButton}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar cliente seleccionado"
                    onPress={() => {
                      setSelectedClient(null);
                      setClientSearchTerm("");
                      setShowClientOptions(true);
                    }}
                    hitSlop={8}
                    style={({ pressed }) => [styles.selectedClientClear, pressed && styles.buttonPressed]}
                  >
                    <Text style={styles.selectedClientClearText}>Cambiar</Text>
                  </Pressable>
                </View>
              ) : null}

              {showClientOptions && !selectedClient && !isLoading ? (
                <View
                  style={styles.autocompletePanel}
                  testID={careRequestTestIds.create.clientOptions}
                  nativeID={careRequestTestIds.create.clientOptions}
                >
                  {clientLookupLoading ? (
                    <View style={styles.autocompleteLoadingRow}>
                      <ActivityIndicator color={designTokens.color.ink.accentStrong} accessibilityLabel="Cargando..." />
                      <Text style={styles.autocompleteHelperText}>Buscando clientes...</Text>
                    </View>
                  ) : clientLookupError ? (
                    <View style={styles.autocompleteLoadingRow}>
                      <Text style={styles.autocompleteHelperText}>{clientLookupError}</Text>
                    </View>
                  ) : filteredClientSuggestions.length === 0 ? (
                    <View style={styles.autocompleteLoadingRow}>
                      <Text style={styles.autocompleteHelperText}>
                        {clientSearchTerm.trim().length === 0
                          ? "No hay clientes activos."
                          : "No se encontraron clientes para esa búsqueda."}
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                      style={styles.autocompleteList}
                    >
                      {filteredClientSuggestions.map((client) => {
                        const meta = [
                          client.email,
                          client.identificationNumber ? `Cédula ${client.identificationNumber}` : null,
                          client.phone,
                        ]
                          .filter(Boolean)
                          .join(" • ");
                        return (
                          <Pressable
                            key={client.userId}
                            testID={careRequestTestIds.create.clientOption(client.userId)}
                            nativeID={careRequestTestIds.create.clientOption(client.userId)}
                            onPress={() => {
                              setSelectedClient(client);
                              setClientSearchTerm(client.displayName);
                              setShowClientOptions(false);
                            }}
                            style={({ pressed }) => [
                              styles.autocompleteOption,
                              pressed && styles.buttonPressed,
                            ]}
                          >
                            <Text style={styles.autocompletePrimaryText}>{client.displayName}</Text>
                            {meta ? <Text style={styles.autocompleteSecondaryText}>{meta}</Text> : null}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Datos de la Solicitud</Text>
            </View>

            {catalogError ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{catalogError}</Text>
              </View>
            ) : null}

            {catalogLoading ? (
              <View style={styles.warningBox}>
                <ActivityIndicator color={designTokens.color.ink.accentStrong} accessibilityLabel="Cargando..." />
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
                    border: `1px solid ${designTokens.color.border.subtle}`,
                    backgroundColor: isLoading ? designTokens.color.surface.secondary : designTokens.color.ink.inverse,
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
                      style={{ flex: 1, backgroundColor: designTokens.color.surface.secondary, padding: 8, borderRadius: 8, alignItems: "center" }}
                      onPress={() => setForm((prev) => ({ ...prev, careRequestDate: formatDateToIso(new Date()) }))}
                      accessibilityRole="button"
                      accessibilityLabel="Seleccionar hoy como fecha del servicio"
                    >
                      <Text style={{ fontSize: 13, color: designTokens.color.ink.primary, fontWeight: "600" }}>Hoy</Text>
                    </Pressable>
                    <Pressable
                      style={{ flex: 1, backgroundColor: designTokens.color.surface.secondary, padding: 8, borderRadius: 8, alignItems: "center" }}
                      onPress={() => {
                        const d = new Date(); d.setDate(d.getDate() + 1);
                        setForm((prev) => ({ ...prev, careRequestDate: formatDateToIso(d) }));
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Seleccionar mañana como fecha del servicio"
                    >
                      <Text style={{ fontSize: 13, color: designTokens.color.ink.primary, fontWeight: "600" }}>Mañana</Text>
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
            <Text style={styles.label}>Servicio *</Text>
            {catalogLoading ? (
              <View style={styles.catalogLoading}>
                <ActivityIndicator color={designTokens.color.ink.accent} />
                <Text style={styles.catalogLoadingText}>Cargando tipos…</Text>
              </View>
            ) : catalogError ? (
              <Text style={styles.helperError}>{catalogError}</Text>
            ) : (
              <View>
                {/* Category tabs — compact horizontal row, one per category. */}
                <View style={styles.categoryRow}>
                  {orderedCategoryCodes.map((code) => {
                    const active = code === activeCategoryCode;
                    const label = CATEGORY_LABELS[code] ?? code;
                    const count = typesByCategory.get(code)?.length ?? 0;
                    return (
                      <Pressable
                        key={code}
                        onPress={() => setActiveCategoryCode(code)}
                        accessibilityRole="button"
                        accessibilityLabel={`Categoría ${label}`}
                        accessibilityState={{ selected: active }}
                        style={[styles.categoryTab, active && styles.categoryTabActive]}
                      >
                        <Text style={[styles.categoryTabText, active && styles.categoryTabTextActive]}>
                          {label}
                        </Text>
                        <Text style={[styles.categoryTabCount, active && styles.categoryTabCountActive]}>
                          {count}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Chips for the active category only — keeps the picker compact. */}
                <View style={styles.chipsContainer}>
                  {(typesByCategory.get(activeCategoryCode) ?? []).map((row) => {
                    const active = form.careRequestType === row.code;
                    return (
                      <Pressable
                        key={row.code}
                        accessibilityRole="button"
                        accessibilityLabel={row.displayName}
                        accessibilityState={{ selected: active }}
                        onPress={() => setForm({ ...form, careRequestType: row.code })}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {row.displayName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Confirmation pill with picked service + base price. */}
                {selectedType ? (
                  <View style={styles.selectedTypeRow}>
                    <Text style={styles.selectedTypeLabel}>Seleccionado:</Text>
                    <Text style={styles.selectedTypeValue}>
                      {selectedType.displayName} · RD${(selectedType.basePrice ?? 0).toLocaleString("es-DO")}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            <Text style={[styles.label, styles.labelSpaced]}>Cantidad *</Text>
            <View style={styles.stepperContainer}>
              <Pressable accessibilityRole="button" accessibilityLabel="Disminuir cantidad" onPress={decrementUnit} style={styles.stepperBtn}><Text style={styles.stepperBtnText}>-</Text></Pressable>
              <Text style={styles.stepperValue}>{form.unit}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Aumentar cantidad" onPress={incrementUnit} style={styles.stepperBtn}><Text style={styles.stepperBtnText}>+</Text></Pressable>
            </View>

            <FormInput
              testID={careRequestTestIds.create.descriptionInput}
              label="Descripcion de la solicitud"
              value={form.careRequestDescription}
              onChangeText={(text) => setForm((prev) => ({ ...prev, careRequestDescription: text }))}
              placeholder="Describe el cuidado requerido, urgencia, detalles clinicos y notas operativas."
              multiline
              textAlignVertical="top"
              editable={!isLoading}
              style={[styles.textArea, isLoading ? styles.inputDisabled : undefined]}
            />
          </View>

          {/* === CARD 2: NURSE === */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Enfermera sugerida (opcional)</Text>
            </View>

            <FormInput
              testID={careRequestTestIds.create.suggestedNurseInput}
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
              style={isLoading ? styles.inputDisabled : undefined}
            />
            {showSuggestedNurseOptions && !isLoading && (
                <View
                  style={styles.autocompletePanel}
                  testID={careRequestTestIds.create.suggestedNurseOptions}
                  nativeID={careRequestTestIds.create.suggestedNurseOptions}
                >
                  {nurseLookupLoading ? (
                    <View style={styles.autocompleteLoadingRow}>
                      <ActivityIndicator color={designTokens.color.ink.accentStrong} accessibilityLabel="Cargando..." />
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
          </View>

          {/* Compact estimation summary — no raw enum codes, no verbose
              checklist. Only what the user needs to confirm before tapping
              Crear: total, picked service. */}
          {selectedType ? (
            <View style={styles.estimateCard}>
              <Text style={styles.estimateLabel}>Total estimado</Text>
              <Text style={styles.estimateAmount}>
                RD${(Number.isFinite(estimatedTotal) ? estimatedTotal : 0).toLocaleString("es-DO", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
              <Text style={styles.estimateService}>
                {selectedType.displayName} · {form.unit ?? 1}× {categoryDisplayName}
              </Text>
            </View>
          ) : null}
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

      <Modal
        visible={showLeaveConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLeaveConfirm(false)}
      >
        <Pressable style={modalStyles.overlay} onPress={() => setShowLeaveConfirm(false)}>
          <Pressable style={modalStyles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={modalStyles.title}>¿Salir sin guardar?</Text>
            <Text style={modalStyles.body}>
              Tienes datos sin guardar. Si sales ahora se perderán.
            </Text>
            <View style={modalStyles.actions}>
              <Pressable
                style={[modalStyles.button, modalStyles.buttonSecondary]}
                onPress={() => setShowLeaveConfirm(false)}
                accessibilityRole="button"
                accessibilityLabel="Continuar editando"
              >
                <Text style={modalStyles.buttonText}>Continuar Editando</Text>
              </Pressable>
              <Pressable
                style={[modalStyles.button, modalStyles.buttonDanger]}
                onPress={exitToList}
                accessibilityRole="button"
                accessibilityLabel="Descartar y salir"
              >
                <Text style={[modalStyles.buttonText, modalStyles.buttonTextInverse]}>
                  Descartar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </MobileWorkspaceShell>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  sheet: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: 18,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: designTokens.color.ink.primary,
    marginBottom: 6,
  },
  body: {
    color: designTokens.color.ink.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: designTokens.color.surface.secondary,
  },
  buttonDanger: {
    backgroundColor: designTokens.color.ink.danger,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  buttonTextInverse: {
    color: designTokens.color.ink.inverse,
  },
});

const styles = StyleSheet.create({
  flow: {
    gap: 16,
  },
  subtitle: { fontSize: 13, color: designTokens.color.ink.secondary, marginBottom: 12 },
  chipsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { backgroundColor: designTokens.color.surface.secondary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: "rgba(23, 48, 66, 0.15)" },
  chipActive: { backgroundColor: designTokens.color.ink.accentStrong, borderColor: designTokens.color.ink.primary },
  chipText: { color: designTokens.color.ink.secondary, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: designTokens.color.ink.inverse },

  catalogLoading: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  catalogLoadingText: { color: designTokens.color.ink.secondary, fontSize: 13 },
  helperError: { color: designTokens.color.ink.danger, fontSize: 13, marginTop: 6 },
  categoryRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
    padding: 4,
    backgroundColor: designTokens.color.surface.secondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.12)",
  },
  categoryTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  categoryTabActive: {
    backgroundColor: designTokens.color.surface.primary,
    boxShadow: "0px 1px 2px rgba(15, 23, 42, 0.08)",
    elevation: 1,
  },
  categoryTabText: { color: designTokens.color.ink.secondary, fontWeight: "700", fontSize: 13 },
  categoryTabTextActive: { color: designTokens.color.ink.primary },
  categoryTabCount: { color: designTokens.color.ink.muted, fontSize: 11, fontWeight: "700", minWidth: 16, textAlign: "center" },
  categoryTabCountActive: { color: designTokens.color.ink.accent },
  selectedTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: designTokens.color.status.successBg,
    alignSelf: "flex-start",
  },
  selectedTypeLabel: { color: designTokens.color.status.successText, fontSize: 12, fontWeight: "700" },
  selectedTypeValue: { color: designTokens.color.ink.primary, fontSize: 13, fontWeight: "600" },

  estimateCard: {
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.12)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    gap: 4,
  },
  estimateLabel: {
    color: designTokens.color.ink.secondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  estimateAmount: {
    color: designTokens.color.ink.primary,
    fontSize: 26,
    fontWeight: "800",
  },
  estimateService: {
    color: designTokens.color.ink.secondary,
    fontSize: 13,
  },

  stepperContainer: { flexDirection: "row", alignItems: "center", backgroundColor: designTokens.color.surface.secondary, borderRadius: 12, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(23, 48, 66, 0.15)", marginBottom: 18 },
  stepperBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  stepperBtnText: { fontSize: 20, fontWeight: "700", color: designTokens.color.ink.primary },
  stepperValue: { fontSize: 16, fontWeight: "800", color: designTokens.color.ink.primary, minWidth: 40, textAlign: "center" },

  card: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: 12,
    padding: 16,
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.06)",
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
    color: designTokens.color.ink.primary,
    marginBottom: 6,
  },
  sectionCopy: {
    fontSize: 14,
    lineHeight: 22,
    color: designTokens.color.ink.secondary,
  },
  warningBox: {
    backgroundColor: designTokens.color.surface.danger,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  warningText: {
    color: designTokens.color.ink.danger,
    lineHeight: 20,
    fontWeight: "600",
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
    marginBottom: 8,
  },
  labelSpaced: {
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 18,
    fontSize: 16,
    color: designTokens.color.ink.primary,
    backgroundColor: designTokens.color.ink.inverse,
  },
  textArea: {
    minHeight: 120,
  },
  datePickerTrigger: {
    justifyContent: "center",
  },
  dateValue: {
    fontSize: 16,
    color: designTokens.color.ink.primary,
  },
  datePlaceholder: {
    fontSize: 16,
    color: designTokens.color.ink.secondary,
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
    backgroundColor: designTokens.color.surface.secondary,
  },
  dateSecondaryAction: {
    borderColor: "rgba(23, 48, 66, 0.15)",
    backgroundColor: designTokens.color.ink.inverse,
  },
  datePrimaryActionText: {
    color: designTokens.color.ink.accentStrong,
    fontWeight: "700",
  },
  dateSecondaryActionText: {
    color: designTokens.color.ink.secondary,
    fontWeight: "700",
  },
  dateModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(23, 48, 66, 0.4)",
    justifyContent: "flex-end",
  },
  dateModalContent: {
    backgroundColor: designTokens.color.ink.inverse,
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
    color: designTokens.color.ink.primary,
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
    color: designTokens.color.ink.secondary,
    fontWeight: "700",
  },
  dateModalConfirmButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: designTokens.color.ink.accentStrong,
    paddingVertical: 12,
    alignItems: "center",
  },
  dateModalConfirmText: {
    color: designTokens.color.ink.inverse,
    fontWeight: "800",
  },
  helperText: {
    marginTop: -10,
    marginBottom: 16,
    fontSize: 13,
    color: designTokens.color.ink.secondary,
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
    backgroundColor: designTokens.color.ink.inverse,
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
    borderBottomColor: designTokens.color.surface.secondary,
  },
  autocompletePrimaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  autocompleteSecondaryText: {
    marginTop: 4,
    fontSize: 13,
    color: designTokens.color.ink.secondary,
  },
  autocompleteHelperText: {
    fontSize: 13,
    color: designTokens.color.ink.secondary,
  },
  selectedClientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: designTokens.color.surface.accent,
    borderWidth: 1,
    borderColor: designTokens.color.border.accent,
  },
  selectedClientName: {
    fontSize: 15,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  selectedClientMeta: {
    marginTop: 2,
    fontSize: 12,
    color: designTokens.color.ink.secondary,
  },
  selectedClientClear: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  selectedClientClearText: {
    fontSize: 12,
    fontWeight: "800",
    color: designTokens.color.ink.accent,
  },
  checklist: {
    backgroundColor: designTokens.color.surface.secondary,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.08)",
  },
  checklistTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: designTokens.color.ink.accentStrong,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  checkItem: {
    fontSize: 14,
    lineHeight: 22,
    color: designTokens.color.ink.primary,
    marginBottom: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  errorBanner: {
    backgroundColor: designTokens.color.surface.danger,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  errorBannerText: {
    color: designTokens.color.ink.danger,
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  errorBannerDismiss: {
    color: designTokens.color.ink.danger,
    fontSize: 18,
    fontWeight: "800",
    paddingHorizontal: 4,
  },
  successBanner: {
    backgroundColor: designTokens.color.surface.success,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: 12,
    padding: 14,
  },
  successBannerText: {
    color: designTokens.color.status.successText,
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 20,
  },
});
