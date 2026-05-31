import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { designTokens } from "@/src/design-system/tokens";
import { withHapticFeedback } from "@/src/utils/haptics";

type IconName = ComponentProps<typeof FontAwesome>["name"];

/**
 * Shared scaffold for payroll form modals (Proposal B): a page-sheet with an X-close header,
 * grouped cards, and a sticky bottom action bar (ghost Cancelar + filled primary CTA). Reachable
 * actions at the bottom, generous padding, colour and clear visual hierarchy.
 */
export function FormModalScaffold({
  visible,
  onClose,
  eyebrow,
  title,
  error,
  children,
  overlays,
  onSubmit,
  submitLabel,
  submitDisabled,
  submitLoading,
  cancelLabel = "Cancelar",
  submitTestID,
  cancelTestID,
}: {
  visible: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  error?: string | null;
  children: ReactNode;
  overlays?: ReactNode;
  onSubmit: () => void;
  submitLabel: string;
  submitDisabled?: boolean;
  submitLoading?: boolean;
  cancelLabel?: string;
  submitTestID?: string;
  cancelTestID?: string;
}) {
  const handleClose = withHapticFeedback(onClose, "selection");
  const handleSubmit = withHapticFeedback(onSubmit, "light");

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={handleClose} style={styles.x} accessibilityRole="button" accessibilityLabel="Cerrar" testID={cancelTestID}>
            <FontAwesome name="times" size={16} color={designTokens.color.ink.secondary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View>
          ) : null}
          {children}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleClose} style={[styles.btn, styles.ghost]} accessibilityRole="button" accessibilityLabel={cancelLabel}>
            <Text style={styles.ghostText}>{cancelLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitDisabled || submitLoading}
            style={[styles.btn, styles.primary, (submitDisabled || submitLoading) ? styles.primaryDisabled : null]}
            accessibilityRole="button"
            accessibilityLabel={submitLabel}
            accessibilityState={{ busy: !!submitLoading, disabled: !!(submitDisabled || submitLoading) }}
            testID={submitTestID}
          >
            {submitLoading ? <ActivityIndicator color={designTokens.color.ink.inverse} /> : <Text style={styles.primaryText}>{submitLabel}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      {overlays}
    </Modal>
  );
}

export function FormCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function Field({ label, required, optional, hint, hintError, children }: { label: string; required?: boolean; optional?: boolean; hint?: string; hintError?: boolean; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.req}> *</Text> : null}
        {optional ? <Text style={styles.optional}> (opcional)</Text> : null}
      </Text>
      {children}
      {hint ? <Text style={[styles.hint, hintError ? styles.hintError : null]}>{hint}</Text> : null}
    </View>
  );
}

function IconBox({ icon }: { icon?: IconName }) {
  if (!icon) return null;
  return (
    <View style={styles.iconBox}>
      <FontAwesome name={icon} size={14} color={designTokens.color.ink.accent} />
    </View>
  );
}

export function SelectRow({ icon, value, subtitle, placeholder, onPress, loading, disabled, testID, accessibilityLabel }: { icon?: IconName; value?: string | null; subtitle?: string | null; placeholder: string; onPress: () => void; loading?: boolean; disabled?: boolean; testID?: string; accessibilityLabel?: string }) {
  return (
    <TouchableOpacity style={styles.row} onPress={withHapticFeedback(onPress, "selection")} disabled={disabled || loading} testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      <IconBox icon={icon} />
      <View style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator color={designTokens.color.ink.accent} />
        ) : value ? (
          <>
            <Text style={styles.rowValue}>{value}</Text>
            {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
          </>
        ) : (
          <Text style={styles.rowPlaceholder}>{placeholder}</Text>
        )}
      </View>
      <FontAwesome name="chevron-right" size={13} color={designTokens.color.ink.muted} />
    </TouchableOpacity>
  );
}

