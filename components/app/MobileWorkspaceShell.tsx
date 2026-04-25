import { ReactNode, useCallback, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
export type { NativeSyntheticEvent, NativeScrollEvent };
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";

import AppFooter, { type FooterAction } from "@/src/components/navigation/AppFooter";
import { mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";

interface MobileWorkspaceShellProps {
  eyebrow: string;
  title: string;
  description: string;
  systemActions?: FooterAction[];
  primaryReturnPath?: Href;
  primaryReturnLabel?: string;
  onPrimaryReturn?: () => void;
  workflowActions?: FooterAction[];
  children: ReactNode;
  footer?: ReactNode;
  testID?: string;
  nativeID?: string;
  /** When true, hero is fixed and body is flex:1 — use with FlatList children for bounded list viewports */
  flat?: boolean;
}

export default function MobileWorkspaceShell({
  eyebrow,
  title,
  description,
  systemActions,
  primaryReturnPath,
  primaryReturnLabel,
  onPrimaryReturn,
  workflowActions,
  children,
  footer,
  testID,
  nativeID,
  flat = false,
}: MobileWorkspaceShellProps) {
  const [heroBottom, setHeroBottom] = useState(0);
  const topBarOpacity = useRef(new Animated.Value(0)).current;
  const lastVisible = useRef(false);

  const onHeroLayout = useCallback((e: LayoutChangeEvent) => {
    setHeroBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height);
  }, []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (heroBottom === 0) return;
      const scrolled = e.nativeEvent.contentOffset.y >= heroBottom;
      if (scrolled !== lastVisible.current) {
        lastVisible.current = scrolled;
        Animated.timing(topBarOpacity, {
          toValue: scrolled ? 1 : 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    },
    [heroBottom, topBarOpacity],
  );

  const shouldRenderPrimaryReturn = Boolean(primaryReturnPath || onPrimaryReturn);

  const handlePrimaryReturn = () => {
    if (onPrimaryReturn) {
      onPrimaryReturn();
      return;
    }

    if (primaryReturnPath) {
      router.replace(primaryReturnPath);
    }
  };

  const renderedFooter =
    footer ??
    (
      <AppFooter
        primaryReturn={
          shouldRenderPrimaryReturn
            ? { label: primaryReturnLabel, onPress: handlePrimaryReturn }
            : undefined
        }
        systemActions={systemActions}
        workflowActions={workflowActions}
      />
    );

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
          {flat ? (
            <>
              <View style={styles.hero}>
                {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                {title ? <Text style={styles.title}>{title}</Text> : null}
                {description ? <Text style={styles.description}>{description}</Text> : null}
              </View>
              <View style={styles.flatBody}>{children}</View>
            </>
          ) : (
            <>
              <Animated.View style={[styles.topBarWrapper, { opacity: topBarOpacity }]} pointerEvents="none">
                <View style={styles.topBar}>
                  <Text style={styles.topBarTitle}>{title}</Text>
                </View>
              </Animated.View>

              <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
              >
                <View style={styles.hero} onLayout={onHeroLayout}>
                  {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                  {title ? <Text style={styles.title}>{title}</Text> : null}
                  {description ? <Text style={styles.description}>{description}</Text> : null}
                </View>

                <View style={styles.body}>{children}</View>
              </ScrollView>
            </>
          )}
        </KeyboardAvoidingView>
        {renderedFooter}
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
  topBarWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 0,
    paddingTop: 10,
  },
  topBar: {
    borderRadius: 22,
    backgroundColor: mobileTheme.colors.surface.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.subtle,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
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
  body: {
    flex: 1,
  },
  flatBody: {
    flex: 1,
    marginTop: 4,
  },
});
