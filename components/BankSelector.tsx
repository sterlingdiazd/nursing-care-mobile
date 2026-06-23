import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  PickerEmpty,
  PickerOption,
  PickerSearchInput,
  PickerSheet,
  SelectRow,
} from "@/components/payroll/FormModalScaffold";
import { designTokens } from "@/src/design-system/tokens";
import { DR_BANKS } from "@/src/constants/banks";

interface BankSelectorProps {
  value: string;
  onChange: (bank: string) => void;
  label?: string;
  placeholder?: string;
  /**
   * Maps to testID (and nativeID) on the SelectRow trigger. Each list item gets
   * `${testID}-option-<idx>` where `idx` is the FILTERED-list index — not stable
   * across search states, so automation must not rely on a fixed option index.
   * The custom-entry option always uses `${testID}-option-custom`.
   */
  testID?: string;
  /** When true, the trigger row is non-interactive (read-only display). */
  disabled?: boolean;
  /** Error message shown below the selector row. */
  errorMessage?: string;
  /**
   * Required field marker — appends an accent-colored `*` after the label.
   * The token is `T.color.ink.accent` = #2E3191 (blue/indigo — not teal;
   * teal #0D9488 is a different palette hue).
   */
  required?: boolean;
}

/**
 * Searchable bank selector for Dominican Republic banks.
 *
 * Opens a bottom sheet with a live search input. If the user types a name that
 * does not match any known bank they can still commit the free-text value — a
 * hint below the list confirms this intent. Uses the same PickerSheet +
 * SelectRow scaffold as FilterSelect and the payroll form modals so it fits
 * seamlessly into any existing form.
 */
export function BankSelector({
  value,
  onChange,
  label = "Banco",
  placeholder = "Selecciona un banco",
  testID,
  disabled = false,
  errorMessage,
  required,
}: BankSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return DR_BANKS;
    const needle = normalizeText(query);
    return DR_BANKS.filter((b) => normalizeText(b).includes(needle));
  }, [query]);

  const isCustomEntry = value.trim() !== "" && !DR_BANKS.includes(value.trim());

  const handleOpen = () => {
    if (disabled) return;
    setQuery("");
    setOpen(true);
  };

  const handlePick = (bank: string) => {
    onChange(bank);
    setOpen(false);
    setQuery("");
  };

  const handlePickCustom = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    handlePick(trimmed);
  };

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.req}> *</Text> : null}
        </Text>
      ) : null}

      <SelectRow
        icon="university"
        value={value.trim() || null}
        placeholder={placeholder}
        onPress={handleOpen}
        disabled={disabled}
        testID={testID}
        nativeID={testID}
        accessibilityLabel={`${label}: ${value.trim() || placeholder}`}
      />

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      {isCustomEntry ? (
        <Text style={styles.hint}>
          Banco no encontrado — se usará el nombre que escribiste
        </Text>
      ) : null}

      <PickerSheet
        visible={open}
        title="Selecciona un banco"
        onClose={() => {
          setOpen(false);
          setQuery("");
        }}
      >
        <PickerSearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar banco..."
          autoFocus
          testID={testID ? `${testID}-search` : undefined}
          accessibilityLabel="Buscar banco"
          returnKeyType="done"
        />

        {filtered.length === 0 ? (
          <View>
            <PickerEmpty text="Banco no encontrado en la lista" />
            {query.trim() ? (
              <PickerOption
                title={`Usar "${query.trim()}"`}
                subtitle="Entrada personalizada"
                onPress={handlePickCustom}
                selected={false}
                testID={testID ? `${testID}-option-custom` : undefined}
                accessibilityLabel={`Usar ${query.trim()} como banco`}
              />
            ) : null}
          </View>
        ) : (
          filtered.map((bank, idx) => (
            <PickerOption
              key={bank}
              title={bank}
              onPress={() => handlePick(bank)}
              selected={bank === value}
              testID={testID ? `${testID}-option-${idx}` : undefined}
              accessibilityLabel={`Seleccionar ${bank}`}
            />
          ))
        )}

        {filtered.length > 0 && query.trim() && !DR_BANKS.includes(query.trim()) ? (
          <PickerOption
            title={`Usar "${query.trim()}"`}
            subtitle="Entrada personalizada"
            onPress={handlePickCustom}
            selected={false}
            testID={testID ? `${testID}-option-custom` : undefined}
            accessibilityLabel={`Usar ${query.trim()} como banco`}
          />
        ) : null}
      </PickerSheet>
    </View>
  );
}

/** Removes accents and lowercases for accent-insensitive matching. */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const T = designTokens;
const styles = StyleSheet.create({
  wrap: {
    marginBottom: T.spacing.lg,
    width: "100%",
  },
  label: {
    ...T.typography.label,
    color: T.color.ink.primary,
    marginBottom: T.spacing.xs,
  },
  req: {
    color: T.color.ink.accent,
    fontWeight: "800",
  },
  errorText: {
    ...T.typography.body,
    fontSize: T.typography.caption.fontSize,
    color: T.color.ink.danger,
    marginTop: T.spacing.xs,
    fontWeight: "600",
  },
  hint: {
    ...T.typography.caption,
    color: T.color.ink.muted,
    marginTop: T.spacing.xs,
  },
});
