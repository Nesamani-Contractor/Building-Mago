import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';
import { Icon, type IconName } from './Icon';
import { useTheme } from '@/design/theme';
import { layout, palette, radius, space } from '@/design/tokens';

type Variant = 'primary' | 'hero' | 'secondary' | 'ghost';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Mirror size: bigger target for Follow-Along. */
  large?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

/**
 * Primary: Deep Plum pill, porcelain text, 56px.
 * Hero: same, with a 1px champagne→rose gradient edge (hero screens only).
 * Secondary: plum outline pill. Ghost: text-only.
 * Labels are verb + object, sentence case ("Start this look").
 */
export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, large, style, accessibilityHint }: Props) {
  const { c } = useTheme();
  const height = large ? layout.tapMirror : variant === 'ghost' ? layout.tapMin : layout.buttonHeight;
  const filled = variant === 'primary' || variant === 'hero';
  const fg = filled ? c.inkOnPrimary : c.ink;

  const inner = (
    <View
      style={[
        styles.inner,
        { height: variant === 'hero' ? height - 2 : height, borderRadius: radius.pill },
        filled && { backgroundColor: c.primary },
        variant === 'secondary' && { borderWidth: 1, borderColor: c.ink },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} accessibilityLabel="Loading" />
      ) : (
        <>
          {icon ? <Icon name={icon} size={20} color={fg} /> : null}
          <Txt variant="button" style={[{ color: fg }, large && { fontSize: 20 }]}>
            {label}
          </Txt>
        </>
      )}
    </View>
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={[{ alignSelf: 'stretch' }, style]}
    >
      {variant === 'hero' ? (
        <LinearGradient
          colors={[palette.champagne, palette.peach, palette.rose]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: radius.pill, padding: 1 }}
        >
          {inner}
        </LinearGradient>
      ) : (
        inner
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s,
    paddingHorizontal: space.xxl,
  },
});
