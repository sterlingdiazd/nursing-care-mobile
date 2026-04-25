import React from "react";
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import { mobilePrimaryButton, mobileSecondaryButton } from "@/src/design-system/mobileStyles";
import { testProps } from "@/src/testing/testIds";

interface FormButtonProps extends Omit<TouchableOpacityProps, "testID"> {
  testID: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  isLoading?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
}

export function FormButton({
  testID,
  children,
  variant = "primary",
  isLoading = false,
  loading = false,
  style,
  disabled,
  accessibilityLabel,
  ...props
}: FormButtonProps) {
  const isActuallyLoading = isLoading || loading;

  const getVariantStyle = () => {
    switch (variant) {
      case "secondary":
        return mobileSecondaryButton;
      case "danger":
        return styles.dangerButton;
      default:
        return mobilePrimaryButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case "secondary":
        return styles.secondaryText;
      case "danger":
        return styles.dangerText;
      default:
        return styles.primaryText;
    }
  };

  const childrenText =
    typeof children === "string" ? children : undefined;
  const resolvedAccessibilityLabel = isActuallyLoading
    ? "Cargando..."
    : (accessibilityLabel ?? childrenText);

  const accessibilityState = {
    ...(isActuallyLoading ? { busy: true } : {}),
    ...(disabled ? { disabled: true } : {}),
  };

  return (
    <TouchableOpacity
      {...testProps(testID)}
      style={[
        getVariantStyle(),
        style,
        (disabled || isActuallyLoading) ? styles.disabled : null,
      ]}
      disabled={disabled || isActuallyLoading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityState={accessibilityState}
      {...props}
    >
      {isActuallyLoading ? (
        <ActivityIndicator
          color={variant === "secondary" ? designTokens.color.ink.accent : designTokens.color.ink.inverse}
        />
      ) : (
        <Text style={[getTextStyle()]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryText: {
    ...designTokens.typography.label,
    color: designTokens.color.ink.inverse,
  },
  secondaryText: {
    ...designTokens.typography.label,
    color: designTokens.color.ink.accent,
  },
  dangerText: {
    ...designTokens.typography.label,
    color: designTokens.color.status.dangerText,
  },
  dangerButton: {
    backgroundColor: designTokens.color.surface.danger,
    borderRadius: designTokens.radius.lg,
    borderWidth: 1,
    borderColor: designTokens.color.border.danger,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  disabled: {
    opacity: 0.5,
  },
});
