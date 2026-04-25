import { ReactNode } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSegments } from "expo-router";

import {
  mobilePrimaryButton,
  mobileSecondaryButton,
  mobileTheme,
} from "@/src/design-system/mobileStyles";
import { designTokens } from "@/src/design-system/tokens";
import { navigationTestIds } from "@/src/testing/testIds/navigationTestIds";

export type FooterActionVariant = "primary" | "secondary" | "danger";

export interface FooterAction {
  label: string;
  onPress: () => void;
  variant?: FooterActionVariant;
  disabled?: boolean;
  testID?: string;
}

interface AppFooterPrimaryReturn {
  label?: string;
  onPress: () => void;
  testID?: string;
}

interface AppFooterProps {
  primaryReturn?: AppFooterPrimaryReturn;
  systemActions?: FooterAction[];
  workflowActions?: FooterAction[];
}

const DETAIL_ACTION_SEGMENTS = [
  "invoice",
  "pay",
  "void",
  "receipt",
  "review",
  "edit",
  "create",
];

const MIN_BOTTOM_PADDING = 8;
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
  return (
    <Pressable
      testID={testID}
      nativeID={testID}
      {...webProps}
      disabled={disabled}
      onPress={onPress}
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
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  const hasWorkflow = workflowActions.length > 0;
  const hasSystem = systemActions.length > 0;
  const hasContent = Boolean(primaryReturn) || hasSystem || hasWorkflow;

  if (!hasContent) {
    return null;
  }

  const isDetailRoute = segments.some(
    (seg) => seg.startsWith("[") || DETAIL_ACTION_SEGMENTS.includes(seg),
  );

  const safeAreaSpacerHeight = isDetailRoute
    ? Math.max(insets.bottom - MIN_BOTTOM_PADDING, 0)
    : 0;

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
          <View style={styles.right}>
            {systemActions.map((action, idx) => (
              <FooterButton key={action.testID ?? idx} {...action} />
            ))}
          </View>
        ) : null}
      </View>
      {safeAreaSpacerHeight > 0 ? (
        <View style={{ height: safeAreaSpacerHeight }} />
      ) : null}
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
    paddingBottom: MIN_BOTTOM_PADDING,
    shadowColor: mobileTheme.colors.ink.primary,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
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
    paddingHorizontal: 2,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: ROW_GAP,
    flexShrink: 1,
  },
  button: {
    borderRadius: mobileTheme.radius.lg,
    paddingHorizontal: 16,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  primaryButton: {
    ...mobilePrimaryButton,
    paddingHorizontal: 16,
  },
  secondaryButton: {
    ...mobileSecondaryButton,
    paddingHorizontal: 16,
  },
  dangerButton: {
    backgroundColor: mobileTheme.colors.surface.danger,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.danger,
    paddingHorizontal: 16,
  },
  disabledButton: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  primaryButtonText: {
    color: mobileTheme.colors.ink.inverse,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.ink.accentStrong,
  },
  dangerButtonText: {
    color: mobileTheme.colors.status.dangerText,
  },
  disabledButtonText: {
    color: mobileTheme.colors.ink.muted,
  },
});
