import { createElement, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { designTokens } from "@/src/design-system/tokens";
import { hapticFeedback } from "@/src/utils/haptics";
import { formatDateES } from "@/src/utils/spanishTextValidator";
import { maskTyped, typedToIso, MIN_YEAR, MAX_YEAR } from "@/src/utils/dateInput";

const toIso = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Anchor at LOCAL noon so the device timezone offset can never push the wall-clock day across a
// midnight boundary (the cause of the "shows May 1, saves Apr 30" off-by-one on the spinner).
const parseIso = (value?: string): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const noonToday = (): Date => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
};

interface DateFieldProps {
  /** Field label rendered above the control. */
  label: string;
  /** Current value as an ISO date string (`YYYY-MM-DD`) or "" when empty. */
  value: string;
  /** Receives the new ISO date string ("" when cleared or while the typed value is incomplete/invalid). */
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
 * Shared date control for every date field in the app. Stores the value as an
 * ISO `YYYY-MM-DD` string (the format the API expects) and offers two ways to
 * enter a date so the user is never forced to swipe month-by-month:
 *
 *  - Type it directly in a `DD-MM-YYYY` masked field with strict format control.
 *  - Tap the calendar button for the native picker — an inline month grid on iOS
 *    (tap the year header to jump years) and the material calendar dialog on
 *    Android (both expose fast year selection).
 *
 * On web it renders the native HTML date input, which already supports typing
 * plus a calendar with a year dropdown.
 */
export function DateField({
  label,
  value,
  onChange,
  placeholder = "DD-MM-YYYY",
  accessibilityLabel,
  testID,
  required,
  clearable,
  errorMessage,
}: DateFieldProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [draft, setDraft] = useState<Date>(() => parseIso(value) ?? noonToday());
  const [text, setText] = useState<string>(() => (value ? formatDateES(value) : ""));
  const [typedError, setTypedError] = useState<string | null>(null);

  // Tracks the last ISO we emitted so the sync effect can tell our own typing
  // apart from an external value change (picker, parent reset/prefill).
  const lastEmitted = useRef<string>(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(value ? formatDateES(value) : "");
      setTypedError(null);
    }
  }, [value]);

  const emit = (iso: string) => {
    lastEmitted.current = iso;
    onChange(iso);
  };

  const handleTyped = (raw: string) => {
    const masked = maskTyped(raw);
    setText(masked);

    if (masked === "") {
      setTypedError(null);
      emit("");
      return;
    }

    const digits = masked.replace(/\D/g, "");

    // Per-segment validation: fire as soon as each 2-digit segment is complete
    // so the user sees feedback without having to finish the full date.
    if (digits.length >= 2) {
      const dd = Number(digits.slice(0, 2));
      if (dd < 1 || dd > 31) {
        setTypedError("Día inválido (01–31)");
        if (lastEmitted.current !== "") emit("");
        return;
      }
    }
    if (digits.length >= 4) {
      const mm = Number(digits.slice(2, 4));
      if (mm < 1 || mm > 12) {
        setTypedError("Mes inválido (01–12)");
        if (lastEmitted.current !== "") emit("");
        return;
      }
    }

    // Year: check as each digit arrives so invalid centuries are flagged early.
    // First digit > 2 → year ≥ 3000 (above MAX_YEAR). First two digits outside
    // 19–21 → year outside the 1900–2100 window we allow.
    if (digits.length >= 5) {
      const firstYearDigit = Number(digits[4]);
      if (firstYearDigit > 2) {
        setTypedError(`Año inválido (${MIN_YEAR}–${MAX_YEAR})`);
        if (lastEmitted.current !== "") emit("");
        return;
      }
    }
    if (digits.length >= 6) {
      const yearPrefix = Number(digits.slice(4, 6));
      if (yearPrefix < 19 || yearPrefix > 21) {
        setTypedError(`Año inválido (${MIN_YEAR}–${MAX_YEAR})`);
        if (lastEmitted.current !== "") emit("");
        return;
      }
    }

    const { iso, complete } = typedToIso(masked);
    if (iso) {
      setTypedError(null);
      emit(iso);
    } else {
      setTypedError(complete ? "Fecha inválida" : null);
      // Not a valid date yet — clear the stored value so form validation reflects it.
      if (lastEmitted.current !== "") emit("");
    }
  };

  const openPicker = () => {
    hapticFeedback.selection();
    setDraft(parseIso(value) ?? noonToday());
    setPickerVisible(true);
  };
  const closePicker = () => {
    hapticFeedback.selection();
    setPickerVisible(false);
  };
  const confirmPicker = () => {
    hapticFeedback.light();
    const iso = toIso(draft);
    setText(formatDateES(iso));
    setTypedError(null);
    emit(iso);
    setPickerVisible(false);
  };

  const clear = () => {
    hapticFeedback.selection();
    setText("");
    setTypedError(null);
    emit("");
  };

  const handleNativeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      if (event.type === "set" && selected) {
        hapticFeedback.selection();
        const iso = toIso(selected);
        setText(formatDateES(iso));
        setTypedError(null);
        emit(iso);
      }
      setPickerVisible(false);
      return;
    }
    if (selected) setDraft(selected);
  };

  const resolvedLabel = accessibilityLabel ?? label;
  const shownError = errorMessage || typedError || undefined;

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
            border: shownError
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
        <View style={[styles.inputRow, shownError ? styles.inputRowError : null]}>
          <TextInput
            testID={testID}
            nativeID={testID}
            style={styles.textInput}
            value={text}
            onChangeText={handleTyped}
            placeholder={placeholder}
            placeholderTextColor={designTokens.color.ink.muted}
            keyboardType="number-pad"
            maxLength={10}
            accessibilityLabel={resolvedLabel}
            autoCorrect={false}
          />
          {clearable && value ? (
            <Pressable
              testID={`${testID}-clear`}
              onPress={clear}
              accessibilityRole="button"
              accessibilityLabel={`Limpiar ${label}`}
              hitSlop={8}
              style={styles.iconButton}
            >
              <Text style={styles.clear}>✕</Text>
            </Pressable>
          ) : null}
          <Pressable
            testID={`${testID}-calendar`}
            nativeID={`${testID}-calendar`}
            onPress={openPicker}
            accessibilityRole="button"
            accessibilityLabel={`Abrir calendario para ${label}`}
            accessibilityState={{ expanded: pickerVisible }}
            hitSlop={8}
            style={styles.iconButton}
          >
            <FontAwesome name="calendar" size={20} color={designTokens.color.ink.accent} />
          </Pressable>
        </View>
      )}

      {shownError ? <Text style={styles.errorText}>{shownError}</Text> : null}

      {pickerVisible && Platform.OS !== "web" ? (
        Platform.OS === "ios" ? (
          <Modal transparent animationType="slide" visible={pickerVisible} onRequestClose={closePicker}>
            <Pressable style={styles.backdrop} onPress={closePicker} accessibilityLabel="Cerrar selector de fecha" />
            <View style={styles.sheet} accessibilityViewIsModal={true}>
              <Text style={styles.sheetTitle}>{label}</Text>
              {/* `inline` shows the month grid with a tappable month/year header so the
                  user can jump straight to any year instead of swiping month-by-month. */}
              <DateTimePicker value={draft} mode="date" display="inline" onChange={handleNativeChange} />
              <View style={styles.sheetActions}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={closePicker}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar selección de fecha"
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={styles.confirmButton}
                  onPress={confirmPicker}
                  accessibilityRole="button"
                  accessibilityLabel="Confirmar fecha seleccionada"
                >
                  <Text style={styles.confirmText}>Guardar</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        ) : (
          // Android's material calendar dialog exposes a tappable year header for fast year selection.
          <DateTimePicker
            value={parseIso(value) ?? noonToday()}
            mode="date"
            display="calendar"
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
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: designTokens.spacing.lg,
    backgroundColor: designTokens.color.surface.secondary,
  },
  inputRowError: {
    borderColor: designTokens.color.ink.danger,
    backgroundColor: designTokens.color.surface.danger,
  },
  textInput: {
    flex: 1,
    fontSize: designTokens.typography.body.fontSize,
    color: designTokens.color.ink.primary,
    fontWeight: "600",
    paddingVertical: designTokens.spacing.sm,
  },
  iconButton: {
    paddingLeft: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
  },
  clear: {
    fontSize: designTokens.typography.body.fontSize,
    color: designTokens.color.ink.muted,
  },
  errorText: {
    fontSize: designTokens.typography.caption.fontSize,
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
    fontSize: designTokens.typography.body.fontSize,
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
    paddingVertical: designTokens.spacing.lg,
    borderRadius: designTokens.radius.md,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    alignItems: "center",
  },
  cancelText: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "600",
    color: designTokens.color.ink.secondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: designTokens.spacing.lg,
    borderRadius: designTokens.radius.md,
    backgroundColor: designTokens.color.ink.accentStrong,
    alignItems: "center",
  },
  confirmText: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.inverse,
  },
});
