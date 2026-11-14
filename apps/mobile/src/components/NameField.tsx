import { StyleSheet, TextInput } from 'react-native';
import { useTheme } from '@/design/theme';
import { fonts, radius, space } from '@/design/tokens';

export const MAX_NAME_LENGTH = 24;

/** First name for the greeting (FR-GRT). Stays on this phone; never sent to analytics. */
export function NameField({ value, onChange, onSubmit, autoFocus }: { value: string; onChange: (v: string) => void; onSubmit?: () => void; autoFocus?: boolean }) {
  const { c } = useTheme();
  return (
    <TextInput
      autoFocus={autoFocus}
      value={value}
      onChangeText={(t) => onChange(t.slice(0, MAX_NAME_LENGTH))}
      placeholder="Your first name"
      placeholderTextColor={c.inkSecondary}
      accessibilityLabel="Your first name"
      autoCapitalize="words"
      autoComplete="given-name"
      textContentType="givenName"
      returnKeyType="done"
      onSubmitEditing={onSubmit}
      maxLength={MAX_NAME_LENGTH}
      style={[styles.input, { color: c.ink, backgroundColor: c.surfaceAlt }]}
    />
  );
}

const styles = StyleSheet.create({
  input: { borderRadius: radius.chip, paddingHorizontal: space.l, minHeight: 56, fontFamily: fonts.sans, fontSize: 20, marginTop: space.xxl },
});
