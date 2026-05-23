import type { ReactNode } from "react";
import { View, type ViewStyle, type StyleProp } from "react-native";

import { useSwipePagination } from "@/src/hooks/useSwipePagination";

/**
 * Wraps a paginated list's scroll area and turns horizontal swipes into page changes
 * (left → next, right → previous). Pair with the numbered <Pagination/> bar — the chips
 * stay for explicit navigation; the swipe is an additive shortcut. Defaults to flex:1 so
 * the wrapped list (a flex ScrollView/FlatList) keeps filling the available space.
 */
export function SwipePager({
  page,
  pageCount,
  onPageChange,
  children,
  style,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const panHandlers = useSwipePagination(page, pageCount, onPageChange);
  return (
    <View style={[{ flex: 1 }, style]} {...panHandlers}>
      {children}
    </View>
  );
}
