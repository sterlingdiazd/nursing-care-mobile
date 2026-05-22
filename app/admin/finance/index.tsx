import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { getFinanceOverview, type FinanceOverview } from "@/src/services/financeService";
import { financeTheme as t, fmtMoney } from "@/components/finance/financeTheme";
import { HeroMetric } from "@/components/finance/HeroMetric";
import { KpiCard } from "@/components/finance/KpiCard";
import { HealthCard, InsightCard } from "@/components/finance/InsightCard";
import { RevenueDonut, SectionCard, TopClientsBars, TrendArea } from "@/components/finance/FinanceCharts";
import { DashboardSkeleton } from "@/components/finance/DashboardSkeleton";
import { DrilldownSheet, type DrilldownContent } from "@/components/finance/DrilldownSheet";

const pct = (v: number) => `${(v ?? 0).toFixed(1)}%`;

export default function AdminFinanceDashboard() {
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<DrilldownContent | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getFinanceOverview());
    } catch (e: any) {
      setError(e?.message ?? "No se pudo cargar el panel financiero.");
    } finally {
      setLoading(false);
    }
  }, []);

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
          <Text style={styles.eyebrow}>Finanzas</Text>
          <Text style={styles.title}>Panel del negocio</Text>
        </View>
        <Pressable onPress={() => void load()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Actualizar">
          <FontAwesome name="refresh" size={15} color={t.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} testID="admin-finance-dashboard">
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
          <Dashboard data={data} open={setSheet} />
        ) : null}
      </ScrollView>

      <DrilldownSheet visible={sheet != null} content={sheet} onClose={() => setSheet(null)} />
    </SafeAreaView>
  );
}

