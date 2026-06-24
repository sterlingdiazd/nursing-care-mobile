import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  PickerOption,
  PickerSheet,
  SelectRow,
} from "@/components/payroll/FormModalScaffold";
import { designTokens } from "@/src/design-system/tokens";

export const DR_ACCOUNT_TYPES = ["Ahorro", "Corriente", "Nómina"] as const;
export type AccountType = (typeof DR_ACCOUNT_TYPES)[number];

interface AccountTypeSelectorProps {
  value: string;
  onChange: (type: string) => void;
  label?: string;
  placeholder?: string;
  testID?: string;
  disabled?: boolean;
  errorMessage?: string;
  required?: boolean;
}

export function AccountTypeSelector({
  value,
  onChange,
  label = "Tipo de cuenta",
  placeholder = "Selecciona el tipo de cuenta",
  testID,
  disabled = false,
  errorMessage,
  required,
}: AccountTypeSelectorProps) {
  const [open, setOpen] = useState(false);

  const handlePick = (type: string) => {
    onChange(type);
    setOpen(false);
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
        icon="credit-card"
        value={value.trim() || null}
        placeholder={placeholder}
        onPress={() => { if (!disabled) setOpen(true); }}
        disabled={disabled}
        expanded={open}
        testID={testID}
        nativeID={testID}
        accessibilityLabel={`${label}: ${value.trim() || placeholder}`}
      />

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      <PickerSheet
        visible={open}
        title="Tipo de cuenta bancaria"
        onClose={() => setOpen(false)}
      >
        {DR_ACCOUNT_TYPES.map((type, idx) => (
          <PickerOption
            key={type}
            title={type}
            onPress={() => handlePick(type)}
            selected={type === value}
            testID={testID ? `${testID}-option-${idx}` : undefined}
            accessibilityLabel={`Seleccionar ${type}`}
          />
        ))}
      </PickerSheet>
    </View>
  );
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
});
