// @generated-by: implementation-agent
// @pipeline-run: 2026-04-20T-shifts-settings
// @diffs: DIFF-ADMIN-SET-001
// @do-not-edit: false

import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import {
  listAdminSettings,
  updateAdminSetting,
  type SystemSettingDto,
} from "@/src/services/adminShiftsService";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function groupByCategory(settings: SystemSettingDto[]): Map<string, SystemSettingDto[]> {
  const map = new Map<string, SystemSettingDto[]>();
  for (const setting of settings) {
    const group = map.get(setting.category) ?? [];
    group.push(setting);
    map.set(setting.category, group);
  }
  return map;
}

function parseAllowedValues(json: string | null): string[] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // ignore malformed JSON
  }
  return null;
}

export default function AdminSettingsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();

  const [settings, setSettings] = useState<SystemSettingDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<SystemSettingDto | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await listAdminSettings();
      setSettings(result);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar la configuracion del sistema.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!roles.includes("ADMIN")) return void router.replace("/");
    void load();
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  const handleOpenEdit = (setting: SystemSettingDto) => {
    setEditTarget(setting);
    setEditValue(setting.value);
    setSaveError(null);
    setSaveSuccess(false);
    setEditModalVisible(true);
  };

  const handleCloseEdit = () => {
    setEditModalVisible(false);
    setEditTarget(null);
    setEditValue("");
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!editTarget) return;
    try {
      setSaveLoading(true);
      setSaveError(null);
      await updateAdminSetting(editTarget.key, editValue);
      setSaveSuccess(true);
      await load();
      setTimeout(() => {
        handleCloseEdit();
      }, 800);
    } catch (nextError) {
      setSaveError(nextError instanceof Error ? nextError.message : "No fue posible guardar el parametro.");
    } finally {
      setSaveLoading(false);
    }
  };

  const grouped = groupByCategory(settings);

  return (
    <MobileWorkspaceShell
      eyebrow="Administracion"
      title="Configuracion del sistema"
      description="Administra los parametros del sistema."
      actions={(
        <Pressable
          style={styles.button}
          onPress={() => void load()}
          testID="admin-settings-refresh-btn"
          nativeID="admin-settings-refresh-btn"
        >
          <Text style={styles.buttonText}>Actualizar</Text>
        </Pressable>
      )}
    >
      {!!error && (
        <Text
          style={styles.error}
          testID="admin-settings-error"
          nativeID="admin-settings-error"
        >
          {error}
        </Text>
      )}

      {loading && <Text style={styles.loadingText}>Cargando...</Text>}

      {!loading && settings.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Sin resultados</Text>
        </View>
      )}

      <View testID="admin-settings-list" nativeID="admin-settings-list">
        {Array.from(grouped.entries()).map(([category, items]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {items.map((setting) => (
              <Pressable
                key={setting.key}
                style={styles.settingCard}
                onPress={() => handleOpenEdit(setting)}
                testID={`admin-setting-card-${setting.key}`}
                nativeID={`admin-setting-card-${setting.key}`}
              >
                <View style={styles.settingCardHeader}>
                  <Text style={styles.settingKey}>{setting.key}</Text>
                  <Text style={styles.settingEditHint}>Editar</Text>
                </View>

                <Text style={styles.settingValue}>{setting.value}</Text>

                {setting.description && (
                  <Text style={styles.settingDescription}>{setting.description}</Text>
                )}

                {setting.modifiedAtUtc && (
                  <Text style={styles.settingModified}>
                    Modificado: {formatDate(setting.modifiedAtUtc)}
                    {setting.modifiedByActorName ? ` por ${setting.modifiedByActorName}` : ""}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      <Modal
        visible={editModalVisible}
        animationType="slide"
        onRequestClose={handleCloseEdit}
      >
        <ScrollView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar parametro</Text>
            <Pressable
              style={styles.closeButton}
              onPress={handleCloseEdit}
              testID="admin-setting-edit-close-btn"
              nativeID="admin-setting-edit-close-btn"
            >
              <Text style={styles.closeButtonText}>Cancelar</Text>
            </Pressable>
          </View>

          {editTarget && (
            <View style={styles.modalContent}>
              <View style={styles.detailField}>
                <Text style={styles.detailLabel}>Parametro</Text>
                <Text style={styles.detailValue}>{editTarget.key}</Text>
              </View>

              {editTarget.description && (
                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Descripcion</Text>
                  <Text style={styles.detailValueSecondary}>{editTarget.description}</Text>
                </View>
              )}

              <View style={styles.detailField}>
                <Text style={styles.detailLabel}>Categoria</Text>
                <Text style={styles.detailValue}>{editTarget.category}</Text>
              </View>

              <View style={styles.detailField}>
                <Text style={styles.detailLabel}>Tipo de valor</Text>
                <Text style={styles.detailValue}>{editTarget.valueType}</Text>
              </View>

              <View style={[styles.detailField, { marginTop: 8 }]}>
                <Text style={styles.detailLabel}>Valor</Text>
                {(() => {
                  const allowedValues = parseAllowedValues(editTarget.allowedValuesJson);
                  if (allowedValues && allowedValues.length > 0) {
                    return (
                      <View style={styles.allowedValuesChips}>
                        {allowedValues.map((val) => (
                          <Pressable
                            key={val}
                            style={[styles.chip, editValue === val && styles.chipActive]}
                            onPress={() => setEditValue(val)}
                            testID={`admin-setting-value-chip-${val}`}
                            nativeID={`admin-setting-value-chip-${val}`}
                          >
                            <Text style={[styles.chipText, editValue === val && styles.chipTextActive]}>
                              {val}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    );
                  }
                  return (
                    <TextInput
                      style={styles.input}
                      value={editValue}
                      onChangeText={setEditValue}
                      placeholder="Ingrese el nuevo valor"
                      multiline={editTarget.valueType === "Json"}
                      numberOfLines={editTarget.valueType === "Json" ? 4 : 1}
                      testID="admin-setting-value-input"
                      nativeID="admin-setting-value-input"
                    />
                  );
                })()}
              </View>

              {saveSuccess && (
                <View style={styles.successBanner}>
                  <Text style={styles.successBannerText}>Parametro actualizado correctamente.</Text>
                </View>
              )}

              {!!saveError && (
                <Text style={styles.error}>{saveError}</Text>
              )}

              <Pressable
                style={[styles.buttonPrimary, saveLoading && styles.buttonDisabled]}
                onPress={() => void handleSave()}
                disabled={saveLoading}
                testID="admin-setting-save-btn"
                nativeID="admin-setting-save-btn"
              >
                <Text style={styles.buttonPrimaryText}>
                  {saveLoading ? "Guardando..." : "Guardar"}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </Modal>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: "#ffffff", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: "#d1d5db" },
  buttonText: { color: "#007aff", fontWeight: "700", fontSize: 14 },
  buttonPrimary: { backgroundColor: "#007aff", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginTop: 8 },
  buttonPrimaryText: { color: "#ffffff", fontWeight: "700", fontSize: 15, textAlign: "center" },
  buttonDisabled: { opacity: 0.5 },
  error: { backgroundColor: "#fee", color: "#c00", padding: 12, borderRadius: 12, marginBottom: 12 },
  loadingText: { color: "#52637a", fontSize: 14, textAlign: "center", padding: 20 },
  emptyState: { padding: 40, alignItems: "center" },
  emptyStateText: { color: "#52637a", fontSize: 16 },
  categorySection: { marginBottom: 20 },
  categoryTitle: { fontSize: 13, fontWeight: "800", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, paddingHorizontal: 4 },
  settingCard: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 18, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  settingCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  settingKey: { color: "#111827", fontWeight: "800", fontSize: 15, flex: 1 },
  settingEditHint: { color: "#007aff", fontSize: 13, fontWeight: "700" },
  settingValue: { color: "#374151", fontSize: 14, fontFamily: "monospace", marginBottom: 4 },
  settingDescription: { color: "#6b7280", fontSize: 13, marginBottom: 4 },
  settingModified: { color: "#9ca3af", fontSize: 11, marginTop: 2 },
  modal: { flex: 1, backgroundColor: "#f2f2f7" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", backgroundColor: "#ffffff" },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  closeButton: { backgroundColor: "#ffffff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: "#d1d5db" },
  closeButtonText: { color: "#007aff", fontWeight: "700", fontSize: 14 },
  modalContent: { padding: 16, gap: 16 },
  detailField: { gap: 4 },
  detailLabel: { color: "#6b7280", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  detailValue: { color: "#111827", fontSize: 15 },
  detailValueSecondary: { color: "#4b5563", fontSize: 14 },
  allowedValuesChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: { backgroundColor: "#ffffff", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#d1d5db" },
  chipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  chipText: { color: "#111827", fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#ffffff" },
  input: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 14, padding: 14, color: "#111827", fontSize: 14 },
  successBanner: { backgroundColor: "#d1fae5", borderRadius: 12, padding: 12 },
  successBannerText: { color: "#065f46", fontWeight: "700", fontSize: 14, textAlign: "center" },
});