export function TextField({ icon, prefix, suffix, emphasize, ...input }: { icon?: IconName; prefix?: string; suffix?: string; emphasize?: boolean } & ComponentProps<typeof TextInput>) {
  return (
    <View style={[styles.row, input.multiline ? styles.rowMultiline : null]}>
      <IconBox icon={icon} />
      {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
      <TextInput
        style={[styles.input, emphasize ? styles.inputEmphasize : null]}
        placeholderTextColor={designTokens.color.ink.muted}
        {...input}
      />
      {suffix ? <Text style={styles.prefix}>{suffix}</Text> : null}
    </View>
  );
}

export function ChipGroup({ options, value, onChange, testIDPrefix, containerTestID }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; testIDPrefix?: string; containerTestID?: string }) {
  return (
    <View style={styles.chips} testID={containerTestID} nativeID={containerTestID}>
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, on ? styles.chipOn : null]}
            onPress={withHapticFeedback(() => onChange(opt.value), "selection")}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={opt.label}
            testID={testIDPrefix ? `${testIDPrefix}-${opt.value.toLowerCase()}` : undefined}
          >
            <Text style={[styles.chipText, on ? styles.chipTextOn : null]} numberOfLines={1}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function SummaryBanner({ label, value, tag }: { label: string; value: string; tag?: string }) {
  return (
    <View style={styles.summary}>
      <View style={{ flex: 1 }}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      </View>
      {tag ? <View style={styles.summaryTag}><Text style={styles.summaryTagText}>{tag}</Text></View> : null}
    </View>
  );
}

export function PickerSheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const handleClose = withHapticFeedback(onClose, "selection");

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} accessibilityLabel="Cerrar selector" />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={handleClose} accessibilityRole="button" accessibilityLabel="Cerrar selector">
            <Text style={styles.sheetClose}>Cerrar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </Modal>
  );
}

export function PickerSearchInput(props: ComponentProps<typeof TextInput>) {
  return <TextInput style={styles.searchInput} placeholderTextColor={designTokens.color.ink.muted} {...props} />;
}

export function PickerOption({ title, subtitle, selected, badge, onPress, testID, accessibilityLabel }: { title: string; subtitle?: string | null; selected?: boolean; badge?: { label: string; tone: "open" | "closed" } | null; onPress: () => void; testID?: string; accessibilityLabel?: string }) {
  return (
    <TouchableOpacity style={styles.optionRow} onPress={withHapticFeedback(onPress, "selection")} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ selected: !!selected }} testID={testID}>
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.optionSubtitle}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={[styles.badge, badge.tone === "open" ? styles.badgeOpen : styles.badgeClosed]}>
          <Text style={[styles.badgeText, badge.tone === "open" ? styles.badgeTextOpen : styles.badgeTextClosed]}>{badge.label}</Text>
        </View>
      ) : null}
      {selected ? <Text style={styles.optionCheck}>✓</Text> : null}
    </TouchableOpacity>
  );
}

export function PickerEmpty({ text }: { text: string }) {
  return <Text style={styles.sheetEmpty}>{text}</Text>;
}

