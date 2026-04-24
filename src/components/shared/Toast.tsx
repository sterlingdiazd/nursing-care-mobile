import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { designTokens } from "@/src/design-system/tokens";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastProps {
  variant: ToastVariant;
  message: string;
  duration?: number;
  onDismiss?: () => void;
}

interface VariantStyle {
  backgroundColor: string;
  borderColor: string;
  color: string;
}

const variantStyles: Record<ToastVariant, VariantStyle> = {
  success: {
    backgroundColor: designTokens.color.status.successBg,
    borderColor: designTokens.color.border.success,
    color: designTokens.color.status.successText,
  },
  error: {
    backgroundColor: designTokens.color.status.dangerBg,
    borderColor: designTokens.color.border.danger,
    color: designTokens.color.status.dangerText,
  },
  info: {
    backgroundColor: designTokens.color.status.infoBg,
    borderColor: designTokens.color.border.accent,
    color: designTokens.color.status.infoText,
  },
  warning: {
    backgroundColor: designTokens.color.surface.warning,
    borderColor: designTokens.color.border.warning,
    color: designTokens.color.ink.warning,
  },
};

export function Toast({
  variant,
  message,
  duration = 3000,
  onDismiss,
}: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      onDismiss?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss, translateY]);

  const vs = variantStyles[variant];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + designTokens.spacing.lg,
          backgroundColor: vs.backgroundColor,
          borderColor: vs.borderColor,
          transform: [{ translateY }],
        },
      ]}
      accessibilityLiveRegion="polite"
      testID="toast-container"
      nativeID="toast-container"
    >
      <TouchableOpacity
        onPress={onDismiss}
        activeOpacity={0.9}
        style={styles.touchable}
        accessibilityRole="button"
        accessibilityLabel="Cerrar notificación"
        testID="toast-dismiss-btn"
      >
        <View style={styles.inner}>
          <Text
            style={[styles.message, { color: vs.color }]}
            testID="toast-message"
            nativeID="toast-message"
          >
            {message}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: designTokens.spacing.lg,
    right: designTokens.spacing.lg,
    borderRadius: designTokens.radius.md,
    borderWidth: 1,
    zIndex: 9999,
    ...{
      shadowColor: "#123044",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6,
    },
  },
  touchable: {
    borderRadius: designTokens.radius.md,
    overflow: "hidden",
  },
  inner: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
  },
  message: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
});
