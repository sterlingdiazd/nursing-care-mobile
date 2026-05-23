import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { getFinanceDetail, type FinanceDetail, type FinanceDetailRow, type FinanceField } from "@/src/services/financeService";
import { financeTheme as t } from "@/components/finance/financeTheme";
import { DashboardSkeleton } from "@/components/finance/DashboardSkeleton";
import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { Pagination } from "@/src/components/shared/Pagination";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";

const PAGE_SIZE = 10;

export default function FinanceDetailScreen() {
  const params = useLocalSearchParams<{ metric?: string; from?: string; to?: string; title?: string }>();
  const metric = params.metric ?? "";
  const [data, setData] = useState<FinanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
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
          <Pressable onPress={() => void load()} style={styles.retry}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : data ? (
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
  scrollPad: { paddingHorizontal: 18, paddingBottom: 28, gap: 12 },
  headlineCard: { backgroundColor: t.card, borderRadius: t.radius, borderWidth: 1, borderColor: t.cardBorder, padding: 18, gap: 4, marginBottom: 4 },
  headlineValue: { color: t.text, fontSize: 30, fontWeight: "800" },
  headlineCaption: { color: t.textMuted, fontSize: 13, fontWeight: "600" },
  explain: { color: t.textMuted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 12, borderTopWidth: 1, borderTopColor: t.cardBorder, paddingTop: 12 },
  summaryItem: { gap: 2 },
  summaryLabel: { color: t.textMuted, fontSize: 10.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  summaryValue: { color: t.text, fontSize: 15, fontWeight: "800" },
  card: { backgroundColor: t.card, borderRadius: t.radiusSm, borderWidth: 1, borderColor: t.cardBorder, padding: 14, gap: 8, marginBottom: 10 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  cardPrimary: { color: t.text, fontSize: 15, fontWeight: "800", flex: 1 },
  cardAmount: { color: t.accent, fontSize: 15, fontWeight: "800" },
  bar: { height: 5, borderRadius: 999, backgroundColor: t.cardSoft, overflow: "hidden" },
  barFill: { height: 5, borderRadius: 999, backgroundColor: t.accent },
  cardMeta: { color: t.textMuted, fontSize: 12.5 },
  facts: { gap: 6, marginTop: 2, borderTopWidth: 1, borderTopColor: t.cardBorder, paddingTop: 8 },
  factRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  factLabel: { color: t.textMuted, fontSize: 13, flex: 1 },
  factValue: { color: t.text, fontSize: 13, fontWeight: "700" },
  empty: { backgroundColor: t.card, borderRadius: t.radiusSm, borderWidth: 1, borderColor: t.cardBorder, padding: 24, alignItems: "center" },
  emptyText: { color: t.textMuted, fontSize: 14 },
  errorBox: { backgroundColor: t.card, borderRadius: t.radius, padding: 20, gap: 14, alignItems: "center" },
  errorText: { color: t.textMuted, fontSize: 14, textAlign: "center" },
  retry: { backgroundColor: t.accent, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10 },
  retryText: { color: t.navy, fontWeight: "800" },
});
