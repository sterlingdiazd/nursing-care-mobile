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
import { router, useLocalSearchParams } from "expo-router";
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
import { hapticFeedback } from "@/src/utils/haptics";
import {
  applyClientIntentDefaultsToForm,
  buildClientIntentDefaults,
  CLIENT_CARE_REQUEST_INTENTS,
  getClientCareRequestIntent,
  type ClientCareRequestIntentKey,
} from "@/src/utils/clientCareRequestIntent";

// Category labels + order — keep in sync with the admin create page so the
// two surfaces look the same. The list shown to the user is built by
// grouping `catalog.careRequestTypes` by their `careRequestCategoryCode`.
const CATEGORY_LABELS: Record<string, string> = {
  hogar: "Hogar",
  domicilio: "Domicilio",
  medicos: "Médicos",
};
const CATEGORY_ORDER = ["hogar", "domicilio", "medicos"];
type WizardStep = "intent" | "details" | "review";

export default function CreateCareRequestScreen() {
  const searchParams = useLocalSearchParams<{ intent?: string | string[] }>();
  const requestedIntentParam = Array.isArray(searchParams.intent) ? searchParams.intent[0] : searchParams.intent;
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
  const [wizardStep, setWizardStep] = useState<WizardStep>("intent");
  const [selectedIntentKey, setSelectedIntentKey] = useState<ClientCareRequestIntentKey | null>(null);

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

  const selectedIntent = selectedIntentKey ? getClientCareRequestIntent(selectedIntentKey) : null;
  const selectedIntentTitle = selectedIntent?.title ?? "Solicitud personalizada";

  const applyIntent = (
    intentKey: ClientCareRequestIntentKey,
    options?: { advance?: boolean; catalog?: CatalogOptionsResponse | null },
  ) => {
    const defaults = buildClientIntentDefaults(intentKey, options?.catalog ?? catalogOptions);
    setSelectedIntentKey(intentKey);
    setActiveCategoryCode(defaults.activeCategoryCode);
    setForm((prev) => applyClientIntentDefaultsToForm(prev, defaults));
    setFormError(null);
    if (options?.advance) {
      setWizardStep("details");
    }
  };

  useEffect(() => {
    const requestedIntent = getClientCareRequestIntent(requestedIntentParam);
    if (!requestedIntent || selectedIntentKey === requestedIntent.key) {
      return;
    }

    applyIntent(requestedIntent.key, { advance: true });
    // The function reads the latest form/catalog state; rerun only when the URL intent changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedIntentParam]);

  useEffect(() => {
    if (!catalogOptions || !selectedIntentKey) {
      return;
    }

    const defaults = buildClientIntentDefaults(selectedIntentKey, catalogOptions);
    setActiveCategoryCode(defaults.activeCategoryCode);
    setForm((prev) => applyClientIntentDefaultsToForm(prev, defaults));
  }, [catalogOptions, selectedIntentKey]);

  const goToNextStep = () => {
    hapticFeedback.selection();
    if (wizardStep === "intent") {
      if (!selectedIntentKey) {
        setFormError("Elige una opción para preparar la solicitud.");
        hapticFeedback.error();
        return;
      }
      setWizardStep("details");
      return;
    }
    if (wizardStep === "details") {
      if (!form.careRequestType) {
        setFormError("Elige el servicio específico antes de continuar.");
        hapticFeedback.error();
        return;
      }
      setWizardStep("review");
    }
  };

  const goToPreviousStep = () => {
    hapticFeedback.selection();
    if (wizardStep === "review") {
      setWizardStep("details");
      setFormError(null);
      return;
    }
    if (wizardStep === "details") {
      setWizardStep("intent");
      setFormError(null);
    }
  };

  const exitToList = () => {
    hapticFeedback.selection();
    setShowLeaveConfirm(false);
    goBackOrReplace(router, mobileNavigationEscapes.createCareRequest);
  };

  const handleBackPress = () => {
    if (wizardStep !== "intent") {
      goToPreviousStep();
      return;
    }

    if (isDirty && !isLoading) {
      hapticFeedback.selection();
      setShowLeaveConfirm(true);
    } else {
      exitToList();
    }
  };

  const incrementUnit = () => {
    hapticFeedback.selection();
    setForm((prev) => ({ ...prev, unit: (prev.unit || 0) + 1 }));
  };
  const decrementUnit = () => {
    hapticFeedback.selection();
    setForm((prev) => ({ ...prev, unit: Math.max(1, (prev.unit || 0) - 1) }));
  };

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
        const category = nurse.category ?? "";

        return [displayName, category].some((value) =>
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
    setSelectedIntentKey(null);
    setWizardStep("intent");
    setSuccessMessage(null);
    setFormError(null);
  };

  const openDatePicker = () => {
    hapticFeedback.selection();
    setDraftServiceDate(parseIsoDate(form.careRequestDate) ?? new Date());
    setIsDatePickerVisible(true);
  };

  const confirmDateSelection = () => {
    hapticFeedback.light();
    setForm((prev) => ({ ...prev, careRequestDate: formatDateToIso(draftServiceDate) }));
    setIsDatePickerVisible(false);
  };

  const closeDatePicker = () => {
    hapticFeedback.selection();
    setIsDatePickerVisible(false);
  };

  const clearSelectedDate = () => {
    hapticFeedback.selection();
    setForm((prev) => ({ ...prev, careRequestDate: undefined }));
  };

  const handleNativeDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      if (event.type === "set" && selectedDate) {
        hapticFeedback.selection();
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
      const msg = "La descripción de la solicitud y el tipo de servicio son obligatorios.";
      setFormError(msg);
      hapticFeedback.error();

      showAlert("Validación", msg);
      return;
    }

    if (!canCreateRequest) {
      const msg = "Solo los perfiles de cliente o administración pueden crear solicitudes de cuidado.";
      setFormError(msg);
      hapticFeedback.error();

      showAlert("Acción no permitida", msg);
      return;
    }

    if (!isReady) {
      logClientEvent("mobile.ui", "Solicitud bloqueada mientras la sesion termina de cargar");
      const msg = "La sesión todavía se está preparando. Espera un momento e intenta de nuevo.";
      setFormError(msg);
      hapticFeedback.error();

      showAlert("Sesión cargando", msg);
      return;
    }

    if (!token || !userId) {
      logClientEvent("mobile.ui", "Solicitud bloqueada por sesion incompleta");
      const msg = "Inicia sesión nuevamente antes de crear una solicitud.";
      setFormError(msg);
      hapticFeedback.error();

      showAlert("Autenticacion requerida", msg);
      return;
    }

    if (isAdminCaller && !selectedClient) {
      const msg = "Selecciona el cliente para el cual se crea la solicitud.";
      setFormError(msg);
      hapticFeedback.error();
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
        setCatalogError(e instanceof Error ? e.message : "No fue posible cargar el catálogo.");
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
    getAdminClients({ ...params, pageSize: 50 })
      .then((result) => {
        if (cancelled) return;
        setClientOptions(result.items);
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
        ...(wizardStep !== "intent"
          ? [{
              label: "Atrás",
              onPress: goToPreviousStep,
              variant: "secondary" as const,
              disabled: isLoading,
              testID: careRequestTestIds.create.backStepButton,
            }]
          : []),
        wizardStep === "review"
          ? {
              label: isLoading ? "Creando..." : "Crear",
              onPress: onSubmit,
              variant: "primary",
              disabled: isLoading || !canCreateRequest,
              testID: careRequestTestIds.create.submitButton,
            }
          : {
              label: "Continuar",
              onPress: goToNextStep,
              variant: "primary",
              disabled: isLoading || !canCreateRequest || (wizardStep === "intent" && !selectedIntentKey),
              testID: careRequestTestIds.create.nextButton,
            },
      ]}
    >
      <View style={styles.flow}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepHeaderText}>
              Paso {wizardStep === "intent" ? "1" : wizardStep === "details" ? "2" : "3"} de 3
            </Text>
            <View style={styles.stepRail}>
              {(["intent", "details", "review"] as WizardStep[]).map((step) => (
                <View
                  key={step}
                  style={[
                    styles.stepDot,
                    step === wizardStep && styles.stepDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
          {!!formError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{formError}</Text>
              <Pressable
                onPress={() => {
                  hapticFeedback.selection();
                  setFormError(null);
                }}
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
          {wizardStep === "intent" ? (
            <View
              style={styles.card}
              testID={careRequestTestIds.create.intentStep}
              nativeID={careRequestTestIds.create.intentStep}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>¿Qué necesitas?</Text>
              </View>
              <View style={styles.intentList}>
                {CLIENT_CARE_REQUEST_INTENTS.map((intent) => {
                  const selected = selectedIntentKey === intent.key;
                  return (
                    <Pressable
                      key={intent.key}
                      testID={careRequestTestIds.create.intentOption(intent.key)}
                      nativeID={careRequestTestIds.create.intentOption(intent.key)}
                      accessibilityRole="button"
                      accessibilityLabel={intent.title}
                      accessibilityState={{ selected }}
                      onPress={() => {
                        hapticFeedback.selection();
                        applyIntent(intent.key, { advance: true });
                      }}
                      style={({ pressed }) => [
                        styles.intentOption,
                        selected && styles.intentOptionSelected,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <View style={styles.intentText}>
                        <Text style={styles.intentTitle}>{intent.title}</Text>
                      </View>
                      <Text style={[styles.intentCheck, selected && styles.intentCheckSelected]}>
                        {selected ? "Preparado" : "Elegir"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {wizardStep === "details" && isAdminCaller ? (
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
                      hapticFeedback.selection();
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
                              hapticFeedback.selection();
                              setSelectedClient(client);
                              setClientSearchTerm(client.displayName);
                              setShowClientOptions(false);
                            }}
                            style={({ pressed }) => [
                              styles.autocompleteOption,
                              pressed && styles.buttonPressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Seleccionar cliente ${client.displayName}`}
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

          {wizardStep === "details" ? (
          <View
            style={styles.card}
            testID={careRequestTestIds.create.detailsStep}
            nativeID={careRequestTestIds.create.detailsStep}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Datos de la Solicitud</Text>
            </View>

            {selectedIntent ? (
              <View style={styles.intentAppliedBanner}>
                <Text style={styles.intentAppliedEyebrow}>Opción elegida</Text>
                <Text style={styles.intentAppliedTitle}>{selectedIntent.title}</Text>
              </View>
            ) : null}

            {catalogError ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{catalogError}</Text>
              </View>
            ) : null}

            {catalogLoading ? (
              <View style={styles.warningBox}>
                <ActivityIndicator color={designTokens.color.ink.accentStrong} accessibilityLabel="Cargando..." />
                <Text style={styles.warningText}>Cargando catálogo de precios...</Text>
              </View>
            ) : null}

            {!canCreateRequest && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  Solo los perfiles de cliente o administración pueden crear solicitudes. Usa la
                  cola para revisar el trabajo ya asignado.
                </Text>
              </View>
            )}

            {isReady && isAuthenticated && !userId && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  No hay un identificador de usuario disponible en la sesión. Vuelve a iniciar
                  sesión antes de continuar.
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
                  <View style={{ flexDirection: "row", gap: designTokens.spacing.sm, marginTop: designTokens.spacing.sm }}>
                    <Pressable
                      style={{ flex: 1, backgroundColor: designTokens.color.surface.secondary, padding: designTokens.spacing.sm, borderRadius: designTokens.radius.sm, alignItems: "center" }}
                      onPress={() => {
                        hapticFeedback.selection();
                        setForm((prev) => ({ ...prev, careRequestDate: formatDateToIso(new Date()) }));
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Seleccionar hoy como fecha del servicio"
                    >
                      <Text style={{ fontSize: designTokens.typography.label.fontSize, color: designTokens.color.ink.primary, fontWeight: "600" }}>Hoy</Text>
                    </Pressable>
                    <Pressable
                      style={{ flex: 1, backgroundColor: designTokens.color.surface.secondary, padding: designTokens.spacing.sm, borderRadius: designTokens.radius.sm, alignItems: "center" }}
                      onPress={() => {
                        hapticFeedback.selection();
                        const d = new Date(); d.setDate(d.getDate() + 1);
                        setForm((prev) => ({ ...prev, careRequestDate: formatDateToIso(d) }));
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Seleccionar mañana como fecha del servicio"
                    >
                      <Text style={{ fontSize: designTokens.typography.label.fontSize, color: designTokens.color.ink.primary, fontWeight: "600" }}>Mañana</Text>
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
                accessibilityRole="button"
                accessibilityLabel="Seleccionar fecha del servicio"
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
                  accessibilityRole="button"
                  accessibilityLabel="Elegir fecha del servicio"
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
                accessibilityRole="button"
                accessibilityLabel="Limpiar fecha del servicio"
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
                        onPress={() => {
                          hapticFeedback.selection();
                          setActiveCategoryCode(code);
                        }}
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
                        onPress={() => {
                          hapticFeedback.selection();
                          setForm({ ...form, careRequestType: row.code });
                        }}
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
              label="Descripción de la solicitud"
              value={form.careRequestDescription}
              onChangeText={(text) => setForm((prev) => ({ ...prev, careRequestDescription: text }))}
              placeholder="Descripción"
              multiline
              textAlignVertical="top"
              editable={!isLoading}
              style={[styles.textArea, isLoading ? styles.inputDisabled : undefined]}
            />
          </View>
          ) : null}

          {/* === CARD 2: NURSE === */}
          {wizardStep === "details" ? (
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
                        const meta = [nurse.category].filter(Boolean).join(" • ");

                        return (
                          <Pressable
                            key={nurse.userId}
                            onPress={() => {
                              hapticFeedback.selection();
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
                            accessibilityRole="button"
                            accessibilityLabel={`Seleccionar enfermera ${displayName}`}
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
          ) : null}

          {/* Compact estimation summary — no raw enum codes, no verbose
              checklist. Only what the user needs to confirm before tapping
              Crear: total, picked service. */}
          {wizardStep === "review" ? (
            <View
              style={styles.card}
              testID={careRequestTestIds.create.reviewStep}
              nativeID={careRequestTestIds.create.reviewStep}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Revisa tu solicitud</Text>
              </View>
              <ReviewRow label="Necesidad" value={selectedIntentTitle} />
              <ReviewRow label="Servicio" value={selectedType?.displayName ?? "Sin servicio"} />
              <ReviewRow label="Fecha" value={form.careRequestDate ?? "Sin fecha"} />
              <ReviewRow label="Cantidad" value={`${form.unit ?? 1}`} />
              <ReviewRow label="Detalle" value={form.careRequestDescription.trim() || "Sin descripción"} />
              {selectedNurse ? <ReviewRow label="Enfermera sugerida" value={selectedNurse.displayName} /> : null}
            </View>
          ) : null}

          {selectedType && wizardStep !== "intent" ? (
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
                  <Pressable
                    style={styles.dateModalCancelButton}
                    onPress={closeDatePicker}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar selección de fecha"
                  >
                    <Text style={styles.dateModalCancelText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={styles.dateModalConfirmButton}
                    onPress={confirmDateSelection}
                    accessibilityRole="button"
                    accessibilityLabel="Guardar fecha seleccionada"
                  >
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
        <Pressable
          style={modalStyles.overlay}
          onPress={() => {
            hapticFeedback.selection();
            setShowLeaveConfirm(false);
          }}
        >
          <Pressable style={modalStyles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={modalStyles.title}>¿Salir sin guardar?</Text>
            <Text style={modalStyles.body}>
              Tienes datos sin guardar. Si sales ahora se perderán.
            </Text>
            <View style={modalStyles.actions}>
              <Pressable
                style={[modalStyles.button, modalStyles.buttonSecondary]}
                onPress={() => {
                  hapticFeedback.selection();
                  setShowLeaveConfirm(false);
                }}
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

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
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
    padding: designTokens.spacing.xl,
  },
  sheet: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.xl,
    width: "100%",
    maxWidth: 400,
  },
  title: {
    fontSize: designTokens.typography.section.fontSize,
    fontWeight: "900",
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.sm,
  },
  body: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.body.fontSize,
    lineHeight: 20,
    marginBottom: designTokens.spacing.lg,
  },
  actions: {
    flexDirection: "row",
    gap: designTokens.spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radius.md,
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: designTokens.color.surface.secondary,
  },
  buttonDanger: {
    backgroundColor: designTokens.color.ink.danger,
  },
  buttonText: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  buttonTextInverse: {
    color: designTokens.color.ink.inverse,
  },
});

const styles = StyleSheet.create({
  flow: {
    gap: designTokens.spacing.lg,
  },
  stepHeader: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.md,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    padding: designTokens.spacing.md,
    gap: designTokens.spacing.sm,
  },
  stepHeaderText: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "800",
  },
  stepRail: {
    flexDirection: "row",
    gap: designTokens.spacing.sm,
  },
  stepDot: {
    flex: 1,
    height: 6,
    borderRadius: designTokens.radius.pill,
    backgroundColor: designTokens.color.surface.tertiary,
  },
  stepDotActive: {
    backgroundColor: designTokens.color.ink.accent,
  },
  intentList: {
    gap: designTokens.spacing.md,
  },
  intentOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: designTokens.spacing.md,
    borderRadius: designTokens.radius.md,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.secondary,
    padding: designTokens.spacing.lg,
  },
  intentOptionSelected: {
    borderColor: designTokens.color.border.accent,
    backgroundColor: designTokens.color.surface.accent,
  },
  intentText: { flex: 1, minWidth: 0 },
  intentTitle: {
    color: designTokens.color.ink.primary,
    fontSize: designTokens.typography.section.fontSize,
    lineHeight: 22,
    fontWeight: "900",
  },
  intentCheck: {
    color: designTokens.color.ink.muted,
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "900",
  },
  intentCheckSelected: {
    color: designTokens.color.ink.accentStrong,
  },
  reviewRow: {
    borderTopWidth: 1,
    borderTopColor: designTokens.color.border.subtle,
    paddingVertical: designTokens.spacing.md,
    gap: designTokens.spacing.xs,
  },
  reviewLabel: {
    color: designTokens.color.ink.muted,
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  reviewValue: {
    color: designTokens.color.ink.primary,
    fontSize: designTokens.typography.body.fontSize,
    lineHeight: 21,
    fontWeight: "700",
  },
  subtitle: { fontSize: designTokens.typography.label.fontSize, color: designTokens.color.ink.secondary, marginBottom: designTokens.spacing.md },
  chipsContainer: { flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.sm, marginBottom: designTokens.spacing.xs },
  chip: { backgroundColor: designTokens.color.surface.secondary, paddingVertical: designTokens.spacing.sm, paddingHorizontal: designTokens.spacing.lg, borderRadius: designTokens.radius.xl, borderWidth: 1, borderColor: "rgba(23, 48, 66, 0.15)" },
  chipActive: { backgroundColor: designTokens.color.ink.accentStrong, borderColor: designTokens.color.ink.primary },
  chipText: { color: designTokens.color.ink.secondary, fontWeight: "600", fontSize: designTokens.typography.label.fontSize },
  chipTextActive: { color: designTokens.color.ink.inverse },

  catalogLoading: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.sm, paddingVertical: designTokens.spacing.sm },
  catalogLoadingText: { color: designTokens.color.ink.secondary, fontSize: designTokens.typography.label.fontSize },
  helperError: { color: designTokens.color.ink.danger, fontSize: designTokens.typography.label.fontSize, marginTop: designTokens.spacing.sm },
  categoryRow: {
    flexDirection: "row",
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.md,
    padding: designTokens.spacing.xs,
    backgroundColor: designTokens.color.surface.secondary,
    borderRadius: designTokens.radius.md,
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.12)",
  },
  categoryTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.sm,
    borderRadius: designTokens.radius.sm,
    backgroundColor: "transparent",
  },
  categoryTabActive: {
    backgroundColor: designTokens.color.surface.primary,
    boxShadow: "0px 1px 2px rgba(15, 23, 42, 0.08)",
    elevation: 1,
  },
  categoryTabText: { color: designTokens.color.ink.secondary, fontWeight: "700", fontSize: designTokens.typography.label.fontSize },
  categoryTabTextActive: { color: designTokens.color.ink.primary },
  categoryTabCount: { color: designTokens.color.ink.muted, fontSize: designTokens.typography.caption.fontSize, fontWeight: "700", minWidth: 16, textAlign: "center" },
  categoryTabCountActive: { color: designTokens.color.ink.accent },
  selectedTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.sm,
    marginTop: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    borderRadius: designTokens.radius.sm,
    backgroundColor: designTokens.color.status.successBg,
    alignSelf: "flex-start",
  },
  selectedTypeLabel: { color: designTokens.color.status.successText, fontSize: designTokens.typography.caption.fontSize, fontWeight: "700" },
  selectedTypeValue: { color: designTokens.color.ink.primary, fontSize: designTokens.typography.label.fontSize, fontWeight: "600" },
  intentAppliedBanner: {
    backgroundColor: designTokens.color.surface.accent,
    borderRadius: designTokens.radius.md,
    borderWidth: 1,
    borderColor: designTokens.color.border.accent,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.xl,
    gap: designTokens.spacing.xs,
  },
  intentAppliedEyebrow: {
    color: designTokens.color.ink.accentStrong,
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  intentAppliedTitle: {
    color: designTokens.color.ink.primary,
    fontSize: designTokens.typography.body.fontSize,
    lineHeight: 21,
    fontWeight: "900",
  },
  estimateCard: {
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.12)",
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.md,
    gap: designTokens.spacing.xs,
  },
  estimateLabel: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  estimateAmount: {
    color: designTokens.color.ink.primary,
    fontSize: designTokens.typography.display.fontSize,
    fontWeight: "800",
  },
  estimateService: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.label.fontSize,
  },

  stepperContainer: { flexDirection: "row", alignItems: "center", backgroundColor: designTokens.color.surface.secondary, borderRadius: designTokens.radius.md, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(23, 48, 66, 0.15)", marginBottom: designTokens.spacing.xl },
  stepperBtn: { paddingHorizontal: designTokens.spacing.xl, paddingVertical: designTokens.spacing.md },
  stepperBtnText: { fontSize: designTokens.typography.section.fontSize, fontWeight: "700", color: designTokens.color.ink.primary },
  stepperValue: { fontSize: designTokens.typography.body.fontSize, fontWeight: "800", color: designTokens.color.ink.primary, minWidth: 40, textAlign: "center" },

  card: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.lg,
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.06)",
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.08)",
  },
  sectionHeader: {
    marginBottom: designTokens.spacing.xl,
  },
  sectionTitle: {
    fontSize: designTokens.typography.section.fontSize,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.sm,
  },
  warningBox: {
    backgroundColor: designTokens.color.surface.danger,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.xl,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  warningText: {
    color: designTokens.color.ink.danger,
    lineHeight: 20,
    fontWeight: "600",
  },
  label: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.sm,
  },
  labelSpaced: {
    marginTop: designTokens.spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.15)",
    borderRadius: designTokens.radius.md,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.xl,
    fontSize: designTokens.typography.body.fontSize,
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
    fontSize: designTokens.typography.body.fontSize,
    color: designTokens.color.ink.primary,
  },
  datePlaceholder: {
    fontSize: designTokens.typography.body.fontSize,
    color: designTokens.color.ink.secondary,
  },
  dateActionsRow: {
    flexDirection: "row",
    gap: designTokens.spacing.md,
    marginTop: -8,
    marginBottom: designTokens.spacing.lg,
  },
  dateActionButton: {
    flex: 1,
    borderRadius: designTokens.radius.sm,
    paddingVertical: designTokens.spacing.md,
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
    borderTopLeftRadius: designTokens.radius.lg,
    borderTopRightRadius: designTokens.radius.lg,
    paddingHorizontal: designTokens.spacing.xl,
    paddingTop: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.xxxl,
    gap: designTokens.spacing.md,
  },
  dateModalTitle: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
    textAlign: "center",
  },
  dateModalActions: {
    flexDirection: "row",
    gap: designTokens.spacing.md,
    marginTop: designTokens.spacing.xs,
  },
  dateModalCancelButton: {
    flex: 1,
    borderRadius: designTokens.radius.sm,
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.15)",
    paddingVertical: designTokens.spacing.md,
    alignItems: "center",
  },
  dateModalCancelText: {
    color: designTokens.color.ink.secondary,
    fontWeight: "700",
  },
  dateModalConfirmButton: {
    flex: 1,
    borderRadius: designTokens.radius.sm,
    backgroundColor: designTokens.color.ink.accentStrong,
    paddingVertical: designTokens.spacing.md,
    alignItems: "center",
  },
  dateModalConfirmText: {
    color: designTokens.color.ink.inverse,
    fontWeight: "800",
  },
  helperText: {
    marginTop: -10,
    marginBottom: designTokens.spacing.lg,
    fontSize: designTokens.typography.label.fontSize,
    color: designTokens.color.ink.secondary,
  },
  inputDisabled: {
    opacity: 0.65,
  },
  autocompletePanel: {
    marginTop: -8,
    marginBottom: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.15)",
    borderRadius: designTokens.radius.md,
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
    gap: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.lg,
  },
  autocompleteOption: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.surface.secondary,
  },
  autocompletePrimaryText: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  autocompleteSecondaryText: {
    marginTop: designTokens.spacing.xs,
    fontSize: designTokens.typography.label.fontSize,
    color: designTokens.color.ink.secondary,
  },
  autocompleteHelperText: {
    fontSize: designTokens.typography.label.fontSize,
    color: designTokens.color.ink.secondary,
  },
  selectedClientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.md,
    marginTop: designTokens.spacing.sm,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.radius.md,
    backgroundColor: designTokens.color.surface.accent,
    borderWidth: 1,
    borderColor: designTokens.color.border.accent,
  },
  selectedClientName: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  selectedClientMeta: {
    marginTop: designTokens.spacing.xs,
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.color.ink.secondary,
  },
  selectedClientClear: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.radius.sm,
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  selectedClientClearText: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "800",
    color: designTokens.color.ink.accent,
  },
  checklist: {
    backgroundColor: designTokens.color.surface.secondary,
    borderRadius: designTokens.radius.sm,
    padding: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.08)",
  },
  checklistTitle: {
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "800",
    color: designTokens.color.ink.accentStrong,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: designTokens.spacing.md,
  },
  checkItem: {
    fontSize: designTokens.typography.body.fontSize,
    lineHeight: 22,
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.sm,
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
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: designTokens.spacing.md,
  },
  errorBannerText: {
    color: designTokens.color.ink.danger,
    fontWeight: "700",
    fontSize: designTokens.typography.body.fontSize,
    lineHeight: 20,
    flex: 1,
  },
  errorBannerDismiss: {
    color: designTokens.color.ink.danger,
    fontSize: designTokens.typography.section.fontSize,
    fontWeight: "800",
    paddingHorizontal: designTokens.spacing.xs,
  },
  successBanner: {
    backgroundColor: designTokens.color.surface.success,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.lg,
  },
  successBannerText: {
    color: designTokens.color.status.successText,
    fontWeight: "700",
    fontSize: designTokens.typography.body.fontSize,
    lineHeight: 20,
  },
});
