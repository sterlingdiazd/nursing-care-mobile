import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSegments } from "expo-router";

import WorkflowActionBar, { WorkflowAction } from "@/src/components/shared/WorkflowActionBar";
import { designTokens } from "@/src/design-system/tokens";
import { navigationTestIds } from "@/src/testing/testIds/navigationTestIds";

const ACTION_ROUTES = [
  "invoice", "pay", "void", "receipt",
  "review", "edit", "create",
];

interface AppFooterProps {
  workflowActions?: WorkflowAction[];
}

export default function AppFooter({ workflowActions = [] }: AppFooterProps): ReactNode {
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  const isDetailScreen = segments.some(
    (seg) => seg.startsWith("[") || ACTION_ROUTES.includes(seg),
  );

  if (!isDetailScreen || workflowActions.length === 0) {
    return null;
  }

  return (
    <View
      testID={navigationTestIds.footer.root}
      nativeID={navigationTestIds.footer.root}
      style={[styles.container, { paddingBottom: insets.bottom }]}
    >
      <View
        testID={navigationTestIds.footer.actionBar}
        nativeID={navigationTestIds.footer.actionBar}
      >
        <WorkflowActionBar actions={workflowActions} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.color.surface.primary,
    borderTopWidth: 1,
    borderTopColor: designTokens.color.border.subtle,
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.md,
  },
});
