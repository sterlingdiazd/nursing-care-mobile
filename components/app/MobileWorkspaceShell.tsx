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
import { BlurView } from "expo-blur";
import { router, type Href } from "expo-router";

import { mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";
import { navigationTestIds } from "@/src/testing/testIds";

interface MobileWorkspaceShellProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  primaryReturnPath?: Href;
  primaryReturnLabel?: string;
  onPrimaryReturn?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  testID?: string;
  nativeID?: string;
}

export default function MobileWorkspaceShell({
  eyebrow,
  title,
  description,
  actions,
  primaryReturnPath,
  primaryReturnLabel,
  onPrimaryReturn,
  children,
  footer,
  testID,
  nativeID,
}: MobileWorkspaceShellProps) {
  const shouldRenderPrimaryReturn = Boolean(primaryReturnPath || onPrimaryReturn);
  const shouldRenderActions = shouldRenderPrimaryReturn || Boolean(actions);

  const handlePrimaryReturn = () => {
    if (onPrimaryReturn) {
      onPrimaryReturn();
      return;
    }

    if (primaryReturnPath) {
      router.replace(primaryReturnPath);
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
          <BlurView intensity={80} tint="light" style={styles.topBar}>
            <Text style={styles.topBarTitle}>{title}</Text>
          </BlurView>

          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>{eyebrow}</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.description}>{description}</Text>
              {shouldRenderActions ? (
                <View style={styles.actions}>
                  {shouldRenderPrimaryReturn ? (
                    <Pressable
                      onPress={handlePrimaryReturn}
                      accessibilityRole="button"
                      accessibilityLabel={primaryReturnLabel ?? "Volver"}
                      testID={navigationTestIds.shell.primaryReturnButton}
                      nativeID={navigationTestIds.shell.primaryReturnButton}
                      style={({ pressed }) => [
                        styles.primaryReturnButton,
                        pressed && styles.primaryReturnButtonPressed,
                      ]}
                    >
                      <Text style={styles.primaryReturnButtonText}>
                        {primaryReturnLabel ?? "Volver"}
                      </Text>
                    </Pressable>
                  ) : null}
                  {actions}
                </View>
              ) : null}
            </View>

            <View style={styles.body}>{children}</View>
          </ScrollView>
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
    paddingHorizontal: 18,
    paddingBottom: 0,
  },
  topBar: {
    marginTop: 10,
    marginBottom: 14,
    borderRadius: 22,
    backgroundColor: "rgba(252, 254, 253, 0.92)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.subtle,
  },
  topBarTitle: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  hero: {
    ...mobileSurfaceCard,
    borderRadius: mobileTheme.radius.xl,
    padding: 24,
    marginBottom: 18,
  },
  eyebrow: {
    ...mobileTheme.typography.eyebrow,
    color: mobileTheme.colors.ink.muted,
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: mobileTheme.colors.ink.primary,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: mobileTheme.colors.ink.secondary,
  },
  actions: {
    marginTop: 20,
    gap: 12,
  },
  primaryReturnButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.strong,
    backgroundColor: mobileTheme.colors.surface.secondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryReturnButtonPressed: {
    opacity: 0.85,
  },
  primaryReturnButtonText: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  body: {
    flex: 1,
  },
});
