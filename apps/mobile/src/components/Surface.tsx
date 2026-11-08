import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { Txt } from './Txt';

interface CardProps extends ViewProps {
  /**
   * glass / porcelain = soft raised row tone (no border, no shadow — separation comes from
   * space and tone). outline = sunken fill, for quieter grouped content.
   */
  variant?: 'glass' | 'porcelain' | 'outline';
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Content group: 24 radius, tonal fill, never a border or a drop shadow. */
export function Card({ variant = 'glass', padded = true, style, children, ...rest }: CardProps) {
  const { c } = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: radius.card,
          padding: padded ? space.xl : 0,
          backgroundColor: variant === 'outline' ? c.surfaceAlt : c.surface,
          borderCurve: 'continuous',
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

/** Quiet label pill: sunken fill, ink text (champagne is never text). */
export function Badge({ label, style, tone = 'sunken' }: { label: string; style?: StyleProp<ViewStyle>; tone?: 'sunken' | 'plum' }) {
  const { c } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tone === 'plum' ? c.primary : c.surfaceAlt,
          borderRadius: radius.pill,
          paddingHorizontal: space.m,
          paddingVertical: space.xs,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Txt variant="caption" style={tone === 'plum' ? { color: c.inkOnPrimary, fontWeight: '600' } : { fontWeight: '600' }}>
        {label}
      </Txt>
    </View>
  );
}

export function Hairline({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: c.hairlineStrong }, style]} />;
}
