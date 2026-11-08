import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Haptics only on meaningful moments (design rule). No-ops on web. */
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptic = {
  /** Toggles, chips, pickers. */
  select: () => enabled && Haptics.selectionAsync().catch(() => {}),
  /** A step completed in Follow-Along. */
  step: () => enabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  /** Look complete, weekly goal met, purchase. */
  success: () => enabled && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warning: () => enabled && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};
