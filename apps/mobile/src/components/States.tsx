import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useOnline } from '@/services/network';
import { Txt } from './Txt';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';

/** Skeleton block — never a bare spinner for content loading. */
export function Skeleton({ width = '100%', height = 16, style }: { width?: DimensionValue; height?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const o = useSharedValue(0.55);
  useEffect(() => {
    if (!reduced) o.set(withRepeat(withTiming(1, { duration: 900 }), -1, true));
  }, [reduced, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[{ width, height, borderRadius: height / 2, backgroundColor: c.track }, a, style]} />;
}

interface StateProps {
  icon?: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Empty / error / permission states: say what happened and what to do next. */
export function StateView({ icon = 'sparkle', title, body, actionLabel, onAction, style }: StateProps) {
  const { c } = useTheme();
  return (
    <View style={[styles.state, style]} accessibilityRole="summary">
      <View style={[styles.stateIcon, { borderColor: c.hairlineStrong }]}>
        <Icon name={icon} size={26} />
      </View>
      <Txt variant="title3" align="center">
        {title}
      </Txt>
      {body ? (
        <Txt variant="callout" tone="secondary" align="center" style={{ maxWidth: 320 }}>
          {body}
        </Txt>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" style={{ alignSelf: 'center', marginTop: space.s }} /> : null}
    </View>
  );
}

/** Shown at the top of every screen when the device is offline. */
export function OfflineBanner() {
  const online = useOnline();
  const { c } = useTheme();
  if (online) return null;
  return (
    <View style={[styles.offline, { backgroundColor: c.warningBg }]} accessibilityLiveRegion="polite">
      <Icon name="wifiOff" size={16} color={c.warningInk} />
      <Txt variant="footnote" tone="warning">
        You’re offline. Your library still works; new links will wait.
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  state: { alignItems: 'center', gap: space.m, paddingVertical: space.x4, paddingHorizontal: space.xl },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingHorizontal: space.l,
    paddingVertical: space.s,
    marginHorizontal: space.l,
    borderRadius: radius.chip,
  },
});
