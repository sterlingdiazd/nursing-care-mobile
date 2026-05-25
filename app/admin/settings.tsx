// @generated-by: implementation-agent
// @pipeline-run: 2026-05-23-design-system-wave4
// @diffs: DIFF-ADMIN-SET-003
// @do-not-edit: false

import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { hapticFeedback } from "@/src/utils/haptics";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { Banner } from "@/src/components/shared/Banner";
import { FormPanel } from "@/src/components/shared/FormPanel";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import {
  listAdminSettings,
  updateAdminSetting,
  type SystemSettingDto,
} from "@/src/services/adminShiftsService";
import { formatDateTimeES } from "@/src/utils/spanishTextValidator";

function formatDate(value: string) {
  return formatDateTimeES(value);
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

// Short Spanish labels for each setting key (the backend descriptions are long/English; never show
// the raw key to the owner). Fallback order: label → description → key.
// COMPANY_* keys use Spanish labels so the owner always sees familiar names.
const SETTING_LABELS: Record<string, string> = {
  PORTAL_DEFAULT_LANGUAGE: "Idioma del portal",
  DASHBOARD_HIGH_SEVERITY_THRESHOLD: "Umbral de severidad alta (panel)",
  CARE_REQUEST_AGING_THRESHOLD_HOURS: "Horas para marcar solicitud atrasada",
  FEATURE_TOGGLE_REPORTS_V2: "Reportes v2 (activar)",
  NOTIFICATIONS_POLLING_INTERVAL_MS: "Actualización de notificaciones (ms)",
  COMPANY_NAME: "Nombre de la empresa",
  COMPANY_RNC: "RNC de la empresa",
  COMPANY_PHONE: "Teléfono de la empresa",
  COMPANY_ADDRESS: "Dirección de la empresa",
  PAYROLL_PAYMENT_DATE_MODE: "Modo de fecha de pago de nómina",
  PAYROLL_FIRST_HALF_PAYMENT_DAY: "Día de pago · 1ra quincena",
  PAYROLL_SECOND_HALF_PAYMENT_DAY: "Día de pago · 2da quincena (0 = último día del mes)",
  PAYROLL_DAYS_BEFORE_MONTH_END: "Días antes de fin de mes (modo offset)",
};

const CATEGORY_LABELS: Record<string, string> = {
  Empresa: "Empresa",
  Dashboard: "Panel",
  Localization: "Idioma",
  Operations: "Operación",
  General: "General",
  Nómina: "Nómina",
};

const settingLabel = (s: { key: string; description?: string | null }): string =>
  SETTING_LABELS[s.key] ?? (s.description?.trim() || s.key);

const categoryLabel = (c: string): string => CATEGORY_LABELS[c] ?? c;

export default function AdminSettingsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const isAdmin = roles.includes("ADMIN");

  const [settings, setSettings] = useState<SystemSettingDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Inline edit panel state (replaces Modal)
  const [editTarget, setEditTarget] = useState<SystemSettingDto | null>(null);
  const [editValue, setEditValue] = useState("");
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
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar la configuración del sistema.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!isAdmin) return void router.replace("/");
    void load();
  }, [isReady, isAuthenticated, requiresProfileCompletion, isAdmin]);

  const handleOpenEdit = (setting: SystemSettingDto) => {
    setEditTarget(setting);
    setEditValue(setting.value);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleCloseEdit = () => {
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
      handleCloseEdit();
    } catch (nextError) {
      setSaveError(nextError instanceof Error ? nextError.message : "No fue posible guardar el parámetro.");
    } finally {
      setSaveLoading(false);
    }
  };

  const grouped = groupByCategory(settings);

  return (
    <MobileWorkspaceShell
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      primaryReturnLabel="Volver"
      eyebrow="Administración"
      title="Configuración del sistema"
      testID="admin-settings-screen"
      nativeID="admin-settings-screen"
    >
      <Banner
        tone="error"
        message={error}
        testID="admin-settings-error"
      />

      {loading && <Text style={styles.loadingText}>Cargando...</Text>}

      {!loading && settings.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Sin resultados</Text>
        </View>
      )}

      <View testID="admin-settings-list" nativeID="admin-settings-list">
        {Array.from(grouped.entries()).map(([category, items]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{categoryLabel(category)}</Text>
            {items.map((setting) => {
              const hasValue = !!(setting.value && setting.value.trim());
              return (
              <View key={setting.key}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${settingLabel(setting)}`}
                  style={styles.settingCard}
                  onPress={() => {
                    hapticFeedback.selection();
                    editTarget?.key === setting.key ? handleCloseEdit() : handleOpenEdit(setting);
                  }}
                  testID={`admin-setting-card-${setting.key}`}
                  nativeID={`admin-setting-card-${setting.key}`}
                >
                  <View style={styles.settingCardHeader}>
                    <Text style={styles.settingKey} numberOfLines={2}>{settingLabel(setting)}</Text>
                    <Text style={styles.settingEditHint}>
                      {editTarget?.key === setting.key ? "Cerrar" : "Editar"}
                    </Text>
                  </View>

                  {/* Hide the human description when the value is absent — show "Sin definir" placeholder instead */}
                  <Text style={[styles.settingValue, !hasValue && styles.settingValueEmpty]}>
                    {hasValue ? setting.value : "Sin definir"}
                  </Text>

                  {setting.modifiedAtUtc && (
                    <Text style={styles.settingModified}>
                      Modificado: {formatDate(setting.modifiedAtUtc)}
                      {setting.modifiedByActorName ? ` por ${setting.modifiedByActorName}` : ""}
                    </Text>
                  )}
                </Pressable>

                {editTarget?.key === setting.key && (
                  <FormPanel
                    tone="accent"
                    testID="admin-setting-edit-panel"
                    footer={(
                      <View style={styles.editActions}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Guardar parametro"
                          style={[styles.buttonPrimary, saveLoading && styles.buttonDisabled]}
                          onPress={() => {
                            hapticFeedback.light();
                            void handleSave();
                          }}
                          disabled={saveLoading}
                          testID="admin-setting-save-btn"
                          nativeID="admin-setting-save-btn"
                        >
                          <Text style={styles.buttonPrimaryText}>
                            {saveLoading ? "Guardando..." : "Guardar"}
                          </Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Cancelar edicion"
                          style={styles.button}
                          onPress={() => {
                            hapticFeedback.selection();
                            handleCloseEdit();
                          }}
                          testID="admin-setting-cancel-btn"
                          nativeID="admin-setting-cancel-btn"
                        >
                          <Text style={styles.buttonText}>Cancelar</Text>
                        </Pressable>
                      </View>
                    )}
                  >
                    <View style={styles.detailField}>
                      <Text style={styles.detailLabel}>Parámetro</Text>
                      <Text style={styles.detailValue}>{settingLabel(editTarget)}</Text>
                    </View>

                    <View style={styles.detailField}>
                      <Text style={styles.detailLabel}>Categoría</Text>
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
                                  onPress={() => {
                                    hapticFeedback.selection();
                                    setEditValue(val);
                                  }}
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

                    <Banner tone="success" message={saveSuccess ? "Parámetro actualizado correctamente." : null} />
                    <Banner tone="error" message={saveError} />
                  </FormPanel>
                )}
              </View>
              );
            })}
          </View>
        ))}
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: designTokens.color.border.strong },
  buttonText: { color: designTokens.color.ink.accent, fontWeight: "700", fontSize: 14 },
  buttonPrimary: { backgroundColor: designTokens.color.ink.accent, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flex: 1 },
  buttonPrimaryText: { color: designTokens.color.ink.inverse, fontWeight: "700", fontSize: 15, textAlign: "center" },
  buttonDisabled: { opacity: 0.5 },
  loadingText: { color: designTokens.color.ink.secondary, fontSize: 14, textAlign: "center", padding: 20 },
  emptyState: { padding: 40, alignItems: "center" },
  emptyStateText: { color: designTokens.color.ink.secondary, fontSize: 16 },
  categorySection: { marginBottom: 20 },
  categoryTitle: { fontSize: 13, fontWeight: "800", color: designTokens.color.ink.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, paddingHorizontal: 4 },
  settingCard: { ...mobileSurfaceCard, padding: 16, marginBottom: 4 },
  settingCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  settingKey: { color: designTokens.color.ink.primary, fontWeight: "800", fontSize: 15, flex: 1 },
  settingEditHint: { color: designTokens.color.ink.accent, fontSize: 13, fontWeight: "700" },
  settingValue: { color: designTokens.color.ink.primary, fontSize: 15, fontWeight: "700", marginBottom: 4 },
  settingValueEmpty: { color: designTokens.color.ink.muted, fontWeight: "600", fontStyle: "italic" },
  settingDescription: { color: designTokens.color.ink.muted, fontSize: 13, marginBottom: 4 },
  settingModified: { color: designTokens.color.ink.muted, fontSize: 11, marginTop: 2 },
  editActions: { flexDirection: "row", gap: 8 },
  detailField: { gap: 4 },
  detailLabel: { color: designTokens.color.ink.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  detailValue: { color: designTokens.color.ink.primary, fontSize: 15 },
  detailValueSecondary: { color: designTokens.color.ink.secondary, fontSize: 14 },
  allowedValuesChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: designTokens.color.border.strong },
  chipActive: { backgroundColor: designTokens.color.ink.primary, borderColor: designTokens.color.ink.primary },
  chipText: { color: designTokens.color.ink.primary, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: designTokens.color.ink.inverse },
  input: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: designTokens.color.border.strong, borderRadius: 14, padding: 14, color: designTokens.color.ink.primary, fontSize: 14 },
});
