import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/design/theme';
import { radius, softShadow, space } from '@/design/tokens';
import { Txt } from './Txt';

interface CardProps extends ViewProps {
  /**
   * glass   = white card, very soft rose shadow (default — the rose spec has no hard borders)
   * porcelain = soft rose-tinted well (secondary blocks inside a white page)
   * outline = white with a hairline, for quiet inline rows
   */
  variant?: 'glass' | 'porcelain' | 'outline';
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Cards: 16px radius, white, soft shadow 0 4 16 rgba(150,90,85,0.08). */
export function Card({ variant = 'glass', padded = true, style, children, ...rest }: CardProps) {
  const { c } = useTheme();
  const base: ViewStyle = {
    borderRadius: radius.card,
    padding: padded ? space.l : 0,
    backgroundColor: c.surface,
  };
  const look: ViewStyle =
    variant === 'porcelain'
      ? { backgroundColor: c.surface, ...softShadow(c) }
      : variant === 'outline'
        ? { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.hairline }
        : softShadow(c);
  return (
    <View style={[base, look, style]} {...rest}>
      {children}
    </View>
  );
}

/** Small rose pill tag: petal fill, rose text. */
export function Badge({ label, style }: { label: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ backgroundColor: c.tint, borderRadius: radius.pill, paddingHorizontal: space.m, paddingVertical: space.xs }, style]}>
      <Txt variant="caption" style={{ color: c.accentText }}>
        {label}
      </Txt>
    </View>
  );
}

export function Hairline({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth * 2, backgroundColor: c.hairline }, style]} />;
}
