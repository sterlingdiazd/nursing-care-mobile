// @generated-by: implementation-agent
// @pipeline-run: 2026-04-20T-priority-1
// @diffs: DIFF-ADMIN-CR-002
// @do-not-edit: false

import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CollapsibleSection } from "@/src/components/shared/CollapsibleSection";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import WorkflowActionBar from "@/src/components/shared/WorkflowActionBar";
import { useAuth } from "@/src/context/AuthContext";
import {
  getAdminCareRequestDetail,
  type AdminCareRequestDetailDto,
} from "@/src/services/adminPortalService";
import {
  verifyCareRequestPricing,
  type PricingVerificationResult,
} from "@/src/services/careRequestService";
import { mobileSecondarySurface, mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";
import {
  formatAdminCareRequestStatusLabel,
  getAdminCareRequestStatusColor,
  getBillingTaskActions,
} from "@/src/utils/adminCareRequestBilling";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";

function automationProps(testId: string) {
  return {
    testID: testId,
    nativeID: testId,
    ...(Platform.OS === "web"
      ? ({
          id: testId,
          "data-testid": testId,
        } as any)
      : null),
  };
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
}

function formatCurrencyOrNA(value: number | null | undefined) {
  return value == null ? "N/A" : formatCurrency(value);
}

export default function AdminCareRequestDetailScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminCareRequestDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricingResult, setPricingResult] = useState<PricingVerificationResult | null>(null);

  const load = async () => {
    if (!id) return;
    try {
      setError(null);
      setLoading(true);
      const response = await getAdminCareRequestDetail(id);
      setDetail(response);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar el detalle de la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login" as any);
    if (requiresProfileCompletion) return void router.replace("/register" as any);
    if (!roles.includes("ADMIN")) return void router.replace("/" as any);
    void load();
  }, [id, isAuthenticated, isReady, requiresProfileCompletion, roles]);

  const handleVerifyPricing = async () => {
    if (!id) return;
    try {
      setPricingModalVisible(true);
      setIsPricingLoading(true);
      setPricingError(null);
      setPricingResult(null);
      const result = await verifyCareRequestPricing(id);
      setPricingResult(result);
    } catch (nextError) {
      setPricingError(nextError instanceof Error ? nextError.message : "No fue posible verificar los precios.");
    } finally {
      setIsPricingLoading(false);
    }
  };

  const billingTaskActions = useMemo(() => {
    if (!detail) {
      return [];
    }

    return getBillingTaskActions(detail.id, detail.status);
  }, [detail]);

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) {
    return null;
  }

  return (
    <MobileWorkspaceShell
      eyebrow="Solicitud de Cuidado"
      title="Detalle de Solicitud"
      description="Detalles completos de la solicitud y tareas administrativas relacionadas."
      primaryReturnLabel="Volver a solicitudes"
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminCareRequests)}
      actions={(
        <View style={styles.headerActions}>
          <Pressable
            testID={adminTestIds.careRequests.detail.updateButton}
            nativeID={adminTestIds.careRequests.detail.updateButton}
            style={styles.refreshButton}
            onPress={() => void load()}
            accessibilityRole="button"
            accessibilityLabel="Actualizar detalle de solicitud"
          >
            <Text style={styles.refreshButtonText}>Actualizar</Text>
          </Pressable>
        </View>
      )}
    >
      <View
        {...automationProps(adminTestIds.careRequests.detail.screen)}
        style={styles.pageRoot}
      >
        {!loading && detail && (
          <Text
            testID={adminTestIds.careRequests.detail.loadedMarker}
            nativeID={adminTestIds.careRequests.detail.loadedMarker}
            {...(Platform.OS === "web"
              ? ({
                  id: adminTestIds.careRequests.detail.loadedMarker,
                  "data-testid": adminTestIds.careRequests.detail.loadedMarker,
                } as any)
              : null)}
            style={styles.hiddenMarker}
          >
            {" "}
          </Text>
        )}

        {!!error && (
          <Text testID={adminTestIds.careRequests.detail.errorBanner} nativeID={adminTestIds.careRequests.detail.errorBanner} style={styles.error}>
            {error}
          </Text>
        )}

        {loading && (
          <ActivityIndicator
            color={mobileTheme.colors.ink.accentStrong}
            accessibilityLabel="Cargando..."
            style={{ margin: mobileTheme.spacing.xxl }}
          />
        )}

        {detail && (
          <ScrollView
            testID={adminTestIds.careRequests.detail.screen}
            nativeID={adminTestIds.careRequests.detail.screen}
            showsVerticalScrollIndicator={false}
          >
            {detail.isOverdueOrStale && (
              <View style={styles.overdueAlert}>
                <Text style={styles.overdueAlertText}>Esta solicitud está vencida o estancada</Text>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Información del Cliente</Text>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nombre</Text>
                <Pressable
                  onPress={() => router.push(`/admin/clients/${detail.clientUserId}` as any)}
                  accessibilityRole="link"
                  accessibilityLabel={`Ver perfil de ${detail.clientDisplayName}`}
                >
                  <Text style={styles.fieldValueLink}>{detail.clientDisplayName}</Text>
                </Pressable>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Correo</Text>
                <Text style={styles.fieldValue}>{detail.clientEmail}</Text>
              </View>
              {detail.clientIdentificationNumber && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Cédula</Text>
                  <Text style={styles.fieldValue}>{detail.clientIdentificationNumber}</Text>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Asignación de Enfermera</Text>
              {detail.assignedNurseDisplayName ? (
                <>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Enfermera</Text>
                    <Pressable
                      onPress={() => router.push(`/admin/nurse-profiles/${detail.assignedNurseUserId}` as any)}
                      accessibilityRole="link"
                      accessibilityLabel={`Ver perfil de enfermera ${detail.assignedNurseDisplayName}`}
                    >
                      <Text style={styles.fieldValueLink}>{detail.assignedNurseDisplayName}</Text>
                    </Pressable>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Correo</Text>
                    <Text style={styles.fieldValue}>{detail.assignedNurseEmail}</Text>
                  </View>
                </>
              ) : (
                <Text style={styles.unassigned}>Sin enfermera asignada</Text>
              )}
              {detail.suggestedNurse && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Enfermera sugerida</Text>
                  <Text style={styles.fieldValue}>{detail.suggestedNurse}</Text>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Detalles de la Solicitud</Text>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Descripción</Text>
                <Text style={styles.fieldValue}>{detail.careRequestDescription}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Tipo</Text>
                <Text style={styles.fieldValue}>{detail.careRequestType}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Unidades</Text>
                <Text style={styles.fieldValue}>{detail.unit} {detail.unitType}</Text>
              </View>
              {detail.careRequestDate && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Fecha programada</Text>
                  <Text style={styles.fieldValue}>{formatTimestamp(detail.careRequestDate)}</Text>
                </View>
              )}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Estado</Text>
                <Text
                  testID={adminTestIds.careRequests.detail.statusBadge}
                  nativeID={adminTestIds.careRequests.detail.statusBadge}
                  style={[styles.statusBadge, { color: getAdminCareRequestStatusColor(detail.status) }]}
                >
                  {formatAdminCareRequestStatusLabel(detail.status)}
                </Text>
              </View>
            </View>

            {(detail.invoiceNumber || detail.bankReference || detail.voidReason || detail.receiptNumber) && (
              <View style={styles.card} testID="billing-info-card" nativeID="billing-info-card">
                <Text style={styles.cardTitle}>Información de Facturación</Text>
                {detail.invoiceNumber && (
                  <View testID="invoice-details-section" nativeID="invoice-details-section">
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Número de factura</Text>
                      <Text style={styles.fieldValue}>{detail.invoiceNumber}</Text>
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Fecha de facturación</Text>
                      <Text style={styles.fieldValue}>{formatTimestamp(detail.invoicedAtUtc)}</Text>
                    </View>
                  </View>
                )}
                {detail.bankReference && (
                  <View testID="payment-details-section" nativeID="payment-details-section">
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Referencia bancaria</Text>
                      <Text style={styles.fieldValue}>{detail.bankReference}</Text>
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Fecha de pago</Text>
                      <Text style={styles.fieldValue}>{formatTimestamp(detail.paidAtUtc)}</Text>
                    </View>
                  </View>
                )}
                {detail.voidReason && (
                  <View testID="void-details-section" nativeID="void-details-section">
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Motivo de anulación</Text>
                      <Text style={styles.fieldValue}>{detail.voidReason}</Text>
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Fecha de anulación</Text>
                      <Text style={styles.fieldValue}>{formatTimestamp(detail.voidedAtUtc)}</Text>
                    </View>
                  </View>
                )}
                {detail.receiptNumber && (
                  <View testID="receipt-details-section" nativeID="receipt-details-section">
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Número de recibo</Text>
                      <Text testID="receipt-number-display" nativeID="receipt-number-display" style={styles.fieldValue}>
                        {detail.receiptNumber}
                      </Text>
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Fecha de recibo</Text>
                      <Text style={styles.fieldValue}>{formatTimestamp(detail.receiptGeneratedAtUtc)}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {billingTaskActions.length > 0 && (
              <View style={styles.actionsCard}>
                <Text style={styles.actionCardTitle}>Tareas de facturación</Text>
                <Text style={styles.actionCardDescription}>
                  Continúa el flujo de cobro en una pantalla dedicada para mantener foco y trazabilidad.
                </Text>
                <WorkflowActionBar
                  actions={billingTaskActions.map((action) => ({
                    label: action.label,
                    onPress: () => router.push(action.route as any),
                    variant: action.variant,
                    testID:
                      action.action === "invoice"
                        ? adminTestIds.careRequests.detail.invoiceButton
                        : action.action === "pay"
                        ? adminTestIds.careRequests.detail.payButton
                        : action.action === "void"
                        ? adminTestIds.careRequests.detail.voidButton
                        : adminTestIds.careRequests.detail.receiptButton,
                  }))}
                />
              </View>
            )}

            <View style={styles.actionsCard}>
              <Text style={styles.actionCardTitle}>Validación de precios</Text>
              <Text style={styles.actionCardDescription}>
                Mantén esta verificación como una interacción ligera sin salir del detalle.
              </Text>
              <WorkflowActionBar
                actions={[
                  {
                    label: isPricingLoading ? "Verificando..." : "Verificar precios",
                    onPress: () => void handleVerifyPricing(),
                    variant: "secondary",
                    disabled: isPricingLoading,
                    testID: "price-breakdown-verify-button",
                  },
                ]}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Desglose de Precios</Text>

              {/* Always visible: Total */}
              <View {...automationProps("price-breakdown-total")} style={styles.field}>
                <Text style={styles.fieldLabel}>Total</Text>
                <Text style={[styles.fieldValue, styles.totalValue]}>{formatCurrency(detail.pricingBreakdown.total)}</Text>
              </View>

              {/* Always visible: Precio base */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Precio base</Text>
                <Text style={styles.fieldValue}>{formatCurrency(detail.pricingBreakdown.basePrice)}</Text>
              </View>

              {/* Conditional: factor de categoria (show if != 1) */}
              {detail.pricingBreakdown.categoryFactor != null && Number(detail.pricingBreakdown.categoryFactor) !== 1 && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Factor de categoria</Text>
                  <Text style={styles.fieldValue}>{detail.pricingBreakdown.categoryFactor}</Text>
                </View>
              )}

              {/* Conditional: factor de distancia (show if != 1) */}
              {detail.pricingBreakdown.distanceFactor && Number(detail.pricingBreakdown.distanceFactorValue) !== 1 && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Factor de distancia</Text>
                  <Text style={styles.fieldValue}>{detail.pricingBreakdown.distanceFactor} (x{detail.pricingBreakdown.distanceFactorValue})</Text>
                </View>
              )}

              {/* Conditional: factor de complejidad (show if != 1) */}
              {detail.pricingBreakdown.complexityLevel && Number(detail.pricingBreakdown.complexityFactorValue) !== 1 && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Factor de complejidad</Text>
                  <Text style={styles.fieldValue}>{detail.pricingBreakdown.complexityLevel} (x{detail.pricingBreakdown.complexityFactorValue})</Text>
                </View>
              )}

              {/* Conditional: descuento por volumen (show if > 0) */}
              {detail.pricingBreakdown.volumeDiscountPercent > 0 && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Descuento por volumen</Text>
                  <Text style={styles.fieldValue}>{detail.pricingBreakdown.volumeDiscountPercent}%</Text>
                </View>
              )}

              {/* Conditional: insumos medicos (show if > 0) */}
              {detail.pricingBreakdown.medicalSuppliesCost > 0 && (
                <View {...automationProps("price-breakdown-medical-supplies")} style={styles.field}>
                  <Text style={styles.fieldLabel}>Insumos medicos</Text>
                  <Text style={styles.fieldValue}>{formatCurrency(detail.pricingBreakdown.medicalSuppliesCost)}</Text>
                </View>
              )}

              {/* Collapsed: detailed breakdown */}
              <CollapsibleSection title="Ver desglose completo">
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Categoria</Text>
                  <Text style={styles.fieldValue}>{detail.pricingBreakdown.category}</Text>
                </View>
                <View {...automationProps("price-breakdown-line-before-discount")} style={styles.field}>
                  <Text style={styles.fieldLabel}>Linea antes de descuento</Text>
                  <Text style={styles.fieldValue}>
                    {formatCurrencyOrNA(detail.pricingBreakdown.lineBeforeVolumeDiscount)}
                  </Text>
                </View>
                <View {...automationProps("price-breakdown-unit-price-after-discount")} style={styles.field}>
                  <Text style={styles.fieldLabel}>Precio unitario tras descuento</Text>
                  <Text style={styles.fieldValue}>
                    {formatCurrencyOrNA(detail.pricingBreakdown.unitPriceAfterVolumeDiscount)}
                  </Text>
                </View>
                <View {...automationProps("price-breakdown-subtotal-before-supplies")} style={styles.field}>
                  <Text style={styles.fieldLabel}>Subtotal antes de insumos</Text>
                  <Text style={styles.fieldValue}>{formatCurrency(detail.pricingBreakdown.subtotalBeforeSupplies)}</Text>
                </View>
              </CollapsibleSection>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Línea de Tiempo</Text>
              {detail.timeline.length === 0 ? (
                <Text style={styles.emptyText}>No hay eventos en la línea de tiempo.</Text>
              ) : (
                detail.timeline.map((event) => (
                  <View key={event.id} style={styles.timelineEvent}>
                    <Text style={styles.timelineTimestamp}>{formatTimestamp(event.occurredAtUtc)}</Text>
                    <Text style={styles.timelineTitle}>{event.title}</Text>
                    <Text style={styles.timelineDescription}>{event.description}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Fechas</Text>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Creada</Text>
                <Text style={styles.fieldValue}>{formatTimestamp(detail.createdAtUtc)}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Actualizada</Text>
                <Text style={styles.fieldValue}>{formatTimestamp(detail.updatedAtUtc)}</Text>
              </View>
              {detail.approvedAtUtc && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Aprobada</Text>
                  <Text style={styles.fieldValue}>{formatTimestamp(detail.approvedAtUtc)}</Text>
                </View>
              )}
              {detail.rejectedAtUtc && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Rechazada</Text>
                  <Text style={styles.fieldValue}>{formatTimestamp(detail.rejectedAtUtc)}</Text>
                </View>
              )}
              {detail.completedAtUtc && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Completada</Text>
                  <Text style={styles.fieldValue}>{formatTimestamp(detail.completedAtUtc)}</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      <Modal
        visible={pricingModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPricingModalVisible(false)}
      >
        <View {...automationProps("price-verification-modal")} style={styles.pricingModalContainer}>
          <View style={styles.pricingModalHeader}>
            <Text style={styles.pricingModalTitle}>Verificación de precios</Text>
            <Pressable
              {...automationProps("price-verification-close-button")}
              onPress={() => setPricingModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Cerrar verificación de precios"
            >
              <Text style={styles.pricingModalClose}>Cerrar</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.pricingModalBody}>
            {isPricingLoading && (
              <View style={styles.pricingLoadingRow}>
                <ActivityIndicator color={mobileTheme.colors.ink.accentStrong} accessibilityLabel="Cargando..." />
                <Text style={styles.pricingLoadingText}>Verificando precios...</Text>
              </View>
            )}

            {!!pricingError && (
              <Text {...automationProps("price-verification-error-banner")} style={styles.pricingErrorText}>
                {pricingError}
              </Text>
            )}

            {pricingResult?.matches && (
              <View {...automationProps("price-verification-success")} style={styles.pricingSuccessCard}>
                <Text style={styles.pricingSuccessText}>Todos los valores coinciden</Text>
                {pricingResult.limitationNotes.length > 0 && (
                  <View {...automationProps("price-verification-limitation")} style={styles.pricingNotesList}>
                    {pricingResult.limitationNotes.map((note, index) => (
                      <Text key={`${note}-${index}`} style={styles.pricingNoteItem}>
                        {note}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {pricingResult && !pricingResult.matches && (
              <View {...automationProps("price-verification-discrepancies")} style={styles.pricingDiscrepancyCard}>
                <Text style={styles.pricingDiscrepancyTitle}>Discrepancias encontradas</Text>
                <View style={styles.pricingTableHeader}>
                  <Text style={[styles.pricingTableCell, styles.pricingTableHeaderText]}>Campo</Text>
                  <Text style={[styles.pricingTableCell, styles.pricingTableHeaderText]}>Guardado</Text>
                  <Text style={[styles.pricingTableCell, styles.pricingTableHeaderText]}>Actual</Text>
                </View>
                {pricingResult.discrepancies.map((discrepancy, index) => (
                  <View key={`${discrepancy.fieldName}-${index}`} style={styles.pricingTableRow}>
                    <Text style={styles.pricingTableCell}>{discrepancy.fieldName}</Text>
                    <Text style={styles.pricingTableCell}>{discrepancy.storedValue}</Text>
                    <Text style={styles.pricingTableCell}>{discrepancy.currentValue}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  pageRoot: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: mobileTheme.spacing.sm,
    alignItems: "center",
  },
  backButton: {
    ...mobileSecondarySurface,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  backButtonText: {
    color: mobileTheme.colors.ink.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  refreshButton: {
    ...mobileSecondarySurface,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  refreshButtonText: {
    color: mobileTheme.colors.ink.accent,
    fontWeight: "800",
    fontSize: 14,
  },
  error: {
    backgroundColor: mobileTheme.colors.surface.danger,
    color: mobileTheme.colors.status.dangerText,
    padding: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radius.lg,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.danger,
    marginBottom: mobileTheme.spacing.lg,
  },
  hiddenMarker: {
    height: 0,
    width: 0,
    opacity: 0,
  },
  overdueAlert: {
    backgroundColor: mobileTheme.colors.surface.warning,
    borderRadius: mobileTheme.radius.lg,
    padding: mobileTheme.spacing.lg,
    marginBottom: mobileTheme.spacing.lg,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.warning,
  },
  overdueAlertText: {
    color: mobileTheme.colors.status.warningText,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  card: {
    ...mobileSurfaceCard,
    padding: mobileTheme.spacing.lg,
    marginBottom: mobileTheme.spacing.lg,
  },
  cardTitle: {
    ...mobileTheme.typography.sectionTitle,
    color: mobileTheme.colors.ink.primary,
    marginBottom: mobileTheme.spacing.lg,
  },
  field: {
    marginBottom: mobileTheme.spacing.md,
  },
  fieldLabel: {
    ...mobileTheme.typography.eyebrow,
    color: mobileTheme.colors.ink.muted,
    marginBottom: mobileTheme.spacing.xs,
  },
  fieldValue: {
    ...mobileTheme.typography.body,
    color: mobileTheme.colors.ink.primary,
  },
  fieldValueLink: {
    ...mobileTheme.typography.body,
    color: mobileTheme.colors.ink.accent,
    textDecorationLine: "underline",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  unassigned: {
    color: mobileTheme.colors.status.dangerText,
    fontSize: 14,
    fontStyle: "italic",
  },
  emptyText: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 14,
    fontStyle: "italic",
  },
  timelineEvent: {
    marginBottom: mobileTheme.spacing.lg,
    paddingBottom: mobileTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: mobileTheme.colors.border.subtle,
  },
  timelineTimestamp: {
    color: mobileTheme.colors.ink.muted,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: mobileTheme.spacing.xs,
  },
  timelineTitle: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  timelineDescription: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 13,
  },
  statusBadge: {
    fontSize: 15,
    fontWeight: "800",
  },
  actionsCard: {
    ...mobileSurfaceCard,
    padding: mobileTheme.spacing.lg,
    marginBottom: mobileTheme.spacing.lg,
  },
  actionCardTitle: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: mobileTheme.spacing.sm,
  },
  actionCardDescription: {
    color: mobileTheme.colors.ink.secondary,
    lineHeight: 22,
    marginBottom: mobileTheme.spacing.md,
  },
  pricingModalContainer: {
    flex: 1,
    backgroundColor: mobileTheme.colors.surface.canvas,
  },
  pricingModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: mobileTheme.spacing.xl,
    backgroundColor: mobileTheme.colors.surface.primary,
    borderBottomWidth: 1,
    borderBottomColor: mobileTheme.colors.border.subtle,
  },
  pricingModalTitle: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  pricingModalClose: {
    fontSize: 16,
    color: mobileTheme.colors.ink.accent,
    fontWeight: "700",
  },
  pricingModalBody: {
    flex: 1,
    padding: mobileTheme.spacing.xl,
  },
  pricingLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.xl,
  },
  pricingLoadingText: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 15,
  },
  pricingErrorText: {
    color: mobileTheme.colors.status.dangerText,
    fontSize: 15,
    lineHeight: 22,
  },
  pricingSuccessCard: {
    backgroundColor: mobileTheme.colors.surface.success,
    borderRadius: mobileTheme.radius.lg,
    padding: mobileTheme.spacing.lg,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.success,
    gap: mobileTheme.spacing.md,
  },
  pricingSuccessText: {
    color: mobileTheme.colors.status.successText,
    fontSize: 16,
    fontWeight: "800",
  },
  pricingNotesList: {
    gap: mobileTheme.spacing.sm,
  },
  pricingNoteItem: {
    color: mobileTheme.colors.status.successText,
    fontSize: 14,
    lineHeight: 20,
  },
  pricingDiscrepancyCard: {
    backgroundColor: mobileTheme.colors.surface.primary,
    borderRadius: mobileTheme.radius.lg,
    padding: mobileTheme.spacing.lg,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.danger,
  },
  pricingDiscrepancyTitle: {
    color: mobileTheme.colors.status.dangerText,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: mobileTheme.spacing.lg,
  },
  pricingTableHeader: {
    flexDirection: "row",
    backgroundColor: mobileTheme.colors.surface.danger,
    borderRadius: mobileTheme.radius.sm,
    paddingVertical: mobileTheme.spacing.sm,
    paddingHorizontal: mobileTheme.spacing.xs,
    marginBottom: mobileTheme.spacing.xs,
  },
  pricingTableHeaderText: {
    color: mobileTheme.colors.status.dangerText,
    fontWeight: "700",
  },
  pricingTableRow: {
    flexDirection: "row",
    paddingVertical: mobileTheme.spacing.sm,
    paddingHorizontal: mobileTheme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: mobileTheme.colors.border.danger,
  },
  pricingTableCell: {
    flex: 1,
    fontSize: 13,
    color: mobileTheme.colors.ink.secondary,
  },
});
