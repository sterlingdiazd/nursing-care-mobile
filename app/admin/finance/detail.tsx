import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { getFinanceDetail, type FinanceDetail } from "@/src/services/financeService";
import { financeTheme as t } from "@/components/finance/financeTheme";
import { DashboardSkeleton } from "@/components/finance/DashboardSkeleton";

export default function FinanceDetailScreen() {
  const params = useLocalSearchParams<{ metric?: string; from?: string; to?: string; title?: string }>();
  const metric = params.metric ?? "";
  const [data, setData] = useState<FinanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getFinanceDetail(metric, { from: params.from, to: params.to }));
    } catch (e: any) {
      setError(e?.message ?? "No se pudo cargar el detalle.");
    } finally {
      setLoading(false);
    }
  }, [metric, params.from, params.to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
          <FontAwesome name="chevron-left" size={16} color={t.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Detalle</Text>
          <Text style={styles.title} numberOfLines={1}>{data?.title ?? params.title ?? "Detalle"}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} testID="finance-detail">
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
          <DetailTable data={data} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailTable({ data }: { data: FinanceDetail }) {
  return (
    <View style={{ gap: 14 }}>
      {data.explanation ? <Text style={styles.explain}>{data.explanation}</Text> : null}
      {data.rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Sin registros en el período.</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.table}>
            <Row cells={data.columns} header />
            {data.rows.map((r, i) => (
              <Row key={i} cells={r.cells} emphasize={r.emphasize} />
            ))}
            {data.totalsRow ? <Row cells={data.totalsRow} totals /> : null}
          </View>
        </ScrollView>
      )}
      {data.footnote ? <Text style={styles.footnote}>{data.footnote}</Text> : null}
    </View>
  );
}

function Row({
  cells,
  header,
  totals,
  emphasize,
}: {
  cells: string[];
  header?: boolean;
  totals?: boolean;
  emphasize?: boolean;
}) {
  return (
    <View style={[styles.row, header ? styles.headerRow : null, totals ? styles.totalsRow : null]}>
      {cells.map((c, i) => (
        <Text
          key={i}
          numberOfLines={1}
          style={[
            i === 0 ? styles.cellFirst : styles.cell,
            header ? styles.cellHeader : null,
            totals ? styles.cellTotals : null,
            emphasize && !totals ? styles.cellEmph : null,
          ]}
        >
          {c}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 12 },
  backBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: t.card,
    borderWidth: 1, borderColor: t.cardBorder, alignItems: "center", justifyContent: "center",
  },
  eyebrow: { color: t.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  title: { color: t.text, fontSize: 22, fontWeight: "800" },
  scroll: { paddingHorizontal: 18, paddingBottom: 28 },
  explain: { color: t.textMuted, fontSize: 14, lineHeight: 21 },
  table: { backgroundColor: t.card, borderRadius: t.radiusSm, borderWidth: 1, borderColor: t.cardBorder, overflow: "hidden" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: t.cardBorder },
  headerRow: { backgroundColor: t.cardSoft },
  totalsRow: { backgroundColor: t.bgElevated, borderBottomWidth: 0 },
  cellFirst: { width: 150, paddingVertical: 11, paddingHorizontal: 12, color: t.text, fontSize: 13 },
  cell: { width: 110, paddingVertical: 11, paddingHorizontal: 12, color: t.text, fontSize: 13, textAlign: "right" },
  cellHeader: { color: t.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  cellTotals: { color: t.accent, fontWeight: "800" },
  cellEmph: { color: t.accent, fontWeight: "700" },
  footnote: { color: t.textMuted, fontSize: 12, lineHeight: 18 },
  empty: { backgroundColor: t.card, borderRadius: t.radiusSm, borderWidth: 1, borderColor: t.cardBorder, padding: 24, alignItems: "center" },
  emptyText: { color: t.textMuted, fontSize: 14 },
  errorBox: { backgroundColor: t.card, borderRadius: t.radius, padding: 20, gap: 14, alignItems: "center" },
  errorText: { color: t.textMuted, fontSize: 14, textAlign: "center" },
  retry: { backgroundColor: t.accent, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10 },
  retryText: { color: t.navy, fontWeight: "800" },
});
