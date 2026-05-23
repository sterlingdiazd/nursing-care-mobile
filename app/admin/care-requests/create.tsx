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
import { designTokens } from "@/src/design-system/tokens";
import {
  createAdminCareRequest,
  getAdminCareRequestClients,
  type CreateAdminCareRequestDto,
  type AdminCareRequestClientOptionDto,
} from "@/src/services/adminPortalService";
import { FormInput } from "@/src/components/form";
import { adminTestIds } from "@/src/testing/testIds";
import { getAvailableNurses, getCareRequestOptions } from "@/src/services/catalogOptionsService";
import type {
  AvailableNurseOption,
  CareRequestTypeOption,
  CatalogOptionsResponse,
} from "@/src/types/catalog";
import { getAdminCareCreateProgress } from "@/src/utils/adminCreationUx";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";

// User-facing labels for the catalog category codes that come back from the API.
const CATEGORY_LABELS: Record<string, string> = {
  hogar: "Hogar",
  domicilio: "Domicilio",
  medicos: "Médicos",
};

const CATEGORY_ORDER = ["hogar", "domicilio", "medicos"];

const formatDateToIso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function CreateAdminCareRequestScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles, token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const catalogFetchedRef = useRef(false);

  // Form state
  const [form, setForm] = useState<CreateAdminCareRequestDto>({
    clientUserId: "",
    careRequestDescription: "",
    careRequestType: "",
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
  const [showAdvancedPricing, setShowAdvancedPricing] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Catalog of care-request types from the backend. Source of truth for
  // service offerings — replaces the previous hardcoded 4-string list that
  // didn't correspond to anything real in the database.
  const [catalog, setCatalog] = useState<CatalogOptionsResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [activeCategoryCode, setActiveCategoryCode] = useState<string>("hogar");

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

  // Load the catalog once auth is ready. fetchedRef guards against re-fetch on
  // auth-sync flicker (token/roles/profileType updating in separate ticks).
  useEffect(() => {
    if (!isReady || !isAuthenticated || !token) return;
    if (catalogFetchedRef.current) return;
    catalogFetchedRef.current = true;
    setCatalogLoading(true);
    setCatalogError(null);
    getCareRequestOptions(token)
      .then((options) => {
        setCatalog(options);
        // Default to the category of the first available type — keeps the UI
        // sensible if the backend ever reorders or reduces categories.
        const first = options.careRequestTypes[0];
        if (first) {
          setActiveCategoryCode(first.careRequestCategoryCode);
        }
      })
      .catch((err: unknown) => {
        setCatalogError(
          err instanceof Error ? err.message : "No fue posible cargar el catálogo de tipos.",
        );
      })
      .finally(() => setCatalogLoading(false));
  }, [isReady, isAuthenticated, token]);

  // Group the flat list of types by their category code. Ordering: prefer
  // the static CATEGORY_ORDER (hogar / domicilio / médicos), fall back to
  // appearance order if the backend introduces a new category.
  const typesByCategory = useMemo(() => {
    const map = new Map<string, CareRequestTypeOption[]>();
    if (!catalog) return map;
    for (const t of catalog.careRequestTypes) {
      const arr = map.get(t.careRequestCategoryCode);
      if (arr) arr.push(t);
      else map.set(t.careRequestCategoryCode, [t]);
    }
    return map;
  }, [catalog]);

  const orderedCategoryCodes = useMemo(() => {
    if (!catalog) return [] as string[];
    const present = Array.from(typesByCategory.keys());
    const known = CATEGORY_ORDER.filter((code) => present.includes(code));
    const extras = present.filter((code) => !CATEGORY_ORDER.includes(code));
    return [...known, ...extras];
  }, [catalog, typesByCategory]);

  const selectedType = useMemo(() => {
    if (!catalog) return null;
    return catalog.careRequestTypes.find((t) => t.code === form.careRequestType) ?? null;
  }, [catalog, form.careRequestType]);

  // When a type is picked, switch the active category tab to match — keeps
  // the chip the user just selected visible in the same view.
  useEffect(() => {
    if (selectedType && selectedType.careRequestCategoryCode !== activeCategoryCode) {
      setActiveCategoryCode(selectedType.careRequestCategoryCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType?.code]);

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
        careRequestType: "",
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

  const creationProgress = getAdminCareCreateProgress(form);
  const advancedPricingLocked = !creationProgress.coreReady;

  // Dirty check for back-button confirmation. Treat any user-touched field
  // (description, type, picked client, suggested nurse, custom unit) as dirty.
  const isDirty =
    !!form.clientUserId ||
    form.careRequestDescription.trim().length > 0 ||
    !!form.careRequestType ||
    (form.unit ?? 1) !== 1 ||
    !!form.suggestedNurse?.trim() ||
    !!selectedClient ||
    clientSearch.trim().length > 0;

  const exitToList = () => {
    setShowLeaveConfirm(false);
    goBackOrReplace(router, mobileNavigationEscapes.adminCareRequests);
  };

  const handleBackPress = () => {
    if (isDirty && !submitting) {
      setShowLeaveConfirm(true);
    } else {
      exitToList();
    }
  };

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) return null;

  return (
    <MobileWorkspaceShell
      title="Nueva Solicitud"
      testID={adminTestIds.careRequests.create.screen}
      nativeID={adminTestIds.careRequests.create.screen}
      onPrimaryReturn={handleBackPress}
      primaryReturnLabel="Volver"
      workflowActions={[
        {
          label: submitting ? "Creando…" : "Crear",
          onPress: handleSubmit,
          variant: "primary",
          disabled: submitting,
          testID: adminTestIds.careRequests.create.submitButton,
        },
      ]}
      disableScroll
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

      <ScrollView ref={scrollViewRef} style={styles.formScroll} contentContainerStyle={styles.scrollContent}>

        {/* === SECTION: CLIENT & BASIC INFO === */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Información del Servicio</Text>

          <Text style={styles.cardLabel}>Cliente *</Text>
          {selectedClient ? (
            <View style={styles.selectedClient}>
              <View>
                <Text style={styles.selectedClientName}>{selectedClient.displayName}</Text>
                <Text style={styles.selectedClientEmail}>{selectedClient.email}</Text>
              </View>
              <Pressable
                onPress={() => { setSelectedClient(null); setForm({ ...form, clientUserId: "" }); }}
                accessibilityRole="button"
                accessibilityLabel="Cambiar cliente seleccionado"
              >
                <Text style={styles.changeLink}>Cambiar</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <FormInput
                testID={adminTestIds.careRequests.create.clientSearchInput}
                accessibilityLabel="Buscar cliente por nombre o correo"
                placeholder="Buscar cliente por nombre o correo"
                value={clientSearch}
                onChangeText={setClientSearch}
                onFocus={() => setShowClientPicker(true)}
                errorMessage={errors.clientUserId}
              />
              {showClientPicker && clients.length > 0 && (
                <View style={styles.clientPicker}>
                  {clients.map((client) => (
                    <Pressable
                      key={client.userId}
                      style={styles.clientOption}
                      onPress={() => handleSelectClient(client)}
                      accessibilityRole="button"
                      accessibilityLabel={`Seleccionar cliente ${client.displayName}`}
                    >
                      <Text style={styles.clientOptionName}>{client.displayName}</Text>
                      <Text style={styles.clientOptionEmail}>{client.email}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}
          <Text style={styles.cardLabel}>Fecha programada *</Text>
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
                  border: errors.careRequestDate ? `1px solid ${designTokens.color.ink.danger}` : `1px solid ${designTokens.color.border.strong}`,
                  backgroundColor: designTokens.color.surface.primary,
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
                  style={{ flex: 1, backgroundColor: designTokens.color.surface.secondary, padding: 8, borderRadius: 8, alignItems: "center" }}
                  onPress={() => setForm({ ...form, careRequestDate: formatDateToIso(new Date()) })}
                  accessibilityRole="button"
                  accessibilityLabel="Seleccionar fecha de hoy"
                >
                  <Text style={{ fontSize: 13, color: designTokens.color.ink.primary, fontWeight: "600" }}>Hoy</Text>
                </Pressable>
                <Pressable
                  style={{ flex: 1, backgroundColor: designTokens.color.surface.secondary, padding: 8, borderRadius: 8, alignItems: "center" }}
                  onPress={() => {
                    const d = new Date(); d.setDate(d.getDate() + 1);
                    setForm({ ...form, careRequestDate: formatDateToIso(d) });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Seleccionar fecha de mañana"
                >
                  <Text style={{ fontSize: 13, color: designTokens.color.ink.primary, fontWeight: "600" }}>Mañana</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              testID={adminTestIds.careRequests.create.dateInput}
              nativeID={adminTestIds.careRequests.create.dateInput}
              onPress={openDatePicker}
              accessibilityRole="button"
              accessibilityLabel="Seleccionar fecha programada"
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

          <Text style={styles.cardLabel}>Tipo de servicio *</Text>
          {catalogLoading ? (
            <View style={styles.catalogLoading}>
              <ActivityIndicator color={designTokens.color.ink.accent} />
              <Text style={styles.catalogLoadingText}>Cargando tipos…</Text>
            </View>
          ) : catalogError ? (
            <Text style={styles.errorText}>{catalogError}</Text>
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

              {/* Chips for the active category only — keeps space tight. */}
              <View style={styles.chipsContainer}>
                {(typesByCategory.get(activeCategoryCode) ?? []).map((type) => {
                  const active = form.careRequestType === type.code;
                  return (
                    <Pressable
                      key={type.code}
                      onPress={() => setForm((prev) => ({ ...prev, careRequestType: type.code }))}
                      accessibilityRole="button"
                      accessibilityLabel={`Tipo ${type.displayName}`}
                      accessibilityState={{ selected: active }}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {type.displayName}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Confirmation pill: shows the user what they picked, including
                  base price + unit, so admin doesn't have to remember catalog. */}
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
          {errors.careRequestType && <Text style={styles.errorText}>{errors.careRequestType}</Text>}

          <Text style={styles.cardLabel}>Unidades *</Text>
          <View style={styles.stepperContainer}>
            <Pressable
              onPress={decrementUnit}
              style={styles.stepperBtn}
              accessibilityRole="button"
              accessibilityLabel="Disminuir unidades"
            >
              <Text style={styles.stepperBtnText}>-</Text>
            </Pressable>
            <Text style={styles.stepperValue}>{form.unit}</Text>
            <Pressable
              onPress={incrementUnit}
              style={styles.stepperBtn}
              accessibilityRole="button"
              accessibilityLabel="Aumentar unidades"
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </Pressable>
          </View>
          {errors.unit && <Text style={styles.errorText}>{errors.unit}</Text>}

          <FormInput
            testID={adminTestIds.careRequests.create.descriptionInput}
            label="Descripción de la solicitud"
            required
            accessibilityLabel="Descripción de la solicitud de cuidado"
            style={styles.textArea}
            placeholder="Detalles sobre lo requerido..."
            value={form.careRequestDescription}
            onChangeText={(text) => setForm({ ...form, careRequestDescription: text })}
            multiline
            numberOfLines={3}
            errorMessage={errors.careRequestDescription}
          />
        </View>

        {/* === SECTION: NURSE (Optional) === */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Enfermera Sugerida (Opcional)</Text>
          <FormInput
            testID={adminTestIds.careRequests.create.nurseInput}
            accessibilityLabel="Nombre de la enfermera sugerida"
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
                  <ActivityIndicator color={designTokens.color.ink.accent} accessibilityLabel="Cargando..." />
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
                    accessibilityRole="button"
                    accessibilityLabel={`Seleccionar enfermera ${nurse.displayName}`}
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
            accessibilityRole="button"
            accessibilityLabel="Mostrar configuraciones de precio avanzadas"
            accessibilityState={{ expanded: showAdvancedPricing, disabled: advancedPricingLocked }}
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

              <FormInput
                testID={adminTestIds.careRequests.create.priceOverrideInput}
                label="Precio base fijo (override)"
                accessibilityLabel="Precio base fijo override"
                placeholder="Ej: 1500"
                value={form.clientBasePriceOverride?.toString() || ""}
                onChangeText={(text) => setForm({ ...form, clientBasePriceOverride: parseFloat(text) || undefined })}
                keyboardType="numeric"
              />
              <FormInput
                testID={adminTestIds.careRequests.create.medicalSuppliesInput}
                label="Costo de insumos médicos"
                accessibilityLabel="Costo de insumos médicos"
                placeholder="Costo extra"
                value={form.medicalSuppliesCost?.toString() || ""}
                onChangeText={(text) => setForm({ ...form, medicalSuppliesCost: parseFloat(text) || undefined })}
                keyboardType="numeric"
              />
              <FormInput
                testID={adminTestIds.careRequests.create.distanceFactorInput}
                label="Factor de distancia (Multiplicador)"
                accessibilityLabel="Factor de distancia multiplicador"
                placeholder="Ej: Cerca, Lejos..."
                value={form.distanceFactor}
                onChangeText={(text) => setForm({ ...form, distanceFactor: text })}
              />
              <FormInput
                testID={adminTestIds.careRequests.create.complexityInput}
                label="Nivel de complejidad"
                accessibilityLabel="Nivel de complejidad del servicio"
                placeholder="Ej: Avanzado"
                value={form.complexityLevel}
                onChangeText={(text) => setForm({ ...form, complexityLevel: text })}
              />
            </View>
          )}
        </View>

      </ScrollView>

      {/* Modal for DatePicker on iOS */}
      {isDatePickerVisible && Platform.OS !== "web" ? (
        Platform.OS === "ios" ? (
          <Modal transparent animationType="slide" visible={isDatePickerVisible} onRequestClose={closeDatePicker}>
            <View style={styles.dateModalBackdrop}>
              <View style={styles.dateModalContent}>
                <Text style={styles.dateModalTitle}>Seleccionar Fecha</Text>
                <DateTimePicker value={draftServiceDate} mode="date" display="spinner" onChange={handleNativeDateChange} />
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
                    accessibilityLabel="Confirmar fecha seleccionada"
                  >
                    <Text style={styles.dateModalConfirmText}>Guardar Fecha</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker value={parseIsoDate(form.careRequestDate ?? undefined) ?? new Date()} mode="date" display="default" onChange={handleNativeDateChange} />
        )
      ) : null}

      {/* Leave-confirm modal — protects against accidental back-tap when the
          form has unsaved input. */}
      <Modal
        transparent
        animationType="fade"
        visible={showLeaveConfirm}
        onRequestClose={() => setShowLeaveConfirm(false)}
      >
        <View style={styles.leaveBackdrop}>
          <View style={styles.leaveCard}>
            <Text style={styles.leaveTitle}>¿Salir sin crear?</Text>
            <Text style={styles.leaveBody}>
              Tienes información sin enviar. Si sales ahora, los datos se perderán.
            </Text>
            <View style={styles.leaveActions}>
              <Pressable
                style={styles.leaveCancelButton}
                onPress={() => setShowLeaveConfirm(false)}
                accessibilityRole="button"
                accessibilityLabel="Continuar editando"
              >
                <Text style={styles.leaveCancelText}>Continuar</Text>
              </Pressable>
              <Pressable
                style={styles.leaveConfirmButton}
                onPress={exitToList}
                accessibilityRole="button"
                accessibilityLabel="Salir y descartar cambios"
              >
                <Text style={styles.leaveConfirmText}>Salir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  error: { backgroundColor: designTokens.color.surface.danger, color: designTokens.color.ink.danger, padding: 12, borderRadius: 12, marginBottom: 12 },
  progressCard: { backgroundColor: designTokens.color.surface.canvas, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 18, padding: 14, marginBottom: 12, gap: 8 },
  statusChip: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, fontWeight: "800" },
  statusChipWarning: { backgroundColor: designTokens.color.status.warningBg, color: designTokens.color.status.warningText },
  statusChipSuccess: { backgroundColor: designTokens.color.status.successBg, color: designTokens.color.status.successText },
  progressHelper: { color: designTokens.color.ink.secondary, fontSize: 13, lineHeight: 18 },
  formScroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingBottom: 24 },
  card: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 12 },
  cardLabel: { fontSize: 13, fontWeight: "700", color: designTokens.color.ink.primary, marginBottom: 7, marginTop: 4 },
  subtitle: { fontSize: 13, color: designTokens.color.ink.secondary, marginBottom: 12 },
  // Retained for the native date-picker Pressable trigger (not a FormInput).
  input: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: designTokens.color.border.strong, borderRadius: 12, padding: 12, fontSize: 15 },
  inputError: { borderColor: designTokens.color.ink.danger },
  errorText: { color: designTokens.color.ink.danger, fontSize: 12, marginTop: 4 },
  textArea: { minHeight: 80, textAlignVertical: "top" },

  chipsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { backgroundColor: designTokens.color.surface.secondary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: designTokens.color.border.subtle },
  chipActive: { backgroundColor: designTokens.color.ink.accent, borderColor: designTokens.color.ink.accentStrong },
  chipText: { color: designTokens.color.ink.secondary, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: designTokens.color.ink.inverse },

  catalogLoading: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  catalogLoadingText: { color: designTokens.color.ink.secondary, fontSize: 13 },
  categoryRow: { flexDirection: "row", gap: 6, marginBottom: 10, padding: 4, backgroundColor: designTokens.color.surface.secondary, borderRadius: 14, borderWidth: 1, borderColor: designTokens.color.border.subtle },
  categoryTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 10, backgroundColor: "transparent" },
  categoryTabActive: { backgroundColor: designTokens.color.surface.primary, boxShadow: "0px 1px 2px rgba(15, 23, 42, 0.08)", elevation: 1 },
  categoryTabText: { color: designTokens.color.ink.secondary, fontWeight: "700", fontSize: 13 },
  categoryTabTextActive: { color: designTokens.color.ink.primary },
  categoryTabCount: { color: designTokens.color.ink.muted, fontSize: 11, fontWeight: "700", minWidth: 16, textAlign: "center" },
  categoryTabCountActive: { color: designTokens.color.ink.accent },
  selectedTypeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: designTokens.color.status.successBg, alignSelf: "flex-start" },
  selectedTypeLabel: { color: designTokens.color.status.successText, fontSize: 12, fontWeight: "700" },
  selectedTypeValue: { color: designTokens.color.ink.primary, fontSize: 13, fontWeight: "600" },

  leaveBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "center", alignItems: "center", padding: 24 },
  leaveCard: { backgroundColor: designTokens.color.surface.primary, borderRadius: 18, padding: 20, width: "100%", maxWidth: 360, gap: 8 },
  leaveTitle: { fontSize: 17, fontWeight: "800", color: designTokens.color.ink.primary },
  leaveBody: { fontSize: 14, color: designTokens.color.ink.secondary, lineHeight: 20 },
  leaveActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  leaveCancelButton: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: designTokens.color.border.strong, alignItems: "center", paddingVertical: 12 },
  leaveCancelText: { color: designTokens.color.ink.primary, fontWeight: "700" },
  leaveConfirmButton: { flex: 1, borderRadius: 12, backgroundColor: designTokens.color.ink.danger, alignItems: "center", paddingVertical: 12 },
  leaveConfirmText: { color: designTokens.color.ink.inverse, fontWeight: "800" },

  stepperContainer: { flexDirection: "row", alignItems: "center", backgroundColor: designTokens.color.surface.secondary, borderRadius: 12, alignSelf: "flex-start", borderWidth: 1, borderColor: designTokens.color.border.strong },
  stepperBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  stepperBtnText: { fontSize: 20, fontWeight: "700", color: designTokens.color.ink.primary },
  stepperValue: { fontSize: 16, fontWeight: "800", color: designTokens.color.ink.primary, minWidth: 40, textAlign: "center" },

  accordionWrap: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: designTokens.color.border.strong, borderRadius: 18, overflow: "hidden", marginBottom: 12 },
  accordionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: designTokens.color.surface.canvas },
  accordionHeaderDisabled: { opacity: 0.6 },
  accordionTitle: { fontSize: 15, fontWeight: "700", color: designTokens.color.ink.secondary },
  accordionIcon: { fontSize: 14, color: designTokens.color.ink.secondary, fontWeight: "700" },
  accordionContent: { padding: 16, borderTopWidth: 1, borderTopColor: designTokens.color.border.subtle },
  lockedAccordionNotice: { paddingHorizontal: 16, paddingBottom: 16 },
  lockedAccordionText: { color: designTokens.color.status.dangerText, fontSize: 13, lineHeight: 18 },
  reviewCard: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 18, padding: 14, marginBottom: 12 },
  reviewHelper: { color: designTokens.color.ink.secondary, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  reviewChecklist: { gap: 8 },
  reviewChecklistItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewChecklistDot: { fontSize: 14, fontWeight: "800" },
  reviewChecklistDotComplete: { color: designTokens.color.status.successText },
  reviewChecklistDotPending: { color: designTokens.color.status.warningText },
  reviewChecklistText: { color: designTokens.color.ink.primary, fontSize: 14 },

  selectedClient: { backgroundColor: designTokens.color.surface.secondary, borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  selectedClientName: { fontSize: 16, fontWeight: "700", color: designTokens.color.ink.primary },
  selectedClientEmail: { fontSize: 14, color: designTokens.color.ink.secondary, marginTop: 2 },
  changeLink: { color: designTokens.color.ink.accent, fontSize: 14, fontWeight: "600" },
  clientPicker: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: designTokens.color.border.strong, borderRadius: 12, marginTop: 4, maxHeight: 180, overflow: "hidden" },
  clientOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: designTokens.color.border.subtle },
  clientOptionName: { fontSize: 15, fontWeight: "700", color: designTokens.color.ink.primary },
  clientOptionEmail: { fontSize: 13, color: designTokens.color.ink.secondary, marginTop: 2 },
  autocompleteLoadingRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  autocompleteHelperText: { fontSize: 13, color: designTokens.color.ink.secondary },

  datePickerTrigger: { minHeight: 48, justifyContent: "center" },
  dateValue: { color: designTokens.color.ink.primary, fontSize: 15, fontWeight: "600" },
  datePlaceholder: { color: designTokens.color.ink.muted, fontSize: 15 },

  dateModalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "flex-end" },
  dateModalContent: { backgroundColor: designTokens.color.surface.primary, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 },
  dateModalTitle: { fontSize: 16, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 8 },
  dateModalActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  dateModalCancelButton: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: designTokens.color.border.strong, alignItems: "center", paddingVertical: 12 },
  dateModalCancelText: { color: designTokens.color.ink.primary, fontWeight: "700" },
  dateModalConfirmButton: { flex: 1, borderRadius: 10, backgroundColor: designTokens.color.ink.accent, alignItems: "center", paddingVertical: 12 },
  dateModalConfirmText: { color: designTokens.color.ink.inverse, fontWeight: "700" },

  buttonPressed: { opacity: 0.8 },
});
