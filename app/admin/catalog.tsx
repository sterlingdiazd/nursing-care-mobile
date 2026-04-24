// @generated-by: implementation-agent
// @pipeline-run: 2026-04-24-mobile-ux-audit
// @diffs: DIFF-ADMIN-CAT-002
// @do-not-edit: false

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  listCareRequestCategories,
  listCareRequestTypes,
  listUnitTypes,
  listDistanceFactors,
  listComplexityLevels,
  listVolumeDiscountRules,
  listNurseSpecialties,
  listNurseCategories,
  createCareRequestCategory,
  createCareRequestType,
  createUnitType,
  createDistanceFactor,
  createComplexityLevel,
  createVolumeDiscountRule,
  createNurseSpecialty,
  createNurseCategory,
  updateCareRequestCategory,
  updateCareRequestType,
  updateUnitType,
  updateDistanceFactor,
  updateComplexityLevel,
  updateVolumeDiscountRule,
  updateNurseSpecialty,
  updateNurseCategory,
  catalogPricingPreview,
  type CareRequestCategoryListItemDto,
  type CareRequestTypeListItemDto,
  type UnitTypeListItemDto,
  type DistanceFactorListItemDto,
  type ComplexityLevelListItemDto,
  type VolumeDiscountRuleListItemDto,
  type NurseSpecialtyListItemDto,
  type NurseCategoryListItemDto,
  type CatalogPricingPreviewResult,
} from "@/src/services/adminPortalService";
import { useAuth } from "@/src/context/AuthContext";
import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { designTokens } from "@/src/design-system/tokens";

type TabKey =
  | "categories"
  | "types"
  | "units"
  | "distance"
  | "complexity"
  | "volume"
  | "specialties"
  | "nurseCategories";

interface TabConfig {
  key: TabKey;
  label: string;
}

const TABS: TabConfig[] = [
  { key: "categories", label: "Categorías" },
  { key: "types", label: "Tipos" },
  { key: "units", label: "Unidades" },
  { key: "distance", label: "Distancia" },
  { key: "complexity", label: "Complejidad" },
  { key: "volume", label: "Descuentos" },
  { key: "specialties", label: "Especialidades" },
  { key: "nurseCategories", label: "Cat. Enfermería" },
];

type CatalogItem = CareRequestCategoryListItemDto | CareRequestTypeListItemDto | UnitTypeListItemDto | DistanceFactorListItemDto | ComplexityLevelListItemDto | VolumeDiscountRuleListItemDto | NurseSpecialtyListItemDto | NurseCategoryListItemDto;

