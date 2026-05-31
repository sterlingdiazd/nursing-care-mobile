import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";

import AppFooter, { type FooterAction } from "@/src/components/navigation/AppFooter";
import { designTokens, type SpacingToken } from "@/src/design-system/tokens";
import { Stack } from "@/src/design-system/primitives";
import { navigationTestIds } from "@/src/testing/testIds";
import { hapticFeedback } from "@/src/utils/haptics";
import { goBackOrReplace } from "@/src/utils/navigationEscapes";

interface MobileWorkspaceShellProps {
  eyebrow?: string;
  title: string;
  description?: string;
  headerAccessory?: ReactNode;
  /** Free-form action node (legacy callers). When provided, renders inside the action bar container with restored 502215f styling. */
  actions?: ReactNode;
  /** Structured right-aligned actions; routes into AppFooter's 3-zone layout. */
  systemActions?: FooterAction[];
  /** Structured horizontally-scrolling middle actions; routes into AppFooter. */
  workflowActions?: FooterAction[];
  primaryReturnPath?: Href;
  primaryReturnLabel?: string;
  onPrimaryReturn?: () => void;
  /** Where the back action renders. Default "header" (small chevron). "footer" puts it in the AppFooter left zone. */
  primaryReturnPlacement?: "header" | "footer";
  children: ReactNode;
  footer?: ReactNode;
  testID?: string;
  nativeID?: string;
  /** When true, skip the internal vertical ScrollView so children (e.g. FlatList) own scrolling. */
  disableScroll?: boolean;
  /**
   * Default vertical rhythm between the scroll body's direct children. One value
   * for the whole app so every screen breathes identically (kills per-screen
   * gap drift). Dense list screens may opt to a tighter token.
   */
  bodyGap?: SpacingToken;
}

export default function MobileWorkspaceShell({
  eyebrow,
  title,
  description,
  headerAccessory,
  actions,
  systemActions,
  workflowActions,
  primaryReturnPath,
  primaryReturnLabel,
  onPrimaryReturn,
  primaryReturnPlacement = "header",
  children,
  footer,
  testID,
  nativeID,
  disableScroll = false,
  bodyGap = "lg",
}: MobileWorkspaceShellProps) {
  const shouldRenderPrimaryReturn = Boolean(primaryReturnPath || onPrimaryReturn);
  const shouldRenderActions = shouldRenderPrimaryReturn || Boolean(actions);
  const headerBack = shouldRenderPrimaryReturn && primaryReturnPlacement === "header";
  const footerBack = shouldRenderPrimaryReturn && primaryReturnPlacement === "footer";

  const handlePrimaryReturn = () => {
    hapticFeedback.selection();
    if (onPrimaryReturn) {
      onPrimaryReturn();
      return;
    }

    if (primaryReturnPath) {
      // Always honor navigation history first. The provided path is only a
      // fallback for when the screen was opened directly (no back stack),
      // never a hard override of where the user actually came from.
      goBackOrReplace(router, primaryReturnPath);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right"]}
      testID={testID}
      nativeID={nativeID}
    >
      <View style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.main}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={styles.header}>
            {headerBack ? (
              <Pressable
                onPress={handlePrimaryReturn}
                accessibilityRole="button"
                accessibilityLabel={primaryReturnLabel ?? "Volver"}
                testID={navigationTestIds.shell.primaryReturnButton}
                nativeID={navigationTestIds.shell.primaryReturnButton}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.backButtonPressed,
                ]}
              >
                <Text style={styles.backButtonText}>‹</Text>
              </Pressable>
            ) : null}
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle} numberOfLines={2}>{title}</Text>
              {description ? (
                <Text style={styles.headerDescription} numberOfLines={2}>{description}</Text>
              ) : null}
            </View>
            {headerAccessory ? <View style={styles.headerAccessory}>{headerAccessory}</View> : null}
          </View>

          <View style={styles.contentViewport}>
            {disableScroll ? (
              <View style={[styles.body, styles.contentFrame]}>{children}</View>
            ) : (
              <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Stack gap={bodyGap} style={styles.body}>{children}</Stack>
              </ScrollView>
            )}
          </View>

          {(systemActions && systemActions.length > 0) || (workflowActions && workflowActions.length > 0) || footerBack ? (
            <AppFooter
              primaryReturn={
                footerBack
                  ? { label: primaryReturnLabel, onPress: handlePrimaryReturn }
                  : undefined
              }
              systemActions={systemActions}
              workflowActions={workflowActions}
            />
          ) : actions ? (
            <View
              testID={navigationTestIds.footer.actionBar}
              nativeID={navigationTestIds.footer.actionBar}
              style={styles.actionBar}
            >
              {actions}
            </View>
          ) : null}
        </KeyboardAvoidingView>
        {footer ?? null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: designTokens.color.surface.canvas,
  },
  screen: {
    flex: 1,
    backgroundColor: designTokens.color.surface.canvas,
  },
  main: {
    flex: 1,
    paddingBottom: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.sm,
    paddingHorizontal: designTokens.layout.screenPaddingX,
    paddingTop: designTokens.spacing.sm,
    paddingBottom: designTokens.spacing.lg,
  },
  headerTitleWrap: {
    flex: 1,
    gap: designTokens.spacing.xs,
  },
  headerTitle: {
    ...designTokens.text.title,
  },
  headerDescription: {
    ...designTokens.text.label,
  },
  headerAccessory: {
    flexShrink: 0,
  },
  backButton: {
    width: 36,
    height: 36,
    // Round button: pill radius keeps it circular regardless of the card scale.
    borderRadius: designTokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: designTokens.color.surface.secondary,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonText: {
    fontSize: designTokens.typography.display.fontSize,
    lineHeight: 28,
    color: designTokens.color.ink.primary,
    fontWeight: "600",
  },
  container: {
    flex: 1,
  },
  contentViewport: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  scrollContent: {
    paddingHorizontal: designTokens.layout.screenPaddingX,
    paddingBottom: designTokens.spacing.xxl,
  },
  contentFrame: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: designTokens.layout.screenPaddingX,
  },
  actionBar: {
    paddingHorizontal: designTokens.spacing.md,
    paddingTop: designTokens.spacing.sm,
    paddingBottom: designTokens.spacing.sm,
    gap: designTokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
    boxShadow: "0px -2px 8px rgba(18, 48, 68, 0.04)",
    elevation: 6,
  },
  body: {
    flex: 1,
  },
});
