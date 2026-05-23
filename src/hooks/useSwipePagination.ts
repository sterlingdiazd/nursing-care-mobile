import { useMemo, useRef } from "react";
import { PanResponder, type PanResponderInstance } from "react-native";

/**
 * Horizontal swipe-to-paginate for list screens. Swipe left → next page, right → previous.
 *
 * Uses core PanResponder (works on iOS + RN-Web, no GestureHandlerRootView needed) and
 * only CAPTURES clearly-horizontal drags (|dx| dominant), so the vertical list scroll and
 * row taps keep working untouched. Spread the returned `panHandlers` on the list wrapper
 * (see <SwipePager/>). Latest page/pageCount/handler are read from a ref so the responder
 * is created once.
 */
export function useSwipePagination(
  page: number,
  pageCount: number,
  onPageChange: (page: number) => void,
): PanResponderInstance["panHandlers"] {
  const state = useRef({ page, pageCount, onPageChange });
  state.current = { page, pageCount, onPageChange };

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Capture only a deliberate horizontal drag; let vertical scroll / taps pass through.
        onMoveShouldSetPanResponderCapture: (_e, g) =>
          Math.abs(g.dx) > 30 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_e, g) => {
          const { page: p, pageCount: total, onPageChange: change } = state.current;
          if (g.dx <= -50 && p < total) change(p + 1);
          else if (g.dx >= 50 && p > 1) change(p - 1);
        },
      }),
    [],
  );

  return responder.panHandlers;
}
