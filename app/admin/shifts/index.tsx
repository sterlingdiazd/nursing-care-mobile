import { useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { hapticFeedback } from "@/src/utils/haptics";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { FilterSelect } from "@/src/components/shared/FilterSelect";
import { Banner } from "@/src/components/shared/Banner";
import { useAuth } from "@/src/context/AuthContext";
import { useServiceCalendar, type CalendarView } from "@/src/hooks/useServiceCalendar";
import { MonthGrid } from "@/src/components/calendar/MonthGrid";
import { WeekStrip } from "@/src/components/calendar/WeekStrip";
import { DayDetail } from "@/src/components/calendar/DayDetail";
import { CategoryLegend } from "@/src/components/calendar/CategoryLegend";
import { designTokens } from "@/src/design-system/tokens";

const VIEW_OPTIONS: ReadonlyArray<{ key: CalendarView; label: string }> = [
  { key: "month", label: "Mes" },
  { key: "week", label: "Semana" },
];

export default function AdminServiceCalendarScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const isEnabled = isReady && isAuthenticated && !requiresProfileCompletion && roles.includes("ADMIN");

  const cal = useServiceCalendar(isEnabled);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) router.replace("/login");
    else if (requiresProfileCompletion) router.replace("/register");
    else if (!roles.includes("ADMIN")) router.replace("/");
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  if (!isEnabled) return null;

  const dayAssignments = cal.assignmentsByDate[cal.selectedDay] ?? [];

  return (
    <MobileWorkspaceShell
      eyebrow="Servicios"
      title="Calendario de Servicios"
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      primaryReturnLabel="Volver"
      testID="admin-calendar-screen"
      nativeID="admin-calendar-screen"
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.navRow}>
          <Pressable
            onPress={() => {
              hapticFeedback.selection();
              cal.goPrev();
            }}
            accessibilityRole="button"
            accessibilityLabel="Anterior"
            testID="admin-calendar-prev"
            style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
          >
            <Text style={styles.navGlyph}>‹</Text>
          </Pressable>

          <Text style={styles.monthLabel}>{cal.label}</Text>

          <Pressable
            onPress={() => {
              hapticFeedback.selection();
              cal.goNext();
            }}
            accessibilityRole="button"
            accessibilityLabel="Siguiente"
            testID="admin-calendar-next"
            style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
          >
            <Text style={styles.navGlyph}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              hapticFeedback.selection();
              cal.goToday();
            }}
            accessibilityRole="button"
            accessibilityLabel="Ir a hoy"
            testID="admin-calendar-today"
            style={({ pressed }) => [styles.todayBtn, pressed && styles.pressed]}
          >
            <Text style={styles.todayText}>Hoy</Text>
          </Pressable>
        </View>

        <FilterSelect label="Vista" options={VIEW_OPTIONS} value={cal.view} onChange={cal.setView} testIDPrefix="admin-calendar-view" />

        <Banner tone="error" message={cal.error} />

        {cal.isLoading && Object.keys(cal.assignmentsByDate).length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color={designTokens.color.ink.accent} accessibilityLabel="Cargando..." />
          </View>
        ) : null}

        {cal.view === "month" ? (
          <MonthGrid days={cal.gridDays} selectedDay={cal.selectedDay} onSelectDay={cal.setSelectedDay} />
        ) : (
          <WeekStrip days={cal.weekDays} selectedDay={cal.selectedDay} onSelectDay={cal.setSelectedDay} />
        )}

        <CategoryLegend />

        <DayDetail
          dateIso={cal.selectedDay}
          assignments={dayAssignments}
          roster={cal.roster}
          onOpenRequest={(id) => {
            hapticFeedback.selection();
            router.push(`/admin/care-requests/${id}` as never);
          }}
        />
      </ScrollView>
    </MobileWorkspaceShell>
  );
}

const T = designTokens;
const styles = StyleSheet.create({
  content: { gap: designTokens.spacing.md, paddingBottom: designTokens.spacing.xxxl },
  navRow: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.sm },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: designTokens.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.color.surface.secondary,
    borderWidth: 1,
    borderColor: T.color.border.subtle,
  },
  navGlyph: { color: T.color.ink.primary, fontSize: designTokens.typography.title.fontSize, lineHeight: 22, fontWeight: "800" },
  monthLabel: { flex: 1, textAlign: "center", color: T.color.ink.primary, fontSize: designTokens.typography.section.fontSize, fontWeight: "800" },
  todayBtn: {
    paddingHorizontal: designTokens.spacing.lg,
    height: 36,
    borderRadius: designTokens.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.color.surface.accent,
    borderWidth: 1,
    borderColor: T.color.border.accent,
  },
  todayText: { color: T.color.ink.accentStrong, fontSize: designTokens.typography.label.fontSize, fontWeight: "800" },
  pressed: { opacity: 0.8 },
  loading: { paddingVertical: designTokens.spacing.xxxl, alignItems: "center" },
});
