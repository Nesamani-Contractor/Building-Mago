import { Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/design/theme';
import { radius, softShadow, space } from '@/design/tokens';
import { Txt } from './Txt';

interface CardProps extends ViewProps {
  /** glass = frosted (white 70% + blur), porcelain = solid, outline = gold hairline. */
  variant?: 'glass' | 'porcelain' | 'outline';
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Cards: 24px radius, frosted glass or porcelain, very soft warm shadow (plum at 6%). */
export function Card({ variant = 'glass', padded = true, style, children, ...rest }: CardProps) {
  const { c } = useTheme();
  const base: ViewStyle = {
    borderRadius: radius.card,
    padding: padded ? space.xl : 0,
    ...softShadow(c),
  };
  if (variant === 'glass') {
    return (
      <View style={[base, { backgroundColor: 'transparent' }, style]} {...rest}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: radius.card, overflow: 'hidden' }]}>
          {Platform.OS !== 'android' ? <BlurView intensity={30} tint={c.blurTint} style={StyleSheet.absoluteFill} /> : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'android' ? c.surface : c.glass }]} />
        </View>
        {children}
      </View>
    );
  }
  return (
    <View
      style={[
        base,
        { backgroundColor: variant === 'porcelain' ? c.bg : c.surface },
        { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.hairline },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

/** Gold-outline badge with ink text (gold is never used for text). */
export function Badge({ label, style }: { label: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View
      style={[
        { borderWidth: 1, borderColor: c.accent, borderRadius: radius.chip, paddingHorizontal: space.m, paddingVertical: space.xs },
        style,
      ]}
    >
      <Txt variant="caption">{label}</Txt>
    </View>
  );
}

export function Hairline({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth * 2, backgroundColor: c.hairline }, style]} />;
}
