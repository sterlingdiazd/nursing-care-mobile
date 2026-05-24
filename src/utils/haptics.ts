import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticFeedbackKind = 'light' | 'selection' | 'success' | 'error';

/**
 * HIG-Compliant Haptic Feedback utility.
 * Apple recommends using haptics to reinforce the results of actions.
 */
export const hapticFeedback = {
  /**
   * Use for successful operations (e.g., successful login, form sent)
   */
  success: () => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },

  /**
   * Use for errors or warnings (e.g., invalid credentials, network failure)
   */
  error: () => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },

  /**
   * Use for small physical-like interactions (e.g., pressing a button, toggling a switch)
   */
  light: () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  /**
   * Use for standard selection changes (e.g., scrolling through a picker)
   */
  selection: () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
  },
};

export function triggerHapticFeedback(kind: HapticFeedbackKind = 'light') {
  hapticFeedback[kind]();
}

export function withHapticFeedback<TArgs extends unknown[]>(
  handler: ((...args: TArgs) => void) | undefined,
  kind: HapticFeedbackKind = 'light'
): (...args: TArgs) => void {
  return (...args: TArgs) => {
    triggerHapticFeedback(kind);
    handler?.(...args);
  };
}
