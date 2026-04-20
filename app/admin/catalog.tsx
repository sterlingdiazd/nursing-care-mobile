import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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

export default function AdminCatalogScreen() {
  const router = useRouter();
  const { token } = useAuth();
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

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // Pricing preview states
  const [pricingPreviewVisible, setPricingPreviewVisible] = useState(false);
  const [pricingPreviewResult, setPricingPreviewResult] = useState<CatalogPricingPreviewResult | null>(null);
  const [pricingPreviewLoading, setPricingPreviewLoading] = useState(false);
  const [pricingPreviewError, setPricingPreviewError] = useState<string | null>(null);
  const [selectedTypeCode, setSelectedTypeCode] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
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
    } catch (e: any) {
      setError(e?.message ?? "No fue posible cargar el catálogo.");
    } finally {
      setLoading(false);
    }
  }, [token, includeInactive]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePricingPreview = async (typeCode: string) => {
    setSelectedTypeCode(typeCode);
    setPricingPreviewResult(null);
    setPricingPreviewError(null);
    setPricingPreviewLoading(true);
    setPricingPreviewVisible(true);
    try {
      const result = await catalogPricingPreview({
        careRequestTypeCode: typeCode,
        unit: 1,
        existingSameUnitTypeCount: 0,
      });
      setPricingPreviewResult(result);
    } catch (e: any) {
      setPricingPreviewError(e?.message ?? "No fue posible obtener la vista previa.");
    } finally {
      setPricingPreviewLoading(false);
    }
  };

  const handleCreate = (tabKey: TabKey) => {
    setEditingItem(null);
    setFormData(getDefaultFormData(tabKey));
    setModalVisible(true);
  };

  const handleEdit = (tabKey: TabKey, item: any) => {
    setEditingItem(item);
    setFormData(getFormDataFromItem(tabKey, item));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      if (editingItem) {
        await updateItem(activeTab, editingItem.id, formData, token);
      } else {
        await createItem(activeTab, formData, token);
      }
      setModalVisible(false);
      await loadData();
      Alert.alert("Éxito", editingItem ? "Elemento actualizado." : "Elemento creado.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No fue posible guardar.");
    } finally {
      setSaving(false);
    }
  };

  const getDefaultFormData = (tabKey: TabKey): Record<string, any> => {
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

  const getFormDataFromItem = (tabKey: TabKey, item: any): Record<string, any> => {
    switch (tabKey) {
      case "categories":
        return { code: item.code, displayName: item.displayName, categoryFactor: item.categoryFactor, isActive: item.isActive, displayOrder: item.displayOrder };
      case "types":
        return { code: item.code, displayName: item.displayName, careRequestCategoryCode: item.careRequestCategoryCode, unitTypeCode: item.unitTypeCode, basePrice: item.basePrice, isActive: item.isActive, displayOrder: item.displayOrder };
      case "units":
        return { code: item.code, displayName: item.displayName, isActive: item.isActive, displayOrder: item.displayOrder };
      case "distance":
        return { code: item.code, displayName: item.displayName, multiplier: item.multiplier, isActive: item.isActive, displayOrder: item.displayOrder };
      case "complexity":
        return { code: item.code, displayName: item.displayName, multiplier: item.multiplier, isActive: item.isActive, displayOrder: item.displayOrder };
      case "volume":
        return { minimumCount: item.minimumCount, discountPercent: item.discountPercent, isActive: item.isActive, displayOrder: item.displayOrder };
      case "specialties":
        return { code: item.code, displayName: item.displayName, alternativeCodes: item.alternativeCodes ?? "", isActive: item.isActive, displayOrder: item.displayOrder };
      case "nurseCategories":
        return { code: item.code, displayName: item.displayName, alternativeCodes: item.alternativeCodes ?? "", isActive: item.isActive, displayOrder: item.displayOrder };
      default:
        return {};
    }
  };

  const createItem = async (tabKey: TabKey, data: Record<string, any>, authToken: string) => {
    switch (tabKey) {
      case "categories":
        return createCareRequestCategory(data as any);
      case "types":
        return createCareRequestType(data as any);
      case "units":
        return createUnitType(data as any);
      case "distance":
        return createDistanceFactor(data as any);
      case "complexity":
        return createComplexityLevel(data as any);
      case "volume":
        return createVolumeDiscountRule(data as any);
      case "specialties":
        return createNurseSpecialty(data as any);
      case "nurseCategories":
        return createNurseCategory(data as any);
    }
  };

  const updateItem = async (tabKey: TabKey, id: string, data: Record<string, any>, authToken: string) => {
    switch (tabKey) {
      case "categories":
        return updateCareRequestCategory(id, data as any);
      case "types":
        return updateCareRequestType(id, data as any);
      case "units":
        return updateUnitType(id, data as any);
      case "distance":
        return updateDistanceFactor(id, data as any);
      case "complexity":
        return updateComplexityLevel(id, data as any);
      case "volume":
        return updateVolumeDiscountRule(id, data as any);
      case "specialties":
        return updateNurseSpecialty(id, data as any);
      case "nurseCategories":
        return updateNurseCategory(id, data as any);
    }
  };

  const getCurrentData = () => {
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

  const renderCard = (item: any, index: number) => {
    const getSubtitle = () => {
      switch (activeTab) {
        case "categories":
          return `Factor: ${item.categoryFactor}`;
        case "types":
          return `Precio base: $${item.basePrice}`;
        case "units":
          return item.isActive ? "Activo" : "Inactivo";
        case "distance":
        case "complexity":
          return `Multiplicador: ${item.multiplier}`;
        case "volume":
          return `${item.discountPercent}% descuento desde ${item.minimumCount}`;
        case "specialties":
        case "nurseCategories":
          return item.alternativeCodes ?? "Sin códigos alternativos";
        default:
          return "";
      }
    };

    return (
      <TouchableOpacity
        key={item.id ?? index}
        style={styles.card}
        onPress={() => handleEdit(activeTab, item)}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardTextBlock}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.displayName ?? item.code}</Text>
              {!item.isActive && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>Inactivo</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardSubtitle}>{getSubtitle()}</Text>
            {item.code && <Text style={styles.cardCode}>Código {item.code}</Text>}
          </View>
          <View style={styles.cardActions}>
            {activeTab === "types" && item.code && (
              <TouchableOpacity
                testID={`pricing-preview-btn-${item.code}`}
                style={styles.previewButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handlePricingPreview(item.code);
                }}
              >
                <Text style={styles.previewButtonText}>Previsualizar precio</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.cardChevron}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFormField = (key: string, value: any) => {
    const label = getFieldLabel(key);
    const isBoolean = typeof value === "boolean";
    const isNumber = typeof value === "number";

    if (isBoolean) {
      return (
        <TouchableOpacity
          key={key}
          style={styles.checkboxRow}
          onPress={() => setFormData({ ...formData, [key]: !value })}
        >
          <View style={[styles.checkbox, value && styles.checkboxChecked]}>
            {value && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>{label}</Text>
        </TouchableOpacity>
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
        />
      </View>
    );
  };

  const getFieldLabel = (key: string): string => {
    const labels: Record<string, string> = {
      code: "Código",
      displayName: "Nombre",
      categoryFactor: "Factor de categoría",
      careRequestCategoryCode: "Categoría de solicitud",
      unitTypeCode: "Tipo de unidad",
      basePrice: "Precio base",
      multiplier: "Multiplicador",
      minimumCount: "Cantidad mínima",
      discountPercent: "Porcentaje de descuento",
      alternativeCodes: "Códigos alternativos",
      isActive: "Activo",
      displayOrder: "Orden de visualización",
    };
    return labels[key] ?? key;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f4b6e" />
          <Text style={styles.loadingText}>Cargando catálogo...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Catálogo de precios</Text>
        <Text style={styles.subtitle}>Gestiona opciones y factores desde una sola vista.</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadData} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.toggleButton, includeInactive && styles.toggleButtonActive]}
          onPress={() => setIncludeInactive(!includeInactive)}
        >
          <Text style={[styles.toggleButtonText, includeInactive && styles.toggleButtonTextActive]}>
            {includeInactive ? "Ocultar inactivos" : "Mostrar inactivos"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={loadData} style={styles.reloadButton}>
          <Text style={styles.reloadButtonText}>Actualizar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content}>
        <View style={styles.cardsContainer}>
          {getCurrentData().map((item, index) => renderCard(item, index))}
        </View>
        {getCurrentData().length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No hay elementos para mostrar</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => handleCreate(activeTab)}
      >
        <Text style={styles.fabText}>Nuevo</Text>
      </TouchableOpacity>

      <Modal
        visible={pricingPreviewVisible}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setPricingPreviewVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPricingPreviewVisible(false)}>
              <Text style={styles.modalCancelText}>Cerrar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Vista previa de precio</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.previewModalBody}>
            {pricingPreviewLoading && (
              <View style={styles.previewLoadingRow}>
                <ActivityIndicator color="#007aff" />
                <Text style={styles.previewLoadingText}>Calculando precio...</Text>
              </View>
            )}
            {pricingPreviewError && (
              <Text style={styles.previewErrorText}>{pricingPreviewError}</Text>
            )}
            {pricingPreviewResult && (
              <View style={styles.previewResultCard}>
                <Text style={styles.previewTypeLabel}>Código: {selectedTypeCode}</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewRowLabel}>Precio base</Text>
                  <Text style={styles.previewRowValue}>${pricingPreviewResult.basePrice.toFixed(2)}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewRowLabel}>Factor de categoría</Text>
                  <Text style={styles.previewRowValue}>{pricingPreviewResult.categoryFactor}</Text>
                </View>
                <View style={[styles.previewRow, styles.previewTotalRow]}>
                  <Text style={styles.previewTotalLabel}>Total</Text>
                  <Text style={styles.previewTotalValue}>${pricingPreviewResult.grandTotal.toFixed(2)}</Text>
                </View>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingItem ? "Editar" : "Crear"} {TABS.find((t) => t.key === activeTab)?.label}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSaveText, saving && styles.modalSaveTextDisabled]}>
                {saving ? "Guardando..." : "Guardar"}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {Object.entries(formData).map(([key, value]) => renderFormField(key, value))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#5f7280",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: "#f2f2f7",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 15,
    color: "#007aff",
    fontWeight: "600",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 6,
    lineHeight: 20,
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: "#fef2f2",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    color: "#b74f4d",
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#b74f4d",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  controls: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  toggleButtonActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  toggleButtonText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  toggleButtonTextActive: {
    color: "#007aff",
  },
  reloadButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  reloadButtonText: {
    fontSize: 14,
    color: "#007aff",
    fontWeight: "600",
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  tab: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  tabActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  tabText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  content: {
    flex: 1,
  },
  cardsContainer: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  cardTextBlock: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  inactiveBadge: {
    backgroundColor: "#fff1f2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  inactiveBadgeText: {
    fontSize: 11,
    color: "#be123c",
    fontWeight: "600",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#4b5563",
    marginBottom: 4,
  },
  cardCode: {
    fontSize: 12,
    color: "#9ca3af",
  },
  cardChevron: {
    color: "#9ca3af",
    fontSize: 24,
    lineHeight: 24,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  previewButtonText: {
    fontSize: 12,
    color: "#1d4ed8",
    fontWeight: "600",
  },
  previewModalBody: {
    flex: 1,
    padding: 20,
  },
  previewLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  previewLoadingText: {
    fontSize: 15,
    color: "#5f7280",
  },
  previewErrorText: {
    fontSize: 15,
    color: "#b74f4d",
    lineHeight: 22,
  },
  previewResultCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 0,
  },
  previewTypeLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  previewRowLabel: {
    fontSize: 15,
    color: "#374151",
  },
  previewRowValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },
  previewTotalRow: {
    borderBottomWidth: 0,
    marginTop: 4,
    paddingTop: 14,
  },
  previewTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  previewTotalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#007aff",
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#5f7280",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    minWidth: 88,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#007aff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    shadowColor: "#007aff",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  fabText: {
    fontSize: 15,
    color: "#ffffff",
    fontWeight: "700",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f2f2f7",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalCancelText: {
    fontSize: 16,
    color: "#6b7280",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  modalSaveText: {
    fontSize: 16,
    color: "#007aff",
    fontWeight: "700",
  },
  modalSaveTextDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: "#111827",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: "#007aff",
    borderColor: "#007aff",
  },
  checkmark: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#111827",
  },
});
