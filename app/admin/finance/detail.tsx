import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { getFinanceDetail, type FinanceDetail, type FinanceDetailRow, type FinanceField } from "@/src/services/financeService";
import { financeTheme as t } from "@/components/finance/financeTheme";
import { DashboardSkeleton } from "@/components/finance/DashboardSkeleton";

const PAGE_SIZE = 10;

export default function FinanceDetailScreen() {
  const params = useLocalSearchParams<{ metric?: string; from?: string; to?: string; title?: string }>();
  const metric = params.metric ?? "";
  const [data, setData] = useState<FinanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getFinanceDetail(metric, { from: params.from, to: params.to }));
      setPage(0);
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
  const pageRows = useMemo(
    () => (data ? data.rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE) : []),
    [data, page],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Volver">
          <FontAwesome name="chevron-left" size={16} color={t.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Detalle</Text>
          <Text style={styles.title} numberOfLines={1}>{data?.title ?? params.title ?? "Detalle"}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.scrollPad}><DashboardSkeleton /></View>
      ) : error ? (
        <View style={styles.scrollPad}>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retry}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        </View>
      ) : data ? (
        <FlatList
          data={pageRows}
          keyExtractor={(_, i) => `${page}-${i}`}
          renderItem={({ item }) => <RecordCard row={item} />}
          ListHeaderComponent={<Headline data={data} />}
          ListFooterComponent={
            <Pager page={page} totalPages={totalPages} total={data.rows.length} onPrev={() => setPage((p) => Math.max(0, p - 1))} onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))} />
          }
          ListEmptyComponent={
            <View style={styles.empty}><Text style={styles.emptyText}>Sin registros en el período.</Text></View>
          }
          contentContainerStyle={styles.scrollPad}
          showsVerticalScrollIndicator={false}
          testID="finance-detail"
        />
      ) : null}
    </SafeAreaView>
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

function Pager({ page, totalPages, total, onPrev, onNext }: { page: number; totalPages: number; total: number; onPrev: () => void; onNext: () => void }) {
  if (totalPages <= 1) return <View style={{ height: 12 }} />;
  return (
    <View style={styles.pager}>
      <Pressable onPress={onPrev} disabled={page === 0} style={[styles.pagerBtn, page === 0 ? styles.pagerDisabled : null]}>
        <FontAwesome name="chevron-left" size={12} color={page === 0 ? t.textMuted : t.text} />
        <Text style={[styles.pagerText, page === 0 ? { color: t.textMuted } : null]}>Anterior</Text>
      </Pressable>
      <Text style={styles.pagerInfo}>Página {page + 1} de {totalPages} · {total} registros</Text>
      <Pressable onPress={onNext} disabled={page >= totalPages - 1} style={[styles.pagerBtn, page >= totalPages - 1 ? styles.pagerDisabled : null]}>
        <Text style={[styles.pagerText, page >= totalPages - 1 ? { color: t.textMuted } : null]}>Siguiente</Text>
        <FontAwesome name="chevron-right" size={12} color={page >= totalPages - 1 ? t.textMuted : t.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 12 },
  iconBtn: { width: 38, height: 38, borderRadius: 999, backgroundColor: t.card, borderWidth: 1, borderColor: t.cardBorder, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: t.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  title: { color: t.text, fontSize: 22, fontWeight: "800" },
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
  pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, gap: 8 },
  pagerBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, backgroundColor: t.card, borderWidth: 1, borderColor: t.cardBorder },
  pagerDisabled: { opacity: 0.5 },
  pagerText: { color: t.text, fontSize: 13, fontWeight: "700" },
  pagerInfo: { color: t.textMuted, fontSize: 11, flex: 1, textAlign: "center" },
  empty: { backgroundColor: t.card, borderRadius: t.radiusSm, borderWidth: 1, borderColor: t.cardBorder, padding: 24, alignItems: "center" },
  emptyText: { color: t.textMuted, fontSize: 14 },
  errorBox: { backgroundColor: t.card, borderRadius: t.radius, padding: 20, gap: 14, alignItems: "center" },
  errorText: { color: t.textMuted, fontSize: 14, textAlign: "center" },
  retry: { backgroundColor: t.accent, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10 },
  retryText: { color: t.navy, fontWeight: "800" },
});
