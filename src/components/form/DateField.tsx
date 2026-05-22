import { createElement, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Platform,
  StyleSheet,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { designTokens } from "@/src/design-system/tokens";
import { formatDateES } from "@/src/utils/spanishTextValidator";

const toIso = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseIso = (value?: string): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

interface DateFieldProps {
  /** Field label rendered above the control. */
  label: string;
  /** Current value as an ISO date string (`YYYY-MM-DD`) or "" when empty. */
  value: string;
  /** Receives the new ISO date string ("" when cleared). */
  onChange: (iso: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  testID: string;
  required?: boolean;
  /** Show a clear control once a value is set (for optional date fields). */
  clearable?: boolean;
  errorMessage?: string;
}

/**
 * Shared date picker for every date field in the app. Stores the value as an
 * ISO `YYYY-MM-DD` string (the format the API expects) and renders the native
 * picker per platform — HTML date input on web, a spinner sheet on iOS, the
 * inline dialog on Android. Extracted from the care-request screens so payroll
 * and future forms reuse one consistent control.
 */
export function DateField({
  label,
  value,
  onChange,
  placeholder = "Selecciona una fecha",
  accessibilityLabel,
  testID,
  required,
  clearable,
  errorMessage,
}: DateFieldProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [draft, setDraft] = useState<Date>(() => parseIso(value) ?? new Date());

  const open = () => {
    setDraft(parseIso(value) ?? new Date());
    setPickerVisible(true);
  };
  const close = () => setPickerVisible(false);
  const confirm = () => {
    onChange(toIso(draft));
    setPickerVisible(false);
  };

  const handleNativeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      if (event.type === "set" && selected) onChange(toIso(selected));
      setPickerVisible(false);
      return;
    }
    if (selected) setDraft(selected);
  };

  const resolvedLabel = accessibilityLabel ?? label;

  return (
    <View style={styles.group}>
      <Text style={styles.label}>
        {label}
        {required ? " *" : ""}
      </Text>

      {Platform.OS === "web" ? (
        createElement("input", {
          type: "date",
          value,
          onChange: (e: any) => onChange(e.target.value),
          "data-testid": testID,
          "aria-label": resolvedLabel,
          style: {
            paddingTop: "14px",
            paddingBottom: "14px",
            paddingLeft: "16px",
            paddingRight: "16px",
            borderRadius: "14px",
            border: errorMessage
              ? `1px solid ${designTokens.color.ink.danger}`
              : `1px solid ${designTokens.color.border.subtle}`,
            backgroundColor: designTokens.color.surface.secondary,
            color: designTokens.color.ink.primary,
            fontSize: "16px",
            minHeight: "52px",
            width: "100%",
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
          },
        })
      ) : (
        <Pressable
          testID={testID}
          nativeID={testID}
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={resolvedLabel}
          style={[styles.trigger, errorMessage ? styles.triggerError : null]}
        >
          <Text style={value ? styles.value : styles.placeholder}>
            {value ? formatDateES(value) : placeholder}
          </Text>
          {clearable && value ? (
            <Pressable
              onPress={() => onChange("")}
              accessibilityRole="button"
              accessibilityLabel={`Limpiar ${label}`}
              hitSlop={8}
            >
              <Text style={styles.clear}>✕</Text>
            </Pressable>
          ) : null}
        </Pressable>
      )}

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {pickerVisible && Platform.OS !== "web" ? (
        Platform.OS === "ios" ? (
          <Modal transparent animationType="slide" visible={pickerVisible} onRequestClose={close}>
            <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Cerrar selector de fecha" />
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <DateTimePicker value={draft} mode="date" display="spinner" onChange={handleNativeChange} />
              <View style={styles.sheetActions}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={close}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar selección de fecha"
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={styles.confirmButton}
                  onPress={confirm}
                  accessibilityRole="button"
                  accessibilityLabel="Confirmar fecha seleccionada"
                >
                  <Text style={styles.confirmText}>Guardar</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={parseIso(value) ?? new Date()}
            mode="date"
            display="default"
            onChange={handleNativeChange}
          />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: designTokens.spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.sm,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: designTokens.color.surface.secondary,
  },
  triggerError: {
    borderColor: designTokens.color.ink.danger,
    backgroundColor: designTokens.color.surface.danger,
  },
  value: {
    fontSize: 16,
    color: designTokens.color.ink.primary,
    fontWeight: "600",
  },
  placeholder: {
    fontSize: 16,
    color: designTokens.color.ink.muted,
  },
  clear: {
    fontSize: 16,
    color: designTokens.color.ink.muted,
    paddingLeft: designTokens.spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: designTokens.color.ink.danger,
    marginTop: designTokens.spacing.xs,
    fontWeight: "600",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(18, 48, 68, 0.35)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: designTokens.color.surface.primary,
    borderTopLeftRadius: designTokens.radius.xl,
    borderTopRightRadius: designTokens.radius.xl,
    paddingHorizontal: designTokens.spacing.xl,
    paddingTop: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.xxl,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
    textAlign: "center",
    marginBottom: designTokens.spacing.sm,
  },
  sheetActions: {
    flexDirection: "row",
    gap: designTokens.spacing.md,
    marginTop: designTokens.spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: designTokens.radius.md,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: designTokens.color.ink.secondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: designTokens.radius.md,
    backgroundColor: designTokens.color.ink.accentStrong,
    alignItems: "center",
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "700",
    color: designTokens.color.ink.inverse,
  },
});
