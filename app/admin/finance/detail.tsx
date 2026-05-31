import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { getFinanceDetail, type FinanceDetail, type FinanceDetailRow, type FinanceField } from "@/src/services/financeService";
import { financeTheme as t } from "@/components/finance/financeTheme";
import { DashboardSkeleton } from "@/components/finance/DashboardSkeleton";
import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { Pagination } from "@/src/components/shared/Pagination";
import { SwipePager } from "@/src/components/shared/SwipePager";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { hapticFeedback } from "@/src/utils/haptics";
import { designTokens } from "@/src/design-system/tokens";

const PAGE_SIZE = 10;

export default function FinanceDetailScreen() {
  const params = useLocalSearchParams<{ metric?: string; from?: string; to?: string; title?: string }>();
  const metric = params.metric ?? "";
  const [data, setData] = useState<FinanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    // Opened directly without a metric (no deep-link param): show a Spanish hint
    // instead of calling the API and surfacing its English validation error.
    if (!metric) {
      setData(null);
      setError("Abre un detalle desde el panel de Finanzas.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await getFinanceDetail(metric, { from: params.from, to: params.to }));
      setPage(1);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo cargar el detalle.");
    } finally {
      setLoading(false);
    }
  }, [metric, params.from, params.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.rows.length / PAGE_SIZE)) : 1;
  // Pagination uses 1-based page numbers
  const pageRows = useMemo(
    () => (data ? data.rows.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE) : []),
    [data, page],
  );

  const screenTitle = data?.title ?? params.title ?? "Detalle";

  return (
    <MobileWorkspaceShell
      eyebrow="Detalle"
      title={screenTitle}
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      primaryReturnLabel="Volver"
      testID="finance-detail-screen"
      nativeID="finance-detail-screen"
      disableScroll
    >
      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => {
              hapticFeedback.light();
              void load();
            }}
            style={styles.retry}
            accessibilityRole="button"
            accessibilityLabel="Reintentar cargar el detalle financiero"
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : data ? (
        // SwipePager adds horizontal swipe-to-paginate on top of the existing Pagination bar
        <SwipePager page={page} pageCount={totalPages} onPageChange={setPage} style={{ flex: 1 }}>
          <FlatList
            data={pageRows}
            keyExtractor={(_, i) => `${page}-${i}`}
            renderItem={({ item }) => <RecordCard row={item} />}
            ListHeaderComponent={<Headline data={data} />}
            ListFooterComponent={
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                testID="finance-detail-pagination"
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}><Text style={styles.emptyText}>Sin registros en el período.</Text></View>
            }
            contentContainerStyle={styles.scrollPad}
            showsVerticalScrollIndicator={false}
            testID="finance-detail-list"
          />
        </SwipePager>
      ) : null}
    </MobileWorkspaceShell>
  );
}

function Headline({ data }: { data: FinanceDetail }) {
  return (
    <View style={styles.headlineCard}>
      <Text style={styles.headlineValue}>{data.headline}</Text>
      <Text style={styles.headlineCaption}>{data.headlineCaption}</Text>
      {data.explanation ? <Text style={styles.explain}>{data.explanation}</Text> : null}
      {data.summary.length > 0 ? (
        <View style={styles.summaryRow}>
          {data.summary.map((f, i) => (
            <View key={i} style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{f.label}</Text>
              <Text style={[styles.summaryValue, f.emphasize ? { color: t.accent } : null]}>{f.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function RecordCard({ row }: { row: FinanceDetailRow }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardPrimary}>{row.primary}</Text>
        <Text style={styles.cardAmount}>{row.amount}</Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${Math.max(3, row.barFraction * 100)}%` }]} />
      </View>
      {row.meta ? <Text style={styles.cardMeta}>{row.meta}</Text> : null}
      {row.facts.length > 0 ? (
        <View style={styles.facts}>
          {row.facts.map((f: FinanceField, i: number) => (
            <View key={i} style={styles.factRow}>
              <Text style={styles.factLabel}>{f.label}</Text>
              <Text style={[styles.factValue, f.emphasize ? { color: t.accent } : null]}>{f.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollPad: { paddingHorizontal: designTokens.spacing.xl, paddingBottom: designTokens.spacing.xxxl, gap: designTokens.spacing.md },
  // Headline: white card with subtle border
  headlineCard: { backgroundColor: t.card, borderRadius: t.radius, borderWidth: 1, borderColor: t.cardBorder, padding: designTokens.spacing.xl, gap: designTokens.spacing.xs, marginBottom: designTokens.spacing.xs },
  headlineValue: { color: t.text, fontSize: designTokens.typography.display.fontSize, fontWeight: "800" },
  headlineCaption: { color: t.textMuted, fontSize: designTokens.typography.label.fontSize, fontWeight: "600" },
  explain: { color: t.textMuted, fontSize: designTokens.typography.label.fontSize, lineHeight: 19, marginTop: designTokens.spacing.sm },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.lg, marginTop: designTokens.spacing.md, borderTopWidth: 1, borderTopColor: t.cardBorder, paddingTop: designTokens.spacing.md },
  summaryItem: { gap: designTokens.spacing.xs },
  summaryLabel: { color: t.textMuted, fontSize: designTokens.typography.caption.fontSize, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  summaryValue: { color: t.text, fontSize: designTokens.typography.body.fontSize, fontWeight: "800" },
  // Record card: white card with subtle border
  card: { backgroundColor: t.card, borderRadius: t.radiusSm, borderWidth: 1, borderColor: t.cardBorder, padding: designTokens.spacing.lg, gap: designTokens.spacing.sm, marginBottom: designTokens.spacing.md },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: designTokens.spacing.md },
  cardPrimary: { color: t.text, fontSize: designTokens.typography.body.fontSize, fontWeight: "800", flex: 1 },
  cardAmount: { color: t.accent, fontSize: designTokens.typography.body.fontSize, fontWeight: "800" },
  // Bar track: light neutral surface
  bar: { height: 5, borderRadius: designTokens.radius.pill, backgroundColor: t.cardSoft, overflow: "hidden" },
  barFill: { height: 5, borderRadius: designTokens.radius.pill, backgroundColor: t.accent },
  cardMeta: { color: t.textMuted, fontSize: designTokens.typography.label.fontSize },
  facts: { gap: designTokens.spacing.sm, marginTop: designTokens.spacing.xs, borderTopWidth: 1, borderTopColor: t.cardBorder, paddingTop: designTokens.spacing.sm },
  factRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.md },
  factLabel: { color: t.textMuted, fontSize: designTokens.typography.label.fontSize, flex: 1 },
  factValue: { color: t.text, fontSize: designTokens.typography.label.fontSize, fontWeight: "700" },
  empty: { backgroundColor: t.card, borderRadius: t.radiusSm, borderWidth: 1, borderColor: t.cardBorder, padding: designTokens.spacing.xxl, alignItems: "center" },
  emptyText: { color: t.textMuted, fontSize: designTokens.typography.body.fontSize },
  // Error box: white card
  errorBox: { backgroundColor: t.card, borderRadius: t.radius, borderWidth: 1, borderColor: t.cardBorder, padding: designTokens.spacing.xl, gap: designTokens.spacing.lg, alignItems: "center" },
  errorText: { color: t.textMuted, fontSize: designTokens.typography.body.fontSize, textAlign: "center" },
  retry: { backgroundColor: t.accent, borderRadius: designTokens.radius.pill, paddingHorizontal: designTokens.spacing.xxl, paddingVertical: designTokens.spacing.md },
  retryText: { color: designTokens.color.ink.inverse, fontWeight: "800" },
});
