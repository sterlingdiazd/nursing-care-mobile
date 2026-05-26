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
import { mobileTheme } from "@/src/design-system/mobileStyles";
import { designTokens } from "@/src/design-system/tokens";
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
                <View style={styles.body}>{children}</View>
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
    backgroundColor: mobileTheme.colors.surface.canvas,
  },
  screen: {
    flex: 1,
    backgroundColor: mobileTheme.colors.surface.canvas,
  },
  main: {
    flex: 1,
    paddingBottom: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 22,
    fontWeight: "800",
  },
  headerDescription: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  headerAccessory: {
    flexShrink: 0,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: mobileTheme.colors.surface.secondary,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonText: {
    fontSize: 28,
    lineHeight: 28,
    color: mobileTheme.colors.ink.primary,
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
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  contentFrame: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 18,
  },
  actionBar: {
    paddingHorizontal: designTokens.spacing.md,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: mobileTheme.colors.border.subtle,
    backgroundColor: mobileTheme.colors.surface.primary,
    boxShadow: "0px -2px 8px rgba(18, 48, 68, 0.04)",
    elevation: 6,
  },
  body: {
    flex: 1,
  },
});
