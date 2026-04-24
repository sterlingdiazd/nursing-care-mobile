import { useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";

export interface CollapsibleSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, defaultExpanded = false, children }: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotation = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const animatedHeight = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggle = () => {
    const toValue = expanded ? 0 : 1;
    Animated.parallel([
      Animated.timing(rotation, {
        toValue,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(animatedHeight, {
        toValue,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();
    setExpanded(!expanded);
  };

  const rotateInterpolation = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const heightInterpolation =
    contentHeight !== null
      ? animatedHeight.interpolate({
          inputRange: [0, 1],
          outputRange: [0, contentHeight],
        })
      : undefined;

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
        <Animated.Text
          style={[styles.chevron, { transform: [{ rotate: rotateInterpolation }] }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          ▾
        </Animated.Text>
      </Pressable>

      {contentHeight === null ? (
        <View
          style={styles.measureContainer}
          onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
        >
          {children}
        </View>
      ) : (
        <Animated.View
          style={[
            styles.body,
            heightInterpolation !== undefined
              ? { height: heightInterpolation, overflow: "hidden" }
              : expanded
              ? undefined
              : { height: 0, overflow: "hidden" },
          ]}
        >
          {children}
        </Animated.View>
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
  body: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.md,
  },
  measureContainer: {
    position: "absolute",
    opacity: 0,
    pointerEvents: "none",
    paddingHorizontal: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.md,
  },
});
