import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { designTokens } from "@/src/design-system/tokens";

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function ScreenHeader({ title, showBack = false, onBack }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 4 }]}>
      {showBack && (
        <Pressable
          onPress={onBack ?? router.back}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={styles.backText}>←</Text>
        </Pressable>
      )}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.color.surface.canvas,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  backButton: {
    marginRight: 12,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  backText: {
    fontSize: 22,
    color: designTokens.color.ink.primary,
    lineHeight: 26,
  },
  title: {
    flex: 1,
    ...designTokens.typography.sectionTitle,
    color: designTokens.color.ink.primary,
  },
});
