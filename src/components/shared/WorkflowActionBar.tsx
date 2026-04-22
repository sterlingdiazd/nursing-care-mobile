import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { mobilePrimaryButton, mobileSecondaryButton, mobileTheme } from "@/src/design-system/mobileStyles";

export interface WorkflowAction {
  label: string;
  onPress: () => void;
  variant: "primary" | "danger" | "secondary";
  disabled?: boolean;
  testID?: string;
}

interface WorkflowActionBarProps {
  actions: WorkflowAction[];
}

export default function WorkflowActionBar({ actions }: WorkflowActionBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {actions.map((action, index) => (
        <Pressable
          key={index}
          testID={action.testID}
          nativeID={action.testID}
          disabled={action.disabled}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.button,
            action.variant === "primary" && styles.primaryButton,
            action.variant === "danger" && styles.dangerButton,
            action.variant === "secondary" && styles.secondaryButton,
            action.disabled && styles.disabledButton,
            pressed && !action.disabled && styles.buttonPressed,
          ]}
        >
          <Text
            style={[
              styles.buttonText,
              action.variant === "primary" && styles.primaryButtonText,
              action.variant === "danger" && styles.dangerButtonText,
              action.variant === "secondary" && styles.secondaryButtonText,
              action.disabled && styles.disabledButtonText,
            ]}
          >
            {action.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: mobileTheme.spacing.sm,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  button: {
    borderRadius: mobileTheme.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primaryButton: {
    ...mobilePrimaryButton,
    paddingHorizontal: 20,
  },
  dangerButton: {
    backgroundColor: mobileTheme.colors.surface.danger,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.danger,
  },
  secondaryButton: {
    ...mobileSecondaryButton,
    paddingHorizontal: 20,
  },
  disabledButton: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  primaryButtonText: {
    color: mobileTheme.colors.ink.inverse,
  },
  dangerButtonText: {
    color: mobileTheme.colors.status.dangerText,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.ink.accentStrong,
  },
  disabledButtonText: {
    color: mobileTheme.colors.ink.muted,
  },
});