const T = designTokens;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.color.surface.canvas },
  nav: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.md, paddingHorizontal: designTokens.spacing.xl, paddingVertical: designTokens.spacing.lg, backgroundColor: T.color.surface.primary, borderBottomWidth: 1, borderBottomColor: T.color.border.subtle },
  x: { width: 36, height: 36, borderRadius: designTokens.radius.pill, backgroundColor: T.color.surface.secondary, borderWidth: 1, borderColor: T.color.border.subtle, alignItems: "center", justifyContent: "center" },
  eyebrow: { fontSize: designTokens.typography.caption.fontSize, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: T.color.ink.accent },
  title: { fontSize: designTokens.typography.section.fontSize, fontWeight: "800", color: T.color.ink.primary },
  scroll: { padding: designTokens.spacing.lg },
  errorCard: { backgroundColor: T.color.surface.danger, borderWidth: 1, borderColor: T.color.border.danger, padding: designTokens.spacing.md, borderRadius: T.radius.md, marginBottom: designTokens.spacing.lg },
  errorText: { color: T.color.status.dangerText, fontSize: designTokens.typography.body.fontSize },
  card: { backgroundColor: T.color.surface.primary, borderWidth: 1, borderColor: T.color.border.subtle, borderRadius: designTokens.radius.lg, padding: designTokens.spacing.lg, marginBottom: designTokens.spacing.lg, boxShadow: "0px 6px 16px rgba(18, 48, 68, 0.05)", elevation: 2 },
  cardTitle: { fontSize: designTokens.typography.caption.fontSize, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, color: T.color.ink.muted, marginBottom: designTokens.spacing.lg },
  field: { marginBottom: designTokens.spacing.lg },
  label: { fontSize: designTokens.typography.label.fontSize, fontWeight: "700", color: T.color.ink.primary, marginBottom: designTokens.spacing.sm },
  req: { color: T.color.ink.accent },
  optional: { color: T.color.ink.muted, fontWeight: "600" },
  hint: { fontSize: designTokens.typography.caption.fontSize, color: T.color.ink.muted, marginTop: designTokens.spacing.sm },
  hintError: { color: T.color.status.dangerText },
  row: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.md, backgroundColor: T.color.surface.secondary, borderWidth: 1.5, borderColor: T.color.border.subtle, borderRadius: designTokens.radius.md, paddingHorizontal: designTokens.spacing.lg, minHeight: 52 },
  rowMultiline: { alignItems: "flex-start", paddingVertical: designTokens.spacing.xs },
  iconBox: { width: 30, height: 30, borderRadius: designTokens.radius.sm, backgroundColor: T.color.surface.accent, alignItems: "center", justifyContent: "center" },
  rowValue: { fontSize: designTokens.typography.body.fontSize, fontWeight: "700", color: T.color.ink.primary },
  rowSubtitle: { fontSize: designTokens.typography.caption.fontSize, color: T.color.ink.muted, marginTop: designTokens.spacing.xs },
  rowPlaceholder: { fontSize: designTokens.typography.body.fontSize, color: T.color.ink.muted },
  prefix: { fontSize: designTokens.typography.body.fontSize, fontWeight: "800", color: T.color.ink.muted },
  input: { flex: 1, paddingVertical: designTokens.spacing.lg, fontSize: designTokens.typography.body.fontSize, color: T.color.ink.primary },
  inputEmphasize: { fontSize: designTokens.typography.section.fontSize, fontWeight: "800" },
  chips: { flexDirection: "row", gap: designTokens.spacing.sm, flexWrap: "wrap" },
  chip: { flex: 1, minWidth: 70, borderWidth: 1.5, borderColor: T.color.border.subtle, backgroundColor: T.color.surface.primary, borderRadius: designTokens.radius.md, paddingVertical: designTokens.spacing.md, paddingHorizontal: designTokens.spacing.sm, alignItems: "center" },
  chipOn: { backgroundColor: T.color.ink.accentStrong, borderColor: T.color.ink.accentStrong },
  chipText: { fontSize: designTokens.typography.label.fontSize, fontWeight: "700", color: T.color.ink.secondary },
  chipTextOn: { color: T.color.ink.inverse },
  summary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.md, backgroundColor: T.color.ink.accentStrong, borderRadius: designTokens.radius.lg, padding: designTokens.spacing.xl, boxShadow: "0px 10px 24px rgba(29, 93, 128, 0.3)", elevation: 4 },
  summaryLabel: { color: "rgba(255,255,255,0.85)", fontSize: designTokens.typography.caption.fontSize, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryValue: { color: designTokens.color.ink.inverse, fontSize: designTokens.typography.display.fontSize, fontWeight: "800", marginTop: designTokens.spacing.xs },
  summaryTag: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: designTokens.radius.pill, paddingHorizontal: designTokens.spacing.md, paddingVertical: designTokens.spacing.sm },
  summaryTagText: { color: designTokens.color.ink.inverse, fontSize: designTokens.typography.caption.fontSize, fontWeight: "800" },
  footer: { flexDirection: "row", gap: designTokens.spacing.md, padding: designTokens.spacing.lg, backgroundColor: T.color.surface.primary, borderTopWidth: 1, borderTopColor: T.color.border.subtle, boxShadow: "0px -6px 18px rgba(18, 48, 68, 0.06)", elevation: 8 },
  btn: { borderRadius: designTokens.radius.md, paddingVertical: designTokens.spacing.lg, alignItems: "center", justifyContent: "center" },
  ghost: { flex: 0, flexBasis: "33%", backgroundColor: T.color.surface.secondary, borderWidth: 1, borderColor: T.color.border.subtle },
  ghostText: { color: T.color.ink.secondary, fontSize: designTokens.typography.body.fontSize, fontWeight: "800" },
  primary: { flex: 1, backgroundColor: T.color.ink.accent, boxShadow: "0px 8px 20px rgba(46, 125, 163, 0.35)", elevation: 4 },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { color: designTokens.color.ink.inverse, fontSize: designTokens.typography.body.fontSize, fontWeight: "800" },
  backdrop: { flex: 1, backgroundColor: "rgba(18, 48, 68, 0.4)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "75%", backgroundColor: T.color.surface.primary, borderTopLeftRadius: designTokens.radius.xxl, borderTopRightRadius: designTokens.radius.xxl, paddingBottom: T.spacing.xxl },
  grab: { width: 40, height: 5, borderRadius: designTokens.radius.pill, backgroundColor: T.color.border.strong, alignSelf: "center", marginTop: designTokens.spacing.md, marginBottom: designTokens.spacing.xs },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: T.spacing.lg, paddingVertical: T.spacing.md, borderBottomWidth: 1, borderBottomColor: T.color.border.subtle },
  sheetTitle: { fontSize: designTokens.typography.body.fontSize, fontWeight: "800", color: T.color.ink.primary },
  sheetClose: { fontSize: designTokens.typography.body.fontSize, color: T.color.ink.accentStrong, fontWeight: "700" },
  sheetScroll: { paddingHorizontal: T.spacing.lg },
  searchInput: { borderWidth: 1, borderColor: T.color.border.subtle, borderRadius: T.radius.md, paddingHorizontal: T.spacing.lg, paddingVertical: designTokens.spacing.md, fontSize: designTokens.typography.body.fontSize, color: T.color.ink.primary, backgroundColor: T.color.surface.secondary, marginTop: T.spacing.md, marginBottom: T.spacing.sm },
  optionRow: { flexDirection: "row", alignItems: "center", paddingVertical: T.spacing.md, borderBottomWidth: 1, borderBottomColor: T.color.border.subtle, gap: T.spacing.sm },
  optionTitle: { fontSize: designTokens.typography.body.fontSize, color: T.color.ink.primary, fontWeight: "600" },
  optionSubtitle: { fontSize: designTokens.typography.caption.fontSize, color: T.color.ink.muted, marginTop: designTokens.spacing.xs },
  optionCheck: { fontSize: designTokens.typography.section.fontSize, fontWeight: "700", color: T.color.ink.accent },
  badge: { paddingHorizontal: designTokens.spacing.sm, paddingVertical: designTokens.spacing.xs, borderRadius: designTokens.radius.sm },
  badgeOpen: { backgroundColor: T.color.surface.success },
  badgeClosed: { backgroundColor: T.color.surface.secondary },
  badgeText: { fontSize: designTokens.typography.caption.fontSize, fontWeight: "700" },
  badgeTextOpen: { color: T.color.status.successText },
  badgeTextClosed: { color: T.color.ink.muted },
  sheetEmpty: { fontSize: designTokens.typography.body.fontSize, color: T.color.ink.muted, paddingVertical: T.spacing.xl, textAlign: "center" },
});

export const formModalStyles = styles;
