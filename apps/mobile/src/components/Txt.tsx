import { Text, type TextProps, type TextStyle } from 'react-native';
import { type, type TypeVariant } from '@/design/tokens';
import { useTheme } from '@/design/theme';

export type Tone = 'ink' | 'secondary' | 'onPrimary' | 'danger' | 'success' | 'warning';

interface Props extends TextProps {
  variant?: TypeVariant;
  tone?: Tone;
  align?: TextStyle['textAlign'];
}

/** All text in the app. Supports Dynamic Type up to 200%. */
export function Txt({ variant = 'body', tone = 'ink', align, style, ...rest }: Props) {
  const { c } = useTheme();
  const color =
    tone === 'ink'
      ? c.ink
      : tone === 'secondary'
        ? c.inkSecondary
        : tone === 'onPrimary'
          ? c.inkOnPrimary
          : tone === 'danger'
            ? c.danger
            : tone === 'success'
              ? c.success
              : c.warningInk;
  return (
    <Text
      maxFontSizeMultiplier={2}
      {...rest}
      style={[type[variant], { color, textAlign: align }, style]}
    />
  );
}
