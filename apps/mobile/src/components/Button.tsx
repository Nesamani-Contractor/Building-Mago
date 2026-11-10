import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';
import { Icon, type IconName } from './Icon';
import { useTheme } from '@/design/theme';
import { layout, radius, space } from '@/design/tokens';

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
 * Primary: rose pill (#B5504E, white text ≥ 5:1), 52px.
 * Hero: same, lifted with a soft rose glow (one per hero screen).
 * Secondary: white pill with a hairline and ink text. Ghost: text-only.
 * Labels are verb + object, sentence case ("Start this look").
 */
export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, large, style, accessibilityHint }: Props) {
  const { c } = useTheme();
  const height = large ? layout.tapMirror : variant === 'ghost' ? layout.tapMin : layout.buttonHeight;
  const filled = variant === 'primary' || variant === 'hero';
  const fg = filled ? c.inkOnPrimary : variant === 'ghost' ? c.accentText : c.ink;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={[{ alignSelf: 'stretch', opacity: disabled ? 0.5 : 1 }, style]}
    >
      <View
        style={[
          styles.inner,
          { height, borderRadius: radius.pill },
          filled && { backgroundColor: c.primary },
          variant === 'hero' && {
            shadowColor: c.primary,
            shadowOpacity: 0.3,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          },
          variant === 'secondary' && { backgroundColor: c.surface, borderWidth: 1, borderColor: c.hairlineStrong },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={fg} accessibilityLabel="Loading" />
        ) : (
          <>
            {icon ? <Icon name={icon} size={20} color={fg} /> : null}
            <Txt variant="button" style={[{ color: fg }, large && { fontSize: 18 }]}>
              {label}
            </Txt>
          </>
        )}
      </View>
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
