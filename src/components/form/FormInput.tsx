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
  error?: string;
  containerStyle?: any;
}

export function FormInput({
  testID,
  label,
  error,
  containerStyle,
  style,
  ...props
}: FormInputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        {...testProps(testID)}
        style={[
          styles.input,
          error ? styles.inputError : null,
          style,
        ]}
        placeholderTextColor={designTokens.color.ink.muted}
        {...props}
      />
      {error ? (
        <Text
          {...testProps(`${testID}-error`)}
          style={styles.errorText}
        >
          {error}
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
    fontSize: 12,
    color: designTokens.color.ink.danger,
    marginTop: designTokens.spacing.xs,
    fontWeight: "600",
  },
});
