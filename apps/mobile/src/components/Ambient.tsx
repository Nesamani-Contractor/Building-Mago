import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { palette } from '@/design/tokens';
import { useTheme } from '@/design/theme';

type Mood = 'warm' | 'calm' | 'reveal';

/**
 * Rose background light. Every page gets the blush hero gradient fading down from the top
 * (#FBEDEA → #F5DCD7 → blush). "reveal" adds two soft rose glows for celebrations.
 * Text sits on the blush page or on white cards — never on a saturated gradient.
 */
export function Ambient({ mood = 'warm', height: heightProp }: { mood?: Mood; height?: number }) {
  const { c, isDark } = useTheme();
  const { width, height: winH } = useWindowDimensions();
  const height = heightProp ?? winH;
  const top = mood === 'calm' ? 220 : 300;
  return (
    <View pointerEvents="none" style={[styles.wrap, { height }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={c.heroGradient} locations={[0, 0.7, 1]} style={{ height: top, opacity: mood === 'calm' ? 0.8 : 1 }} />
      {mood === 'reveal' ? (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="r1" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={palette.bannerB} stopOpacity={isDark ? 0.25 : 0.45} />
              <Stop offset="1" stopColor={palette.bannerB} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="r2" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={palette.rose} stopOpacity={isDark ? 0.18 : 0.22} />
              <Stop offset="1" stopColor={palette.rose} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={width * 0.9} cy={height * 0.3} r={Math.max(width, 380) * 0.7} fill="url(#r1)" />
          <Circle cx={width * 0.1} cy={height * 0.85} r={Math.max(width, 380) * 0.6} fill="url(#r2)" />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
});
