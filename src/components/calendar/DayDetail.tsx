import { Pressable, StyleSheet, Text, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { CATEGORY_META, type CalendarAssignment } from "./serviceCategory";
import type { CalendarNurse } from "@/src/hooks/useServiceCalendar";
import type { AdminCareRequestStatus } from "@/src/services/adminPortalService";
import { withHapticFeedback } from "@/src/utils/haptics";

function statusLabel(s: AdminCareRequestStatus): string {
  switch (s) {
    case "Approved": return "Aprobada";
    case "Rejected": return "Rechazada";
    case "Completed": return "Completada";
    case "Cancelled": return "Cancelada";
    case "Invoiced": return "Facturada";
    case "Paid": return "Pagada";
    case "PaymentReported": return "Pago reportado";
    case "Voided": return "Anulada";
    default: return "Pendiente";
  }
}
function statusTone(s: AdminCareRequestStatus): "success" | "danger" | "warning" | "neutral" {
  switch (s) {
    case "Approved": return "success";
    case "Rejected":
    case "Voided":
    case "Cancelled": return "danger";
    case "Completed":
    case "Invoiced":
    case "Paid":
    case "PaymentReported": return "neutral";
    default: return "warning";
  }
}
const money = (n: number) => new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(n);
const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${d} de ${months[m - 1]} ${y}`;
};

function AssignmentRow({ a, onOpen }: { a: CalendarAssignment; onOpen: () => void }) {
  return (
    <Pressable
      onPress={withHapticFeedback(onOpen, "selection")}
      accessibilityRole="button"
      accessibilityLabel={`Servicio de ${a.clientName}`}
      testID={`calendar-assignment-${a.id}`}
      style={({ pressed }) => [styles.row, { borderLeftColor: CATEGORY_META[a.category].color }, pressed && styles.pressed]}
    >
      <View style={styles.rowBody}>
        <Text style={styles.client} numberOfLines={1}>{a.clientName}</Text>
        <Text style={styles.meta} numberOfLines={1}>{CATEGORY_META[a.category].label} · {money(a.total)}</Text>
      </View>
      <StatusBadge label={statusLabel(a.status)} tone={statusTone(a.status)} />
    </Pressable>
  );
}

/** The selected day's services grouped by nurse + unassigned slots + free nurses. */
export function DayDetail({
  dateIso,
  assignments,
  roster,
  onOpenRequest,
}: {
  dateIso: string;
  assignments: CalendarAssignment[];
  roster: CalendarNurse[];
  onOpenRequest: (id: string) => void;
}) {
  const assigned = assignments.filter((a) => a.nurseUserId);
  const unassigned = assignments.filter((a) => !a.nurseUserId);

  // Group assigned by nurse.
  const byNurse = new Map<string, { name: string; items: CalendarAssignment[] }>();
  for (const a of assigned) {
    const key = a.nurseUserId as string;
    if (!byNurse.has(key)) byNurse.set(key, { name: a.nurseName ?? "Enfermera", items: [] });
    byNurse.get(key)!.items.push(a);
  }
  const busyIds = new Set(assigned.map((a) => a.nurseUserId));
  const freeNurses = roster.filter((n) => !busyIds.has(n.userId));

  return (
    <View style={styles.wrap}>
      <Text style={styles.dayTitle}>{longDate(dateIso)}</Text>

      {assignments.length === 0 ? (
        <Text style={styles.empty}>No hay servicios programados este día.</Text>
      ) : null}

      {Array.from(byNurse.values()).map((group) => (
        <View key={group.name} style={styles.group}>
          <Text style={styles.groupTitle}>{group.name}</Text>
          {group.items.map((a) => (
            <AssignmentRow key={a.id} a={a} onOpen={() => onOpenRequest(a.id)} />
          ))}
        </View>
      ))}

      {unassigned.length > 0 ? (
        <View style={styles.group}>
          <Text style={[styles.groupTitle, styles.unassignedTitle]}>Sin asignar ({unassigned.length})</Text>
          {unassigned.map((a) => (
            <AssignmentRow key={a.id} a={a} onOpen={() => onOpenRequest(a.id)} />
          ))}
        </View>
      ) : null}

      <View style={styles.freeCard}>
        <Text style={styles.freeTitle}>Enfermeras libres ({freeNurses.length})</Text>
        {freeNurses.length === 0 ? (
          <Text style={styles.freeEmpty}>Todas las enfermeras tienen asignación este día.</Text>
        ) : (
          <View style={styles.freeChips}>
            {freeNurses.map((n) => (
              <View key={n.userId} style={styles.freeChip}>
                <Text style={styles.freeChipText}>{n.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const T = designTokens;
const styles = StyleSheet.create({
  wrap: { gap: designTokens.spacing.md, paddingTop: designTokens.spacing.xs },
  dayTitle: { color: T.color.ink.primary, fontSize: designTokens.typography.body.fontSize, fontWeight: "800" },
  empty: { color: T.color.ink.muted, fontSize: designTokens.typography.body.fontSize, paddingVertical: designTokens.spacing.sm },
  group: { gap: designTokens.spacing.sm },
  groupTitle: { color: T.color.ink.secondary, fontSize: designTokens.typography.caption.fontSize, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  unassignedTitle: { color: T.color.status.dangerText },
  row: {
    backgroundColor: T.color.surface.primary,
    borderRadius: T.radius.md,
    borderWidth: 1,
    borderColor: T.color.border.subtle,
    borderLeftWidth: 4,
    boxShadow: "0px 4px 10px rgba(18, 48, 68, 0.04)",
    elevation: 1,
    padding: designTokens.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.md,
  },
  pressed: { opacity: 0.85 },
  rowBody: { flex: 1, gap: designTokens.spacing.xs },
  client: { color: T.color.ink.primary, fontSize: designTokens.typography.body.fontSize, fontWeight: "700" },
  meta: { color: T.color.ink.muted, fontSize: designTokens.typography.label.fontSize },
  freeCard: {
    backgroundColor: T.color.surface.secondary,
    borderRadius: T.radius.md,
    borderWidth: 1,
    borderColor: T.color.border.subtle,
    padding: designTokens.spacing.md,
    gap: designTokens.spacing.sm,
  },
  freeTitle: { color: T.color.ink.secondary, fontSize: designTokens.typography.caption.fontSize, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  freeEmpty: { color: T.color.ink.muted, fontSize: designTokens.typography.label.fontSize },
  freeChips: { flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.sm },
  freeChip: {
    backgroundColor: T.color.surface.success,
    borderRadius: T.radius.pill,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
  },
  freeChipText: { color: T.color.status.successText, fontSize: designTokens.typography.label.fontSize, fontWeight: "700" },
});
