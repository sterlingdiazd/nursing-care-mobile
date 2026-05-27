import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getFinanceOverview, type FinanceOverview, type HealthIndicator } from "@/src/services/financeService";
import { financeTheme as t, fmtMoney, fmtMoneyCompact, statusColor } from "@/components/finance/financeTheme";
import { SegmentedTabs } from "@/components/finance/SegmentedTabs";
import { GananciaHero, HealthRow, FocusCard } from "@/components/finance/SummaryWidgets";
import { RevenueDonut, SectionCard, TopClientsBars, TrendArea } from "@/components/finance/FinanceCharts";
import { DashboardSkeleton } from "@/components/finance/DashboardSkeleton";
import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { router } from "expo-router";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { hapticFeedback } from "@/src/utils/haptics";

const TABS = [
  { key: "resumen", label: "Resumen" },
  { key: "ingresos", label: "Ingresos" },
  { key: "equipo", label: "Equipo" },
  { key: "tendencia", label: "Tendencia" },
];

const pct = (v: number) => `${(v ?? 0).toFixed(1)}%`;

function statusIcon(status: string) {
  return status === "green" ? "check-circle" : status === "amber" ? "exclamation-circle" : "times-circle";
}

export default function AdminFinanceDashboard() {
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("resumen");

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

  const refreshAccessory = (
    <Pressable
      onPress={() => {
        hapticFeedback.light();
        void load();
      }}
      style={styles.iconBtn}
      accessibilityRole="button"
      accessibilityLabel="Actualizar"
      testID="finance-dashboard-refresh-btn"
      nativeID="finance-dashboard-refresh-btn"
    >
      <Text style={styles.refreshGlyph}>↻</Text>
    </Pressable>
  );

  return (
    <MobileWorkspaceShell
      eyebrow="Finanzas"
      title="Panel del negocio"
      headerAccessory={refreshAccessory}
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      primaryReturnLabel="Volver"
      testID="finance-dashboard-screen"
      nativeID="finance-dashboard-screen"
      disableScroll={false}
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
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : data ? (
        <>
          <SegmentedTabs tabs={TABS} active={tab} onChange={setTab} />
          <View style={styles.segment}>
            {tab === "resumen" ? <Resumen data={data} /> : null}
            {tab === "ingresos" ? <Ingresos data={data} /> : null}
            {tab === "equipo" ? <Equipo data={data} /> : null}
            {tab === "tendencia" ? <Tendencia data={data} /> : null}
          </View>
        </>
      ) : null}
    </MobileWorkspaceShell>
  );
}

function goDetail(data: FinanceOverview, metric: string, title: string) {
  hapticFeedback.selection();
  router.push({ pathname: "/admin/finance/detail", params: { metric, from: data.from, to: data.to, title } } as never);
}

/** The single highest-priority action: worst health indicator, else pending collections, else healthy. */
function pickFocus(data: FinanceOverview): { title: string; detail: string; value: string; color: string; metric: string; metricTitle: string } {
  const detailFor = (h: HealthIndicator) =>
    h.key === "loans" ? { metric: "loans", title: "Préstamos a enfermeras" }
      : h.key === "collection" ? { metric: "pending", title: "Pendiente de cobro" }
      : { metric: "services", title: "Servicios del período" };
  const worst = data.health.find((h) => h.status === "red") ?? data.health.find((h) => h.status === "amber");
  if (worst) {
    const d = detailFor(worst);
    return { title: worst.title, detail: worst.explanation, value: worst.valueLabel, color: statusColor(worst.status), metric: d.metric, metricTitle: d.title };
  }
  if (data.summary.pending > 0) {
    return { title: "Cobros por confirmar", detail: "Confirma los pagos recibidos para reflejarlos como ingreso.", value: fmtMoney(data.summary.pending), color: t.amber, metric: "pending", metricTitle: "Pendiente de cobro" };
  }
  return { title: "Negocio saludable", detail: "Todos los indicadores están en meta este período.", value: "✓", color: t.green, metric: "services", metricTitle: "Servicios del período" };
}