export default function AdminCatalogScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles, token } = useAuth();
  const isAdmin = roles.includes("ADMIN");
  const [activeTab, setActiveTab] = useState<TabKey>("categories");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  // Data states
  const [categories, setCategories] = useState<CareRequestCategoryListItemDto[]>([]);
  const [types, setTypes] = useState<CareRequestTypeListItemDto[]>([]);
  const [units, setUnits] = useState<UnitTypeListItemDto[]>([]);
  const [distances, setDistances] = useState<DistanceFactorListItemDto[]>([]);
  const [complexities, setComplexities] = useState<ComplexityLevelListItemDto[]>([]);
  const [volumeRules, setVolumeRules] = useState<VolumeDiscountRuleListItemDto[]>([]);
  const [specialties, setSpecialties] = useState<NurseSpecialtyListItemDto[]>([]);
  const [nurseCategories, setNurseCategories] = useState<NurseCategoryListItemDto[]>([]);

  // Inline panel states (replaces Modals)
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [editingTabKey, setEditingTabKey] = useState<TabKey | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Pricing preview inline panel
  const [pricingPreviewItemCode, setPricingPreviewItemCode] = useState<string | null>(null);
  const [pricingPreviewResult, setPricingPreviewResult] = useState<CatalogPricingPreviewResult | null>(null);
  const [pricingPreviewLoading, setPricingPreviewLoading] = useState(false);
  const [pricingPreviewError, setPricingPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!isAdmin) return void router.replace("/");
  }, [isReady, isAuthenticated, requiresProfileCompletion, isAdmin]);

  const loadData = useCallback(async () => {
    if (!token || !isReady || !isAuthenticated || requiresProfileCompletion || !isAdmin) {
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const [c, t, u, d, x, v, s, n] = await Promise.all([
        listCareRequestCategories(includeInactive),
        listCareRequestTypes(includeInactive),
        listUnitTypes(includeInactive),
        listDistanceFactors(includeInactive),
        listComplexityLevels(includeInactive),
        listVolumeDiscountRules(includeInactive),
        listNurseSpecialties(includeInactive),
        listNurseCategories(includeInactive),
      ]);
      setCategories(c);
      setTypes(t);
      setUnits(u);
      setDistances(d);
      setComplexities(x);
      setVolumeRules(v);
      setSpecialties(s);
      setNurseCategories(n);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No fue posible cargar el catálogo.");
    } finally {
      setLoading(false);
    }
  }, [token, includeInactive, isReady, isAuthenticated, requiresProfileCompletion, isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePricingPreview = async (typeCode: string) => {
    if (pricingPreviewItemCode === typeCode) {
      setPricingPreviewItemCode(null);
      setPricingPreviewResult(null);
      return;
    }
    setPricingPreviewItemCode(typeCode);
    setPricingPreviewResult(null);
    setPricingPreviewError(null);
    setPricingPreviewLoading(true);
    try {
      const result = await catalogPricingPreview({
        careRequestTypeCode: typeCode,
        unit: 1,
        existingSameUnitTypeCount: 0,
      });
      setPricingPreviewResult(result);
    } catch (e: unknown) {
      setPricingPreviewError(e instanceof Error ? e.message : "No fue posible obtener la vista previa.");
    } finally {
      setPricingPreviewLoading(false);
    }
  };

  const handleCreate = (tabKey: TabKey) => {
    setEditingItem(null);
    setEditingTabKey(tabKey);
    setFormData(getDefaultFormData(tabKey));
    setSaveError(null);
  };

  const handleEdit = (tabKey: TabKey, item: CatalogItem) => {
    if (editingItem === item) {
      setEditingItem(null);
      setEditingTabKey(null);
      return;
    }
    setEditingItem(item);
    setEditingTabKey(tabKey);
    setFormData(getFormDataFromItem(tabKey, item));
    setSaveError(null);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditingTabKey(null);
    setFormData({});
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (editingItem && editingTabKey) {
        const itemWithId = editingItem as { id: string };
        await updateItem(editingTabKey, itemWithId.id, formData);
      } else if (editingTabKey) {
        await createItem(editingTabKey, formData);
      }
      setEditingItem(null);
      setEditingTabKey(null);
      await loadData();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "No fue posible guardar.");
    } finally {
      setSaving(false);
    }
  };

  const getDefaultFormData = (tabKey: TabKey): Record<string, unknown> => {
    switch (tabKey) {
      case "categories":
        return { code: "", displayName: "", categoryFactor: 1, isActive: true, displayOrder: categories.length };
      case "types":
        return { code: "", displayName: "", careRequestCategoryCode: "", unitTypeCode: "", basePrice: 0, isActive: true, displayOrder: types.length };
      case "units":
        return { code: "", displayName: "", isActive: true, displayOrder: units.length };
      case "distance":
        return { code: "", displayName: "", multiplier: 1, isActive: true, displayOrder: distances.length };
      case "complexity":
        return { code: "", displayName: "", multiplier: 1, isActive: true, displayOrder: complexities.length };
      case "volume":
        return { minimumCount: 1, discountPercent: 0, isActive: true, displayOrder: volumeRules.length };
      case "specialties":
        return { code: "", displayName: "", alternativeCodes: "", isActive: true, displayOrder: specialties.length };
      case "nurseCategories":
        return { code: "", displayName: "", alternativeCodes: "", isActive: true, displayOrder: nurseCategories.length };
      default:
        return {};
    }
  };

  const getFormDataFromItem = (tabKey: TabKey, item: CatalogItem): Record<string, unknown> => {
    switch (tabKey) {
      case "categories": {
        const category = item as CareRequestCategoryListItemDto;
        return { code: category.code, displayName: category.displayName, categoryFactor: category.categoryFactor, isActive: category.isActive, displayOrder: category.displayOrder };
      }
      case "types": {
        const type = item as CareRequestTypeListItemDto;
        return { code: type.code, displayName: type.displayName, careRequestCategoryCode: type.careRequestCategoryCode, unitTypeCode: type.unitTypeCode, basePrice: type.basePrice, isActive: type.isActive, displayOrder: type.displayOrder };
      }
      case "units": {
        const unit = item as UnitTypeListItemDto;
        return { code: unit.code, displayName: unit.displayName, isActive: unit.isActive, displayOrder: unit.displayOrder };
      }
      case "distance": {
        const distance = item as DistanceFactorListItemDto;
        return { code: distance.code, displayName: distance.displayName, multiplier: distance.multiplier, isActive: distance.isActive, displayOrder: distance.displayOrder };
      }
      case "complexity": {
        const complexity = item as ComplexityLevelListItemDto;
        return { code: complexity.code, displayName: complexity.displayName, multiplier: complexity.multiplier, isActive: complexity.isActive, displayOrder: complexity.displayOrder };
      }
      case "volume": {
        const volumeRule = item as VolumeDiscountRuleListItemDto;
        return { minimumCount: volumeRule.minimumCount, discountPercent: volumeRule.discountPercent, isActive: volumeRule.isActive, displayOrder: volumeRule.displayOrder };
      }
      case "specialties": {
        const specialty = item as NurseSpecialtyListItemDto;
        return { code: specialty.code, displayName: specialty.displayName, alternativeCodes: specialty.alternativeCodes ?? "", isActive: specialty.isActive, displayOrder: specialty.displayOrder };
      }
      case "nurseCategories": {
        const nurseCategory = item as NurseCategoryListItemDto;
        return { code: nurseCategory.code, displayName: nurseCategory.displayName, alternativeCodes: nurseCategory.alternativeCodes ?? "", isActive: nurseCategory.isActive, displayOrder: nurseCategory.displayOrder };
      }
      default:
        return {};
    }
  };

  const createItem = async (tabKey: TabKey, data: Record<string, unknown>) => {
    switch (tabKey) {
      case "categories": return createCareRequestCategory(data as Parameters<typeof createCareRequestCategory>[0]);
      case "types": return createCareRequestType(data as Parameters<typeof createCareRequestType>[0]);
      case "units": return createUnitType(data as Parameters<typeof createUnitType>[0]);
      case "distance": return createDistanceFactor(data as Parameters<typeof createDistanceFactor>[0]);
      case "complexity": return createComplexityLevel(data as Parameters<typeof createComplexityLevel>[0]);
      case "volume": return createVolumeDiscountRule(data as Parameters<typeof createVolumeDiscountRule>[0]);
      case "specialties": return createNurseSpecialty(data as Parameters<typeof createNurseSpecialty>[0]);
      case "nurseCategories": return createNurseCategory(data as Parameters<typeof createNurseCategory>[0]);
    }
  };

  const updateItem = async (tabKey: TabKey, id: string, data: Record<string, unknown>) => {
    switch (tabKey) {
      case "categories": return updateCareRequestCategory(id, data as Parameters<typeof updateCareRequestCategory>[1]);
      case "types": return updateCareRequestType(id, data as Parameters<typeof updateCareRequestType>[1]);
      case "units": return updateUnitType(id, data as Parameters<typeof updateUnitType>[1]);
      case "distance": return updateDistanceFactor(id, data as Parameters<typeof updateDistanceFactor>[1]);
      case "complexity": return updateComplexityLevel(id, data as Parameters<typeof updateComplexityLevel>[1]);
      case "volume": return updateVolumeDiscountRule(id, data as Parameters<typeof updateVolumeDiscountRule>[1]);
      case "specialties": return updateNurseSpecialty(id, data as Parameters<typeof updateNurseSpecialty>[1]);
      case "nurseCategories": return updateNurseCategory(id, data as Parameters<typeof updateNurseCategory>[1]);
    }
  };

  const getCurrentData = (): CatalogItem[] => {
    switch (activeTab) {
      case "categories": return categories;
      case "types": return types;
      case "units": return units;
      case "distance": return distances;
      case "complexity": return complexities;
      case "volume": return volumeRules;
      case "specialties": return specialties;
      case "nurseCategories": return nurseCategories;
      default: return [];
    }
  };

  const getSubtitle = (item: CatalogItem): string => {
    switch (activeTab) {
      case "categories":
        return `Factor: ${(item as CareRequestCategoryListItemDto).categoryFactor}`;
      case "types":
        return `Precio base: $${(item as CareRequestTypeListItemDto).basePrice}`;
      case "units":
        return (item as UnitTypeListItemDto).isActive ? "Activo" : "Inactivo";
      case "distance":
        return `Multiplicador: ${(item as DistanceFactorListItemDto).multiplier}`;
      case "complexity":
        return `Multiplicador: ${(item as ComplexityLevelListItemDto).multiplier}`;
      case "volume": {
        const volumeRule = item as VolumeDiscountRuleListItemDto;
        return `${volumeRule.discountPercent}% descuento desde ${volumeRule.minimumCount}`;
      }
      case "specialties":
        return (item as NurseSpecialtyListItemDto).alternativeCodes ?? "Sin códigos alternativos";
      case "nurseCategories":
        return (item as NurseCategoryListItemDto).alternativeCodes ?? "Sin códigos alternativos";
      default: return "";
    }
  };

  const getItemId = (item: CatalogItem) => item.id;

  const getItemTitle = (item: CatalogItem) => {
    if ("displayName" in item) {
      return item.displayName;
    }
    return `Descuento ${item.discountPercent}%`;
  };

  const getItemCode = (item: CatalogItem) => {
    if ("code" in item) {
      return item.code;
    }
    return null;
  };

  const isItemActive = (item: CatalogItem) => item.isActive;

  const renderFormField = (key: string, value: unknown) => {
    const label = getFieldLabel(key);
    const isBoolean = typeof value === "boolean";
    const isNumber = typeof value === "number";

    if (isBoolean) {
      return (
        <Pressable
          key={key}
          style={styles.checkboxRow}
          onPress={() => setFormData({ ...formData, [key]: !value })}
          accessibilityRole="checkbox"
          accessibilityLabel={label}
          accessibilityState={{ checked: !!value }}
        >
          <View style={[styles.checkbox, value && styles.checkboxChecked]}>
            {value && <Text style={styles.checkmark}>v</Text>}
          </View>
          <Text style={styles.checkboxLabel}>{label}</Text>
        </Pressable>
      );
    }

    return (
      <View key={key} style={styles.formGroup}>
        <Text style={styles.formLabel}>{label}</Text>
        <TextInput
          style={styles.formInput}
          value={String(value)}
          onChangeText={(text) => {
            const parsed = isNumber ? parseFloat(text) || 0 : text;
            setFormData({ ...formData, [key]: parsed });
          }}
          keyboardType={isNumber ? "decimal-pad" : "default"}
          placeholder={label}
          accessibilityLabel={label}
          testID="admin-setting-value-input"
          nativeID="admin-setting-value-input"
        />
      </View>
    );
  };

  const getFieldLabel = (key: string): string => {
    const labels: Record<string, string> = {
      code: "Codigo",
      displayName: "Nombre",
      categoryFactor: "Factor de categoria",
      careRequestCategoryCode: "Categoria de solicitud",
      unitTypeCode: "Tipo de unidad",
      basePrice: "Precio base",
      multiplier: "Multiplicador",
      minimumCount: "Cantidad minima",
      discountPercent: "Porcentaje de descuento",
      alternativeCodes: "Codigos alternativos",
      isActive: "Activo",
      displayOrder: "Orden de visualizacion",
    };
    return labels[key] ?? key;
  };

  return (
    <MobileWorkspaceShell
      eyebrow="Administración"
      title="Catálogo de precios"
      description="Gestiona opciones y factores desde una sola vista."
      testID="admin-catalog-screen"
      nativeID="admin-catalog-screen"
      actions={(
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.button, includeInactive && styles.buttonActive]}
            onPress={() => setIncludeInactive(!includeInactive)}
            testID="admin-catalog-toggle-inactive"
            nativeID="admin-catalog-toggle-inactive"
            accessibilityRole="button"
            accessibilityLabel={includeInactive ? "Ocultar inactivos" : "Mostrar inactivos"}
          >
            <Text style={[styles.buttonText, includeInactive && styles.buttonTextActive]}>
              {includeInactive ? "Ocultar inactivos" : "Mostrar inactivos"}
            </Text>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={() => void loadData()}
            testID="admin-catalog-refresh-btn"
            nativeID="admin-catalog-refresh-btn"
            accessibilityRole="button"
            accessibilityLabel="Actualizar catálogo"
          >
            <Text style={styles.buttonText}>Actualizar</Text>
          </Pressable>
          <Pressable
            style={styles.buttonPrimary}
            onPress={() => handleCreate(activeTab)}
            testID="admin-catalog-create-btn"
            nativeID="admin-catalog-create-btn"
            accessibilityRole="button"
            accessibilityLabel="Crear nuevo elemento"
          >
            <Text style={styles.buttonPrimaryText}>Nuevo</Text>
          </Pressable>
        </View>
      )}
    >
      {!!error && (
        <Text
          style={styles.error}
          testID="admin-catalog-error"
          nativeID="admin-catalog-error"
        >
          {error}
        </Text>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.color.ink.accentStrong} accessibilityLabel="Cargando..." />
          <Text style={styles.loadingText}>Cargando catálogo...</Text>
        </View>
      )}

      {!loading && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsContainer}
            testID="admin-catalog-tab-bar"
            nativeID="admin-catalog-tab-bar"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                  testID={`admin-catalog-tab-${tab.key}`}
                  nativeID={`admin-catalog-tab-${tab.key}`}
                  accessibilityRole="tab"
                  accessibilityLabel={tab.label}
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Inline edit/create panel */}
          {editingTabKey === activeTab && (
            <View
              style={styles.editPanel}
              testID="admin-catalog-edit-panel"
              nativeID="admin-catalog-edit-panel"
            >
              <Text style={styles.editPanelTitle}>
                {editingItem ? "Editar" : "Crear"} {TABS.find((t) => t.key === activeTab)?.label}
              </Text>

              {saveError && <Text style={styles.error}>{saveError}</Text>}

              {Object.entries(formData).map(([key, value]) => renderFormField(key, value))}

              <View style={styles.editActions}>
                <Pressable
                  style={[styles.buttonPrimary, saving && styles.buttonDisabled]}
                  onPress={() => void handleSave()}
                  disabled={saving}
                  testID="admin-catalog-save-btn"
                  nativeID="admin-catalog-save-btn"
                  accessibilityRole="button"
                  accessibilityLabel={saving ? "Guardando elemento" : "Guardar elemento"}
                >
                  <Text style={styles.buttonPrimaryText}>{saving ? "Guardando..." : "Guardar"}</Text>
                </Pressable>
                <Pressable
                  style={styles.button}
                  onPress={handleCancelEdit}
                  testID="admin-catalog-cancel-btn"
                  nativeID="admin-catalog-cancel-btn"
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar edición"
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View
            style={styles.cardsContainer}
            testID="admin-catalog-cards-list"
            nativeID="admin-catalog-cards-list"
          >
            {getCurrentData().map((item, index) => {
              const isEditingThis = editingItem === item;
              const itemId = getItemId(item) ?? String(index);
              const itemCode = getItemCode(item);
              const itemTitle = getItemTitle(item);
              return (
                <View key={itemId}>
                  <Pressable
                    style={styles.card}
                    onPress={() => handleEdit(activeTab, item)}
                    testID={`admin-catalog-card-${itemId}`}
                    nativeID={`admin-catalog-card-${itemId}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${itemTitle}`}
                  >
                    <View style={styles.cardContent}>
                      <View style={styles.cardTextBlock}>
                        <View style={styles.cardHeader}>
                          <Text style={styles.cardTitle}>{itemTitle}</Text>
                          {!isItemActive(item) && (
                            <View style={styles.inactiveBadge}>
                              <Text style={styles.inactiveBadgeText}>Inactivo</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.cardSubtitle}>{getSubtitle(item)}</Text>
                        {itemCode && <Text style={styles.cardCode}>Código {itemCode}</Text>}
                      </View>
                      <View style={styles.cardActions}>
                        {activeTab === "types" && itemCode && (
                          <Pressable
                            testID={`admin-catalog-pricing-preview-${itemCode}`}
                            nativeID={`admin-catalog-pricing-preview-${itemCode}`}
                            style={styles.previewButton}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              void handlePricingPreview(itemCode);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Previsualizar precio de ${itemTitle}`}
                          >
                            <Text style={styles.previewButtonText}>Previsualizar precio</Text>
                          </Pressable>
                        )}
                        <Text style={styles.cardChevron}>{isEditingThis ? "v" : ">"}</Text>
                      </View>
                    </View>
                  </Pressable>

                  {/* Pricing preview inline panel */}
                  {activeTab === "types" && pricingPreviewItemCode === itemCode && (
                    <View
                      style={styles.pricingPreviewPanel}
                      testID="admin-catalog-pricing-preview-panel"
                      nativeID="admin-catalog-pricing-preview-panel"
                    >
                      <Text style={styles.previewPanelTitle}>Vista previa de precio</Text>
                      {pricingPreviewLoading && (
                        <View style={styles.previewLoadingRow}>
                          <ActivityIndicator color={designTokens.color.ink.accent} accessibilityLabel="Cargando..." />
                          <Text style={styles.previewLoadingText}>Calculando precio...</Text>
                        </View>
                      )}
                      {pricingPreviewError && (
                        <Text style={styles.error}>{pricingPreviewError}</Text>
                      )}
                      {pricingPreviewResult && (
                        <View style={styles.previewResultCard}>
                          <Text style={styles.previewTypeLabel}>Codigo: {pricingPreviewItemCode}</Text>
                          <View style={styles.previewRow}>
                            <Text style={styles.previewRowLabel}>Precio base</Text>
                            <Text style={styles.previewRowValue}>${pricingPreviewResult.basePrice.toFixed(2)}</Text>
                          </View>
                          <View style={styles.previewRow}>
                            <Text style={styles.previewRowLabel}>Factor de categoria</Text>
                            <Text style={styles.previewRowValue}>{pricingPreviewResult.categoryFactor}</Text>
                          </View>
                          <View style={[styles.previewRow, styles.previewTotalRow]}>
                            <Text style={styles.previewTotalLabel}>Total</Text>
                            <Text style={styles.previewTotalValue}>${pricingPreviewResult.grandTotal.toFixed(2)}</Text>
                          </View>
                        </View>
                      )}
                      <Pressable
                        style={styles.button}
                        onPress={() => { setPricingPreviewItemCode(null); setPricingPreviewResult(null); }}
                        accessibilityRole="button"
                        accessibilityLabel="Cerrar vista previa de precio"
                      >
                        <Text style={styles.buttonText}>Cerrar vista previa</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}

            {getCurrentData().length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No hay elementos para mostrar</Text>
              </View>
            )}
          </View>
        </>
      )}
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  button: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#d1d5db" },
  buttonText: { color: designTokens.color.ink.accent, fontWeight: "700", fontSize: 14 },
  buttonActive: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  buttonTextActive: { color: designTokens.color.ink.accent },
  buttonPrimary: { backgroundColor: designTokens.color.ink.accent, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  buttonPrimaryText: { color: designTokens.color.ink.inverse, fontWeight: "700", fontSize: 14, textAlign: "center" },
  buttonDisabled: { opacity: 0.5 },
  error: { backgroundColor: designTokens.color.surface.danger, color: designTokens.color.ink.danger, padding: 12, borderRadius: 12, marginBottom: 12 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loadingText: { marginTop: 12, fontSize: 16, color: designTokens.color.ink.secondary },
  tabsContainer: { marginBottom: 8 },
  tab: { paddingHorizontal: 15, paddingVertical: 10, marginRight: 8, borderRadius: 999, backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: "#d1d5db" },
  tabActive: { backgroundColor: designTokens.color.ink.primary, borderColor: designTokens.color.ink.primary },
  tabText: { fontSize: 14, color: designTokens.color.ink.primary, fontWeight: "600" },
  tabTextActive: { color: designTokens.color.ink.inverse },
  editPanel: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 16, padding: 16, marginBottom: 12, gap: 8 },
  editPanelTitle: { fontSize: 16, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 8 },
  editActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  cardsContainer: { gap: 10 },
  card: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "#e5e7eb", shadowColor: designTokens.color.ink.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  cardContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  cardTextBlock: { flex: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: designTokens.color.ink.primary, flex: 1 },
  inactiveBadge: { backgroundColor: "#fff1f2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  inactiveBadgeText: { fontSize: 11, color: designTokens.color.ink.accentStrong, fontWeight: "600" },
  cardSubtitle: { fontSize: 13, color: designTokens.color.ink.muted, marginBottom: 4 },
  cardCode: { fontSize: 12, color: designTokens.color.ink.muted },
  cardChevron: { color: designTokens.color.ink.muted, fontSize: 18, lineHeight: 24 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  previewButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: designTokens.color.surface.accent, borderWidth: 1, borderColor: "#bfdbfe" },
  previewButtonText: { fontSize: 12, color: designTokens.color.ink.accentStrong, fontWeight: "600" },
  pricingPreviewPanel: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 16, padding: 16, marginTop: 4, marginBottom: 8, gap: 12 },
  previewPanelTitle: { fontSize: 16, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 8 },
  previewLoadingRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  previewLoadingText: { fontSize: 15, color: designTokens.color.ink.secondary },
  previewResultCard: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#e5e7eb" },
  previewTypeLabel: { fontSize: 13, color: designTokens.color.ink.muted, marginBottom: 12 },
  previewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  previewRowLabel: { fontSize: 15, color: designTokens.color.ink.secondary },
  previewRowValue: { fontSize: 15, color: designTokens.color.ink.primary, fontWeight: "600" },
  previewTotalRow: { borderBottomWidth: 0, marginTop: 4, paddingTop: 14 },
  previewTotalLabel: { fontSize: 16, fontWeight: "700", color: designTokens.color.ink.primary },
  previewTotalValue: { fontSize: 18, fontWeight: "800", color: designTokens.color.ink.accent },
  emptyState: { padding: 32, alignItems: "center" },
  emptyStateText: { fontSize: 16, color: designTokens.color.ink.secondary },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: "600", color: designTokens.color.ink.primary, marginBottom: 8 },
  formInput: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 14, padding: 14, fontSize: 16, color: designTokens.color.ink.primary },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: "#d1d5db", backgroundColor: designTokens.color.ink.inverse, justifyContent: "center", alignItems: "center", marginRight: 12 },
  checkboxChecked: { backgroundColor: designTokens.color.ink.accent, borderColor: designTokens.color.ink.accent },
  checkmark: { color: designTokens.color.ink.inverse, fontSize: 14, fontWeight: "700" },
  checkboxLabel: { fontSize: 16, color: designTokens.color.ink.primary },
});
