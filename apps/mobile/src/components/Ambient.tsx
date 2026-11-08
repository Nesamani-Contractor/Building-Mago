import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Image as SvgImage, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { palette } from '@/design/tokens';
import { useTheme } from '@/design/theme';

const GRAIN = require('../../assets/grain.png');

type Mood = 'warm' | 'calm' | 'reveal';

/**
 * Ambient light: large soft blobs behind content at 15–25% opacity, one light direction
 * (top-left warm glow), with 2–3% grain on top. Text never sits directly on this — it sits
 * on porcelain or frosted cards.
 */
export function Ambient({ mood = 'warm', height: heightProp }: { mood?: Mood; height?: number }) {
  const { c, isDark } = useTheme();
  const { width, height: winH } = useWindowDimensions();
  // Fill the whole screen so the glow never ends in a hard edge.
  const height = heightProp ?? winH;
  const k = c.glowOpacity;
  const blobs =
    mood === 'reveal'
      ? [
          { id: 'a', color: palette.champagne, x: 0.05, y: 0.05, r: 0.9, o: 0.4 },
          { id: 'b', color: palette.peach, x: 0.85, y: 0.25, r: 0.7, o: 0.32 },
          { id: 'c', color: palette.rose, x: 0.35, y: 0.75, r: 0.7, o: 0.25 },
          { id: 'd', color: palette.lilac, x: 0.95, y: 0.95, r: 0.5, o: 0.18 },
        ]
      : mood === 'calm'
        ? [
            { id: 'a', color: palette.champagne, x: 0.0, y: 0.0, r: 0.9, o: 0.22 },
            { id: 'b', color: palette.peach, x: 0.9, y: 0.35, r: 0.55, o: 0.12 },
          ]
        : [
            { id: 'a', color: palette.champagne, x: 0.0, y: 0.0, r: 1.0, o: 0.25 },
            { id: 'b', color: palette.peach, x: 0.85, y: 0.2, r: 0.6, o: 0.15 },
            { id: 'c', color: palette.champagne, x: 0.1, y: 0.7, r: 0.55, o: 0.18 },
            { id: 'd', color: palette.lilac, x: 0.95, y: 1.0, r: 0.45, o: 0.12 },
          ];
  return (
    <View pointerEvents="none" style={[styles.wrap, { height }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height}>
        <Defs>
          {blobs.map((b) => (
            <RadialGradient key={b.id} id={`g-${b.id}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={b.color} stopOpacity={b.o * k * (isDark ? 1.4 : 1)} />
              <Stop offset="1" stopColor={b.color} stopOpacity={0} />
            </RadialGradient>
          ))}
          <Pattern id="grain" patternUnits="userSpaceOnUse" width={128} height={128}>
            <SvgImage href={GRAIN} width={128} height={128} />
          </Pattern>
        </Defs>
        {blobs.map((b) => (
          <Circle key={b.id} cx={b.x * width} cy={b.y * height} r={b.r * Math.max(width, 380)} fill={`url(#g-${b.id})`} />
        ))}
        {/* 2–3% grain over the glow. */}
        <Rect x={0} y={0} width={width} height={height} fill="url(#grain)" opacity={isDark ? 0.04 : 0.025} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
});
