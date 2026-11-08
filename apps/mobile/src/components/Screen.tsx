import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/design/theme';
import { layout, space } from '@/design/tokens';
import { Ambient } from './Ambient';
import { PressableScale } from './PressableScale';
import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';
import { OfflineBanner } from './States';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  mood?: 'warm' | 'calm' | 'reveal' | 'none';
  /** Extra space at the bottom (e.g. above the tab bar or a sticky button). */
  bottomInset?: number;
  footer?: ReactNode;
  header?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Page container: porcelain background, ambient light, safe areas, centered
 * max-width column on iPad, optional sticky footer (for the one primary action).
 */
export function Screen({ children, scroll = true, mood = 'calm', bottomInset = 0, footer, header, contentStyle }: ScreenProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const content = (
    <View style={[styles.column, contentStyle]}>{children}</View>
  );
  return (
    <View style={[styles.fill, { backgroundColor: c.bg }]}>
      {mood !== 'none' ? <Ambient mood={mood} /> : null}
      <View style={{ paddingTop: insets.top }}>
        <OfflineBanner />
        {header}
      </View>
      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={{ paddingBottom: insets.bottom + bottomInset + space.x4 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.fill, { paddingBottom: footer ? 0 : insets.bottom }]}>{content}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.l) }]}>
          <View style={styles.column}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

export function TopBar({
  title,
  onBack,
  backIcon = 'chevronLeft',
  right,
  backLabel = 'Back',
}: {
  title?: string;
  onBack?: () => void;
  backIcon?: IconName;
  right?: ReactNode;
  backLabel?: string;
}) {
  const router = useRouter();
  const { c } = useTheme();
  return (
    <View style={styles.topbar}>
      <PressableScale
        accessibilityLabel={backLabel}
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        style={[styles.round, { backgroundColor: c.glass, borderColor: c.hairline }]}
      >
        <Icon name={backIcon} size={20} />
      </PressableScale>
      <View style={{ flex: 1, alignItems: 'center' }}>
        {title ? (
          <Txt variant="headline" numberOfLines={1} accessibilityRole="header">
            {title}
          </Txt>
        ) : null}
      </View>
      <View style={{ minWidth: layout.tapMin, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function RoundButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressableScale accessibilityLabel={label} onPress={onPress} style={[styles.round, { backgroundColor: c.glass, borderColor: c.hairline }]}>
      <Icon name={icon} size={20} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: space.xl,
  },
  footer: { paddingTop: space.m },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.l,
    paddingVertical: space.s,
    gap: space.s,
    width: '100%',
    maxWidth: layout.maxContentWidth + 32,
    alignSelf: 'center',
  },
  round: {
    width: layout.tapMin,
    height: layout.tapMin,
    borderRadius: layout.tapMin / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
