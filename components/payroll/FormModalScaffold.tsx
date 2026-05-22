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
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={onClose} style={styles.x} accessibilityRole="button" accessibilityLabel="Cerrar" testID={cancelTestID}>
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
          <TouchableOpacity onPress={onClose} style={[styles.btn, styles.ghost]} accessibilityRole="button" accessibilityLabel={cancelLabel}>
            <Text style={styles.ghostText}>{cancelLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onSubmit}
            disabled={submitDisabled || submitLoading}
            style={[styles.btn, styles.primary, (submitDisabled || submitLoading) ? styles.primaryDisabled : null]}
            accessibilityRole="button"
            accessibilityLabel={submitLabel}
            accessibilityState={{ busy: !!submitLoading, disabled: !!(submitDisabled || submitLoading) }}
            testID={submitTestID}
          >
            {submitLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{submitLabel}</Text>}
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
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={disabled || loading} testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
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
            onPress={() => onChange(opt.value)}
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
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar selector" />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar selector">
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
    <TouchableOpacity style={styles.optionRow} onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ selected: !!selected }} testID={testID}>
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
  nav: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: T.color.surface.primary, borderBottomWidth: 1, borderBottomColor: T.color.border.subtle },
  x: { width: 36, height: 36, borderRadius: 999, backgroundColor: T.color.surface.secondary, borderWidth: 1, borderColor: T.color.border.subtle, alignItems: "center", justifyContent: "center" },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: T.color.ink.accent },
  title: { fontSize: 20, fontWeight: "800", color: T.color.ink.primary },
  scroll: { padding: 16 },
  errorCard: { backgroundColor: T.color.surface.danger, borderWidth: 1, borderColor: T.color.border.danger, padding: 12, borderRadius: T.radius.md, marginBottom: 14 },
  errorText: { color: T.color.status.dangerText, fontSize: 14 },
  card: { backgroundColor: T.color.surface.primary, borderWidth: 1, borderColor: T.color.border.subtle, borderRadius: 18, padding: 16, marginBottom: 14, boxShadow: "0px 6px 16px rgba(18, 48, 68, 0.05)", elevation: 2 },
  cardTitle: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, color: T.color.ink.muted, marginBottom: 14 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "700", color: T.color.ink.primary, marginBottom: 7 },
  req: { color: T.color.ink.accent },
  optional: { color: T.color.ink.muted, fontWeight: "600" },
  hint: { fontSize: 12, color: T.color.ink.muted, marginTop: 6 },
  hintError: { color: T.color.status.dangerText },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: T.color.surface.secondary, borderWidth: 1.5, borderColor: T.color.border.subtle, borderRadius: 12, paddingHorizontal: 14, minHeight: 52 },
  rowMultiline: { alignItems: "flex-start", paddingVertical: 4 },
  iconBox: { width: 30, height: 30, borderRadius: 9, backgroundColor: T.color.surface.accent, alignItems: "center", justifyContent: "center" },
  rowValue: { fontSize: 15, fontWeight: "700", color: T.color.ink.primary },
  rowSubtitle: { fontSize: 12, color: T.color.ink.muted, marginTop: 2 },
  rowPlaceholder: { fontSize: 15, color: T.color.ink.muted },
  prefix: { fontSize: 15, fontWeight: "800", color: T.color.ink.muted },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: T.color.ink.primary },
  inputEmphasize: { fontSize: 18, fontWeight: "800" },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { flex: 1, minWidth: 70, borderWidth: 1.5, borderColor: T.color.border.subtle, backgroundColor: T.color.surface.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: "center" },
  chipOn: { backgroundColor: T.color.ink.accentStrong, borderColor: T.color.ink.accentStrong },
  chipText: { fontSize: 13, fontWeight: "700", color: T.color.ink.secondary },
  chipTextOn: { color: T.color.ink.inverse },
  summary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, backgroundColor: T.color.ink.accentStrong, borderRadius: 18, padding: 18, boxShadow: "0px 10px 24px rgba(29, 93, 128, 0.3)", elevation: 4 },
  summaryLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryValue: { color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 2 },
  summaryTag: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  summaryTagText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  footer: { flexDirection: "row", gap: 12, padding: 14, backgroundColor: T.color.surface.primary, borderTopWidth: 1, borderTopColor: T.color.border.subtle, boxShadow: "0px -6px 18px rgba(18, 48, 68, 0.06)", elevation: 8 },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  ghost: { flex: 0, flexBasis: "33%", backgroundColor: T.color.surface.secondary, borderWidth: 1, borderColor: T.color.border.subtle },
  ghostText: { color: T.color.ink.secondary, fontSize: 16, fontWeight: "800" },
  primary: { flex: 1, backgroundColor: T.color.ink.accent, boxShadow: "0px 8px 20px rgba(46, 125, 163, 0.35)", elevation: 4 },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  backdrop: { flex: 1, backgroundColor: "rgba(18, 48, 68, 0.4)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "75%", backgroundColor: T.color.surface.primary, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: T.spacing.xxl },
  grab: { width: 40, height: 5, borderRadius: 999, backgroundColor: T.color.border.strong, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: T.spacing.lg, paddingVertical: T.spacing.md, borderBottomWidth: 1, borderBottomColor: T.color.border.subtle },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: T.color.ink.primary },
  sheetClose: { fontSize: 15, color: T.color.ink.accentStrong, fontWeight: "700" },
  sheetScroll: { paddingHorizontal: T.spacing.lg },
  searchInput: { borderWidth: 1, borderColor: T.color.border.subtle, borderRadius: T.radius.md, paddingHorizontal: T.spacing.lg, paddingVertical: 10, fontSize: 15, color: T.color.ink.primary, backgroundColor: T.color.surface.secondary, marginTop: T.spacing.md, marginBottom: T.spacing.sm },
  optionRow: { flexDirection: "row", alignItems: "center", paddingVertical: T.spacing.md, borderBottomWidth: 1, borderBottomColor: T.color.border.subtle, gap: T.spacing.sm },
  optionTitle: { fontSize: 16, color: T.color.ink.primary, fontWeight: "600" },
  optionSubtitle: { fontSize: 12, color: T.color.ink.muted, marginTop: 2 },
  optionCheck: { fontSize: 18, fontWeight: "700", color: T.color.ink.accent },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeOpen: { backgroundColor: T.color.surface.success },
  badgeClosed: { backgroundColor: T.color.surface.secondary },
  badgeText: { fontSize: 12, fontWeight: "700" },
  badgeTextOpen: { color: T.color.status.successText },
  badgeTextClosed: { color: T.color.ink.muted },
  sheetEmpty: { fontSize: 14, color: T.color.ink.muted, paddingVertical: T.spacing.xl, textAlign: "center" },
});

export const formModalStyles = styles;
