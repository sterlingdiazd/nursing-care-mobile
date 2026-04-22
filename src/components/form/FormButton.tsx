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
}

export function FormButton({
  testID,
  children,
  variant = "primary",
  isLoading = false,
  style,
  disabled,
  ...props
}: FormButtonProps) {
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
      default:
        return styles.primaryText;
    }
  };

  return (
    <TouchableOpacity
      {...testProps(testID)}
      style={[
        getVariantStyle(),
        style,
        (disabled || isLoading) ? styles.disabled : null,
      ]}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      {...props}
    >
      {isLoading ? (
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
