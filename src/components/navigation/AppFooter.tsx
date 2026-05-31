import { ReactNode } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  mobilePrimaryButton,
  mobileSecondaryButton,
} from "@/src/design-system/mobileStyles";
import { designTokens } from "@/src/design-system/tokens";
import { navigationTestIds } from "@/src/testing/testIds/navigationTestIds";
import { hapticFeedback } from "@/src/utils/haptics";

export type FooterActionVariant = "primary" | "secondary" | "danger";

export interface FooterAction {
  label: string;
  onPress: () => void;
  variant?: FooterActionVariant;
  disabled?: boolean;
  testID?: string;
}

export interface AppFooterPrimaryReturn {
  label?: string;
  onPress: () => void;
  testID?: string;
}

interface AppFooterProps {
  primaryReturn?: AppFooterPrimaryReturn;
  systemActions?: FooterAction[];
  workflowActions?: FooterAction[];
}

const VERTICAL_PADDING = 8;
const ROW_GAP = 8;
const BAR_CONTENT_HEIGHT = 56;

function FooterButton({
  label,
  onPress,
  variant = "secondary",
  disabled,
  testID,
}: FooterAction) {
  const webProps =
    Platform.OS === "web" && testID
      ? ({ id: testID, "data-testid": testID } as any)
      : null;
  const handlePress = () => {
    hapticFeedback.light();
    onPress();
  };

  return (
    <Pressable
      testID={testID}
      nativeID={testID}
      {...webProps}
      disabled={disabled}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.primaryButton,
        variant === "secondary" && styles.secondaryButton,
        variant === "danger" && styles.dangerButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.buttonText,
          variant === "primary" && styles.primaryButtonText,
          variant === "secondary" && styles.secondaryButtonText,
          variant === "danger" && styles.dangerButtonText,
          disabled && styles.disabledButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AppFooter({
  primaryReturn,
  systemActions = [],
  workflowActions = [],
}: AppFooterProps): ReactNode {
  const hasWorkflow = workflowActions.length > 0;
  const hasSystem = systemActions.length > 0;
  const hasContent = Boolean(primaryReturn) || hasSystem || hasWorkflow;

  if (!hasContent) {
    return null;
  }


  return (
    <View
      testID={navigationTestIds.footer.root}
      nativeID={navigationTestIds.footer.root}
      style={styles.container}
    >
      <View style={styles.row}>
        {primaryReturn ? (
          <FooterButton
            label={`← ${primaryReturn.label ?? "Volver"}`}
            onPress={primaryReturn.onPress}
            variant="secondary"
            testID={
              primaryReturn.testID ?? navigationTestIds.shell.primaryReturnButton
            }
          />
        ) : null}

        {hasWorkflow ? (
          <ScrollView
            testID={navigationTestIds.footer.actionBar}
            nativeID={navigationTestIds.footer.actionBar}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.middle}
            contentContainerStyle={styles.middleContent}
          >
            {workflowActions.map((action, idx) => (
              <FooterButton key={action.testID ?? idx} {...action} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.middle} />
        )}

        {hasSystem ? (
          <View
            testID={!hasWorkflow ? navigationTestIds.footer.actionBar : undefined}
            nativeID={!hasWorkflow ? navigationTestIds.footer.actionBar : undefined}
            style={styles.right}
          >
            {systemActions.map((action, idx) => (
              <FooterButton key={action.testID ?? idx} {...action} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.color.surface.primary,
    borderTopWidth: 1,
    borderTopColor: designTokens.color.border.subtle,
    paddingHorizontal: designTokens.spacing.md,
    paddingTop: VERTICAL_PADDING,
    paddingBottom: VERTICAL_PADDING,
    boxShadow: "0px -2px 8px rgba(18, 48, 68, 0.04)",
    elevation: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: ROW_GAP,
    height: BAR_CONTENT_HEIGHT,
  },
  middle: {
    flex: 1,
    minWidth: 0,
  },
  middleContent: {
    flexDirection: "row",
    gap: ROW_GAP,
    alignItems: "center",
    paddingHorizontal: designTokens.spacing.xs,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: ROW_GAP,
    flexShrink: 1,
  },
  button: {
    borderRadius: designTokens.radius.lg,
    paddingHorizontal: designTokens.spacing.lg,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  primaryButton: {
    ...mobilePrimaryButton,
    paddingHorizontal: designTokens.spacing.lg,
  },
  secondaryButton: {
    ...mobileSecondaryButton,
    paddingHorizontal: designTokens.spacing.lg,
  },
  dangerButton: {
    backgroundColor: designTokens.color.status.dangerBg,
    borderWidth: 1,
    borderColor: designTokens.color.border.danger,
    paddingHorizontal: designTokens.spacing.lg,
  },
  disabledButton: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "700",
  },
  primaryButtonText: {
    color: designTokens.color.ink.inverse,
  },
  secondaryButtonText: {
    color: designTokens.color.ink.accentStrong,
  },
  dangerButtonText: {
    color: designTokens.color.status.dangerText,
  },
  disabledButtonText: {
    color: designTokens.color.ink.muted,
  },
});