function Dashboard({ data, open }: { data: FinanceOverview; open: (c: DrilldownContent) => void }) {
  const s = data.summary;
  const marginColor = s.marginPercent >= 40 ? t.green : s.marginPercent >= 30 ? t.amber : t.red;

  return (
    <View style={{ gap: 14 }}>
      <HeroMetric
        label="Ingresos del período"
        value={s.revenue.value}
        deltaPercent={s.revenue.deltaPercent}
        collected={s.collected.value}
        trend={data.monthlyTrend}
      />

      <View style={styles.kpiRow}>
        <KpiCard
          label="Cobrado"
          value={fmtMoney(s.collected.value)}
          deltaPercent={s.collected.deltaPercent}
          onPress={() =>
            open({
              title: "Cobrado",
              explanation: "Dinero que ya entró (pagos confirmados por ti). Crece a medida que confirmas comprobantes.",
              rows: [
                { label: "Cobrado en el período", value: fmtMoney(s.collected.value), emphasize: true },
                { label: "Período anterior", value: fmtMoney(s.collected.previousValue) },
                { label: "Pendiente de cobro", value: fmtMoney(s.pending) },
              ],
            })
          }
        />
        <KpiCard
          label="Pendiente"
          value={fmtMoney(s.pending)}
          valueColor={s.pending > 0 ? t.amber : t.text}
          onPress={() =>
            open({
              title: "Pendiente de cobro",
              explanation: "Servicios facturados que aún no se han confirmado como pagados.",
              rows: data.topClients
                .filter((c) => c.pending > 0)
                .map((c) => ({ label: c.clientName, value: fmtMoney(c.pending) })),
            })
          }
        />
        <KpiCard
          label="Margen"
          value={pct(s.marginPercent)}
          valueColor={marginColor}
          footnote={fmtMoney(s.grossMargin.value)}
          onPress={() =>
            open({
              title: "Margen bruto",
              explanation: "Lo que queda después de pagar a las enfermeras (ingresos − nómina). Meta 40%+.",
              rows: [
                { label: "Ingresos", value: fmtMoney(s.revenue.value) },
                { label: "Costo de nómina", value: fmtMoney(s.laborCost.value) },
                { label: "Margen", value: fmtMoney(s.grossMargin.value), emphasize: true },
                { label: "Margen %", value: pct(s.marginPercent), emphasize: true },
              ],
              bullets: data.byCategory.map((c) => `${c.displayName}: ${pct(c.marginPercent)} de margen`),
            })
          }
        />
      </View>

      {data.health.length > 0 ? (
        <View style={{ gap: 10 }}>
          {data.health.map((h) => (
            <HealthCard
              key={h.key}
              item={h}
              onPress={() =>
                open({
                  title: h.title,
                  explanation: h.explanation,
                  rows: [
                    { label: "Actual", value: h.valueLabel, emphasize: true },
                    { label: "Meta", value: h.key === "loans" ? "≤ 15% de nómina" : `${h.target}` },
                  ],
                  bullets: h.drivers,
                })
              }
            />
          ))}
        </View>
      ) : null}

      {data.insights.length > 0 ? (
        <View style={{ gap: 10 }}>
          {data.insights.map((i) => (
            <InsightCard
              key={i.key}
              item={i}
              onPress={() => open({ title: i.title, explanation: i.detail })}
            />
          ))}
        </View>
      ) : null}

      {data.byCategory.length > 0 ? (
        <SectionCard title="Ingresos por categoría" subtitle="Dónde se generan tus ingresos">
          <RevenueDonut data={data.byCategory} />
        </SectionCard>
      ) : null}

      {data.byServiceLine.length > 1 ? (
        <SectionCard title="Domicilio vs Casa hogar" subtitle="Cuál línea deja más margen">
          <View style={{ gap: 12 }}>
            {data.byServiceLine.map((l) => (
              <Pressable
                key={l.serviceLine}
                onPress={() =>
                  open({
                    title: l.serviceLine,
                    rows: [
                      { label: "Ingresos", value: fmtMoney(l.revenue) },
                      { label: "Nómina", value: fmtMoney(l.labor) },
                      { label: "Margen", value: fmtMoney(l.margin), emphasize: true },
                      { label: "Margen %", value: pct(l.marginPercent), emphasize: true },
                    ],
                  })
                }
                style={({ pressed }) => [styles.lineRow, pressed ? { opacity: 0.85 } : null]}
              >
                <Text style={styles.lineName}>{l.serviceLine}</Text>
                <Text style={styles.lineRev}>{fmtMoney(l.revenue)}</Text>
                <Text style={[styles.linePct, { color: l.marginPercent >= 40 ? t.green : t.amber }]}>{pct(l.marginPercent)}</Text>
              </Pressable>
            ))}
          </View>
        </SectionCard>
      ) : null}

      {data.topClients.length > 0 ? (
        <SectionCard title="Top clientes" subtitle="Quién aporta más facturación">
          <TopClientsBars data={data.topClients} />
        </SectionCard>
      ) : null}

      {data.monthlyTrend.length > 1 ? (
        <SectionCard title="Tendencia (6 meses)" subtitle="Ingresos y margen en el tiempo">
          <TrendArea data={data.monthlyTrend} />
        </SectionCard>
      ) : null}

      {data.nurseParticipation.length > 0 ? (
        <SectionCard title="Participación por enfermera" subtitle="Quién genera más y cuánto se le paga">
          <View style={{ gap: 10 }}>
            {data.nurseParticipation.slice(0, 8).map((n, i) => (
              <Pressable
                key={`${n.nurseName}-${i}`}
                onPress={() =>
                  open({
                    title: n.nurseName,
                    rows: [
                      { label: "Servicios", value: `${n.servicesCount}` },
                      { label: "Días trabajados", value: `${n.daysWorked}` },
                      { label: "Ingreso generado", value: fmtMoney(n.revenueGenerated) },
                      { label: "Pago neto", value: fmtMoney(n.netPay) },
                      { label: "Participación", value: pct(n.participationPercent), emphasize: true },
                      { label: "Margen aportado", value: fmtMoney(n.marginContributed), emphasize: true },
                      { label: "Préstamo pendiente", value: fmtMoney(n.loanOutstanding) },
                    ],
                  })
                }
                style={({ pressed }) => [styles.nurseRow, pressed ? { opacity: 0.85 } : null]}
              >
                <Text style={styles.nurseName} numberOfLines={1}>{n.nurseName}</Text>
                <Text style={styles.nurseMeta}>{n.servicesCount} serv · {pct(n.participationPercent)}</Text>
                <Text style={styles.nursePay}>{fmtMoney(n.netPay)}</Text>
              </Pressable>
            ))}
          </View>
        </SectionCard>
      ) : null}

      {data.loans.length > 0 ? (
        <SectionCard title="Préstamos a enfermeras" subtitle={`Exposición total: ${fmtMoney(data.totalLoansOutstanding)}`}>
          <View style={{ gap: 10 }}>
            {data.loans.map((l, i) => (
              <View key={`${l.nurseName}-${i}`} style={styles.loanRow}>
                <Text style={styles.loanName} numberOfLines={1}>{l.nurseName}</Text>
                <Text style={styles.loanBal}>{fmtMoney(l.outstandingBalance)}</Text>
              </View>
            ))}
          </View>
        </SectionCard>
      ) : null}

      <View style={{ height: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { color: t.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  title: { color: t.text, fontSize: 22, fontWeight: "800" },
  scroll: { paddingHorizontal: 18, paddingBottom: 28 },
  errorBox: { backgroundColor: t.card, borderRadius: t.radius, padding: 20, gap: 14, alignItems: "center" },
  errorText: { color: t.textMuted, fontSize: 14, textAlign: "center" },
  retry: { backgroundColor: t.accent, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10 },
  retryText: { color: t.navy, fontWeight: "800" },
  kpiRow: { flexDirection: "row", gap: 10 },
  lineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  lineName: { color: t.text, fontSize: 14, fontWeight: "700", flex: 1 },
  lineRev: { color: t.textMuted, fontSize: 13 },
  linePct: { fontSize: 14, fontWeight: "800", width: 64, textAlign: "right" },
  nurseRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  nurseName: { color: t.text, fontSize: 14, fontWeight: "700", flex: 1 },
  nurseMeta: { color: t.textMuted, fontSize: 12 },
  nursePay: { color: t.text, fontSize: 13, fontWeight: "700", width: 92, textAlign: "right" },
  loanRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  loanName: { color: t.text, fontSize: 14, flex: 1 },
  loanBal: { color: t.amber, fontSize: 14, fontWeight: "800" },
});
