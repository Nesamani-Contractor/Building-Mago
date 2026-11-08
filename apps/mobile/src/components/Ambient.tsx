import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Image as SvgImage, LinearGradient, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { palette } from '@/design/tokens';
import { useTheme } from '@/design/theme';

const GRAIN = require('../../assets/grain.png');

type Mood = 'warm' | 'calm' | 'reveal';

/**
 * Page light (Porter editorial). "warm" = the blush wash used on Today and the tabs: a soft
 * rose → porcelain vertical wash with two rose glows and 3–4% grain. "calm" = porcelain with a
 * faint blush at the top. Text sits directly on this — the wash is pale enough for AA contrast.
 */
export function Ambient({ mood = 'warm', height: heightProp }: { mood?: Mood; height?: number }) {
  const { c, isDark } = useTheme();
  const { width, height: winH } = useWindowDimensions();
  const height = heightProp ?? winH;
  const k = c.glowOpacity;
  const [w0, w1, w2, w3] = c.wash;
  const washStrength = mood === 'calm' ? 0.45 : 1;
  return (
    <View pointerEvents="none" style={[styles.wrap, { height }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="wash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={w0} stopOpacity={washStrength} />
            <Stop offset={mood === 'calm' ? '0.22' : '0.36'} stopColor={w1} stopOpacity={mood === 'calm' ? 0.25 : 1} />
            <Stop offset="0.7" stopColor={w2} stopOpacity={mood === 'calm' ? 0 : 1} />
            <Stop offset="1" stopColor={w3} stopOpacity={mood === 'calm' ? 0 : 1} />
          </LinearGradient>
          <RadialGradient id="g1" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={palette.glowRose} stopOpacity={0.4 * k * washStrength} />
            <Stop offset="1" stopColor={palette.glowRose} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="g2" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={palette.glowPetal} stopOpacity={(mood === 'calm' ? 0 : 0.42) * k} />
            <Stop offset="1" stopColor={palette.glowPetal} stopOpacity={0} />
          </RadialGradient>
          <Pattern id="grain" patternUnits="userSpaceOnUse" width={128} height={128}>
            <SvgImage href={GRAIN} width={128} height={128} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#wash)" />
        <Rect x={width * 0.85 - width * 0.6} y={-height * 0.3} width={width * 1.2} height={height * 0.6} fill="url(#g1)" />
        <Rect x={-width * 0.45} y={height * 0.45 - height * 0.25} width={width * 0.9} height={height * 0.5} fill="url(#g2)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#grain)" opacity={isDark ? 0.04 : 0.035} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
});
