import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

import { mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";

interface MobileWorkspaceShellProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  testID?: string;
  nativeID?: string;
}

export default function MobileWorkspaceShell({
  eyebrow,
  title,
  description,
  actions,
  children,
  testID,
  nativeID,
}: MobileWorkspaceShellProps) {
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

          <View style={styles.container}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.hero}>
                <Text style={styles.eyebrow}>{eyebrow}</Text>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description}>{description}</Text>
                {actions ? <View style={styles.actions}>{actions}</View> : null}
              </View>

              <View style={styles.body}>{children}</View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    paddingBottom: 24,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 36,
    gap: 18,
  },
  hero: {
    ...mobileSurfaceCard,
    borderRadius: mobileTheme.radius.xl,
    padding: 24,
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
  body: {
    gap: 18,
  },
});
