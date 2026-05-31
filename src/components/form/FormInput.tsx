import React from "react";
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import { testProps } from "@/src/testing/testIds";

interface FormInputProps extends Omit<TextInputProps, "testID"> {
  testID: string;
  label?: string;
  /** Appends a teal `*` after the label (the canonical required-field marker). */
  required?: boolean;
  error?: string;
  errorMessage?: string;
  containerStyle?: any;
  accessibilityLabel?: string;
}

export function FormInput({
  testID,
  label,
  required,
  error,
  errorMessage,
  containerStyle,
  style,
  accessibilityLabel,
  placeholder,
  ...props
}: FormInputProps) {
  const activeError = errorMessage ?? error;
  const resolvedAccessibilityLabel = accessibilityLabel ?? placeholder;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.req}> *</Text> : null}
        </Text>
      )}
      <TextInput
        {...testProps(testID)}
        style={[
          styles.input,
          activeError ? styles.inputError : null,
          style,
        ]}
        placeholderTextColor={designTokens.color.ink.muted}
        placeholder={placeholder}
        accessibilityLabel={resolvedAccessibilityLabel}
        accessibilityState={activeError ? { disabled: false } : undefined}
        accessibilityHint={activeError ? `Error: ${activeError}` : undefined}
        {...props}
      />
      {activeError ? (
        <Text
          {...testProps(`${testID}-error`)}
          style={styles.errorText}
        >
          {activeError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: designTokens.spacing.lg,
    width: "100%",
  },
  label: {
    ...designTokens.typography.label,
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.xs,
  },
  req: {
    color: designTokens.color.ink.accent,
    fontWeight: "800",
  },
  input: {
    ...designTokens.typography.body,
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: Platform.OS === "ios" ? designTokens.spacing.md : designTokens.spacing.sm,
    color: designTokens.color.ink.primary,
    minHeight: 48,
  },
  inputError: {
    borderColor: designTokens.color.ink.danger,
    backgroundColor: designTokens.color.surface.danger,
  },
  errorText: {
    ...designTokens.typography.body,
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.color.ink.danger,
    marginTop: designTokens.spacing.xs,
    fontWeight: "600",
  },
});
