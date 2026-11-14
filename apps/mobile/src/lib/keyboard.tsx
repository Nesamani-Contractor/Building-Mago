import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * react-native-keyboard-controller needs native code that Expo Go and the web don't have.
 * Load it only in a development / store build; everywhere else fall back to plain views, so the
 * same code runs in Expo Go (for quick iPad testing) and in the web preview.
 */
type KC = typeof import('react-native-keyboard-controller');
let kc: KC | null = null;
const native = Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
if (native) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    kc = require('react-native-keyboard-controller') as KC;
  } catch {
    kc = null;
  }
}

export const keyboardControllerAvailable = !!kc;

export function KeyboardRoot({ children }: { children: ReactNode }) {
  if (!kc) return <>{children}</>;
  const { KeyboardProvider } = kc;
  return <KeyboardProvider>{children}</KeyboardProvider>;
}

/** Keeps the primary button riding just above the keyboard, synced to its animation curve. */
export function AboveKeyboard({ children, style, gap = 12 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  if (!kc) return <View style={style}>{children}</View>;
  const { KeyboardStickyView } = kc;
  return (
    <KeyboardStickyView offset={{ closed: 0, opened: gap }} style={style}>
      {children}
    </KeyboardStickyView>
  );
}
