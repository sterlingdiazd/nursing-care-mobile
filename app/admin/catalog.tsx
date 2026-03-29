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
  type CareRequestCategoryListItemDto,
  type CareRequestTypeListItemDto,
  type UnitTypeListItemDto,
  type DistanceFactorListItemDto,
  type ComplexityLevelListItemDto,
  type VolumeDiscountRuleListItemDto,
  type NurseSpecialtyListItemDto,
  type NurseCategoryListItemDto,
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
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.displayName ?? item.code}</Text>
          {!item.isActive && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inactivo</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardSubtitle}>{getSubtitle()}</Text>
        {item.code && <Text style={styles.cardCode}>Código: {item.code}</Text>}
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
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Catálogo de precios</Text>
        <Text style={styles.subtitle}>Gestiona categorías, tipos y factores</Text>
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
            {includeInactive ? "✓ Mostrar inactivos" : "Mostrar inactivos"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={loadData} style={styles.reloadButton}>
          <Text style={styles.reloadButtonText}>Recargar</Text>
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
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

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
    backgroundColor: "#f4f2ec",
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
    padding: 16,
    backgroundColor: "#fffdf8",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(23, 48, 66, 0.08)",
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#1f4b6e",
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#173042",
    fontFamily: "serif",
  },
  subtitle: {
    fontSize: 14,
    color: "#5f7280",
    marginTop: 4,
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
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
    padding: 16,
    gap: 8,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.08)",
    backgroundColor: "#fffdf8",
  },
  toggleButtonActive: {
    backgroundColor: "#1f4b6e",
    borderColor: "#1f4b6e",
  },
  toggleButtonText: {
    fontSize: 14,
    color: "#173042",
  },
  toggleButtonTextActive: {
    color: "#fff",
  },
  reloadButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.08)",
    backgroundColor: "#fffdf8",
  },
  reloadButtonText: {
    fontSize: 14,
    color: "#173042",
    fontWeight: "600",
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.08)",
  },
  tabActive: {
    backgroundColor: "#1f4b6e",
    borderColor: "#1f4b6e",
  },
  tabText: {
    fontSize: 14,
    color: "#173042",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
  },
  content: {
    flex: 1,
  },
  cardsContainer: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#fffdf8",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.08)",
    shadowColor: "#152230",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#173042",
    flex: 1,
  },
  inactiveBadge: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 12,
    color: "#b74f4d",
    fontWeight: "600",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#5f7280",
    marginBottom: 4,
  },
  cardCode: {
    fontSize: 12,
    color: "#60707a",
    fontFamily: "monospace",
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1f4b6e",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#152230",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  fabText: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "300",
    marginTop: -2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f4f2ec",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fffdf8",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(23, 48, 66, 0.08)",
  },
  modalCancelText: {
    fontSize: 16,
    color: "#5f7280",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#173042",
  },
  modalSaveText: {
    fontSize: 16,
    color: "#1f4b6e",
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
    color: "#173042",
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "rgba(23, 48, 66, 0.08)",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#173042",
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
    borderColor: "rgba(23, 48, 66, 0.08)",
    backgroundColor: "#fffdf8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: "#1f4b6e",
    borderColor: "#1f4b6e",
  },
  checkmark: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#173042",
  },
});
