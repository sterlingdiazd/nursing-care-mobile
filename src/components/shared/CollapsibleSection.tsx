import { useState } from "react";
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface CollapsibleSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, defaultExpanded = false, children }: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.chevron, expanded && styles.chevronExpanded]}>
          ▾
        </Text>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.color.surface.secondary,
    borderRadius: designTokens.radius.md,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    overflow: "hidden",
    marginVertical: designTokens.spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
  },
  headerPressed: {
    opacity: 0.85,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
    flex: 1,
  },
  chevron: {
    fontSize: 18,
    color: designTokens.color.ink.accent,
    marginLeft: designTokens.spacing.sm,
  },
  chevronExpanded: {
    transform: [{ rotate: "180deg" }],
  },
  body: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.md,
  },
});