function Resumen({ data }: { data: FinanceOverview }) {
  const s = data.summary;
  const band = s.marginPercent >= 40 ? "green" : s.marginPercent >= 30 ? "amber" : "red";
  const focus = pickFocus(data);
  const healthItems = ["margin", "labor", "collection"]
    .map((k) => data.health.find((h) => h.key === k))
    .filter((h): h is HealthIndicator => !!h)
    .map((h) => ({
      percent: Math.min(100, Math.max(0, h.value)),
      color: statusColor(h.status),
      valueLabel: `${Math.round(h.value)}%`,
      label: h.key === "margin" ? "Margen" : h.key === "labor" ? "Nómina" : "Cobranza",
      onPress: () =>
        h.key === "collection"
          ? goDetail(data, "pending", "Pendiente de cobro")
          : goDetail(data, "services", "Servicios del período"),
    }));

  return (
    <View style={{ gap: 12 }}>
      <GananciaHero
        ganancia={fmtMoney(s.grossMargin.value)}
        marginPercent={s.marginPercent}
        statusColor={statusColor(band)}
        statusIcon={statusIcon(band)}
        ingresos={fmtMoney(s.revenue.value)}
        cobrado={fmtMoney(s.collected.value)}
        marginTrend={data.monthlyTrend.map((p) => p.margin)}
      />
      {healthItems.length > 0 ? <HealthRow items={healthItems} /> : null}
      <FocusCard
        title={focus.title}
        detail={focus.detail}
        value={focus.value}
        color={focus.color}
        onPress={() => goDetail(data, focus.metric, focus.metricTitle)}
      />
    </View>
  );
}

function Ingresos({ data }: { data: FinanceOverview }) {
  const best = [...data.byServiceLine].sort((a, b) => b.marginPercent - a.marginPercent)[0];
  return (
    <View style={{ gap: 12 }}>
      <SectionCard
        title="Ingresos por categoría"
        subtitle={best ? `${best.serviceLine} es tu línea más rentable (${pct(best.marginPercent)})` : "Dónde se generan tus ingresos"}
        onPress={() => goDetail(data, "category", "Por categoría")}
        icon="money"
        hue="green"
      >
        <RevenueDonut data={data.byCategory} />
      </SectionCard>
      {data.topClients.length > 0 ? (
        <SectionCard title="Top clientes" subtitle="Quién aporta más facturación" onPress={() => goDetail(data, "clients", "Por cliente")} icon="users" hue="teal">
          <TopClientsBars data={data.topClients} />
        </SectionCard>
      ) : null}
    </View>
  );
}

function BarList({ items }: { items: { name: string; valueLabel: string; sub?: string; fraction: number }[] }) {
  return (
    <View style={{ gap: 12 }}>
      {items.map((it, i) => (
        <View key={`${it.name}-${i}`} style={{ gap: 5 }}>
          <View style={styles.barHeader}>
            <Text style={styles.barName} numberOfLines={1}>{it.name}</Text>
            <Text style={styles.barValue}>{it.valueLabel}</Text>
          </View>
          {it.sub ? <Text style={styles.barSub}>{it.sub}</Text> : null}
          <View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.max(3, it.fraction * 100)}%` }]} /></View>
        </View>
      ))}
    </View>
  );
}

function Equipo({ data }: { data: FinanceOverview }) {
  const nurses = data.nurseParticipation.slice(0, 5);
  const maxRev = Math.max(...nurses.map((n) => n.revenueGenerated), 1);
  const loans = data.loans.slice(0, 5);
  const maxLoan = Math.max(...loans.map((l) => l.outstandingBalance), 1);
  return (
    <View style={{ gap: 12 }}>
      <SectionCard title="Participación por enfermera" subtitle="Quién genera más ingreso" onPress={() => goDetail(data, "nurses", "Participación por enfermera")} icon="user-md" hue="orange">
        <BarList items={nurses.map((n) => ({ name: n.nurseName, valueLabel: fmtMoneyCompact(n.revenueGenerated), sub: `${n.servicesCount} serv · pago ${fmtMoneyCompact(n.netPay)}`, fraction: n.revenueGenerated / maxRev }))} />
      </SectionCard>
      {loans.length > 0 ? (
        <SectionCard title="Préstamos a enfermeras" subtitle={`Exposición total: ${fmtMoney(data.totalLoansOutstanding)}`} onPress={() => goDetail(data, "loans", "Préstamos a enfermeras")} icon="credit-card" hue="red">
          <BarList items={loans.map((l) => ({ name: l.nurseName, valueLabel: fmtMoney(l.outstandingBalance), fraction: l.outstandingBalance / maxLoan }))} />
        </SectionCard>
      ) : null}
    </View>
  );
}

function Tendencia({ data }: { data: FinanceOverview }) {
  const s = data.summary;
  const delta = (dp: number | null) => (dp == null ? "—" : `${dp > 0 ? "+" : dp < 0 ? "−" : ""}${Math.abs(dp).toFixed(1)}%`);
  const dColor = (dp: number | null) => (dp == null ? t.textMuted : dp >= 0 ? t.green : t.red);
  return (
    <View style={{ gap: 12 }}>
      <SectionCard title="Tendencia (6 meses)" subtitle="Ingresos y margen en el tiempo" icon="line-chart" hue="blue">
        <TrendArea data={data.monthlyTrend} />
      </SectionCard>
      <View style={styles.deltaRow}>
        <DeltaChip label="Ingresos" value={delta(s.revenue.deltaPercent)} color={dColor(s.revenue.deltaPercent)} />
        <DeltaChip label="Margen" value={delta(s.grossMargin.deltaPercent)} color={dColor(s.grossMargin.deltaPercent)} />
        <DeltaChip label="Cobrado" value={delta(s.collected.deltaPercent)} color={dColor(s.collected.deltaPercent)} />
      </View>
    </View>
  );
}

function DeltaChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.deltaChip}>
      <Text style={styles.deltaLabel}>{label}</Text>
      <Text style={[styles.deltaValue, { color }]}>{value}</Text>
      <Text style={styles.deltaSub}>vs período anterior</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Refresh button: light secondary surface, subtle border
  iconBtn: { width: 38, height: 38, borderRadius: 999, backgroundColor: t.bgElevated, borderWidth: 1, borderColor: t.cardBorder, alignItems: "center", justifyContent: "center" },
  refreshGlyph: { color: t.text, fontSize: 18, fontWeight: "800" },
  segment: { flex: 1 },
  barHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  barName: { color: t.text, fontSize: 13, fontWeight: "700", flex: 1 },
  barValue: { color: t.textMuted, fontSize: 12.5, fontWeight: "700" },
  barSub: { color: t.textMuted, fontSize: 11 },
  // Bar track: light neutral surface
  barTrack: { height: 8, borderRadius: 999, backgroundColor: t.cardSoft, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 999, backgroundColor: t.accent },
  deltaRow: { flexDirection: "row", gap: 10 },
  // Delta chips: white card with subtle border
  deltaChip: { flex: 1, backgroundColor: t.card, borderRadius: t.radiusSm, borderWidth: 1, borderColor: t.cardBorder, padding: 12, gap: 3 },
  deltaLabel: { color: t.textMuted, fontSize: 10.5, fontWeight: "700", textTransform: "uppercase" },
  deltaValue: { fontSize: 17, fontWeight: "800" },
  deltaSub: { color: t.textMuted, fontSize: 9.5 },
  // Error box: white card
  errorBox: { backgroundColor: t.card, borderRadius: t.radius, borderWidth: 1, borderColor: t.cardBorder, padding: 20, gap: 14, alignItems: "center" },
  errorText: { color: t.textMuted, fontSize: 14, textAlign: "center" },
  retry: { backgroundColor: t.accent, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10 },
  retryText: { color: "#ffffff", fontWeight: "800" },
});
