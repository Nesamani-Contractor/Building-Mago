import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEvent } from 'expo';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { DeviceMotion } from 'expo-sensors';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/design/theme';
import { layout, radius } from '@/design/tokens';
import { PressableScale } from './PressableScale';
import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';

/**
 * Muted, looping, seamless video with its poster frame shown first; the video cross-fades in once
 * it can play, and pauses whenever the screen loses focus. Reduce Motion → poster only.
 */
export function LoopVideo({
  video,
  poster,
  style,
  accessibilityLabel,
}: {
  video: number;
  poster: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const reduced = useReducedMotion();
  const player = useVideoPlayer(reduced ? null : video, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (status === 'readyToPlay') opacity.set(withTiming(1, { duration: 300 }));
  }, [status, opacity]);

  useFocusEffect(
    useCallback(() => {
      if (!reduced) player.play();
      return () => player.pause();
    }, [player, reduced]),
  );

  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <View style={[styles.clip, style]} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} accessibilityRole="image">
      <Image source={poster} contentFit="cover" style={StyleSheet.absoluteFill} />
      {!reduced ? (
        <Animated.View style={[StyleSheet.absoluteFill, fade]} pointerEvents="none">
          {/* width/height 100%: on web a <video> ignores left/right/bottom insets and keeps its intrinsic size. */}
          <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * Soft specular highlight that slides across a photo as she tilts the device (DeviceMotion,
 * low-pass filtered, ±6° range). No sensor (web, simulator) → a slow drift. Reduce Motion → static.
 */
export function TiltSheen({ strength = 0.18 }: { strength?: number }) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      x.set(0);
      return;
    }
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    let smooth = 0;
    (async () => {
      const ok = Platform.OS !== 'web' && (await DeviceMotion.isAvailableAsync().catch(() => false));
      if (cancelled) return;
      if (ok) {
        DeviceMotion.setUpdateInterval(50);
        sub = DeviceMotion.addListener((m) => {
          const gamma = m.rotation?.gamma ?? 0; // left/right tilt, radians
          const clamped = Math.max(-0.105, Math.min(0.105, gamma)); // ±6°
          smooth = smooth * 0.85 + (clamped / 0.105) * 0.15; // low-pass
          x.set(smooth);
        });
      } else {
        x.set(withRepeat(withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.sin) }), -1, true));
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
      cancelAnimation(x);
    };
  }, [reduced, x]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: `${x.get() * 45}%` }, { rotate: '10deg' }] }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.sheen, style]}>
        <LinearGradient
          colors={['rgba(255,240,220,0)', `rgba(255,240,220,${strength})`, 'rgba(255,240,220,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/**
 * Glass control (controls and navigation ONLY — never content). Frosted blur on iOS/web,
 * tonal fill on Android. Round icon button, or a pill when it has a label.
 */
export function GlassButton({
  icon,
  label,
  accessibilityLabel,
  onPress,
  selected,
  style,
}: {
  icon?: IconName;
  label?: string;
  accessibilityLabel: string;
  onPress: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const pill = !!label;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected !== undefined ? { selected } : undefined}
      onPress={onPress}
      style={[styles.glass, pill ? styles.glassPill : styles.glassRound, { borderColor: c.glassEdge }, style]}
    >
      {Platform.OS !== 'android' ? (
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(30,20,26,0.45)' }]} />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: selected ? 'rgba(255,255,255,0.32)' : c.glassOnPhoto }]} />
      {icon ? <Icon name={icon} size={pill ? 18 : 20} color={c.inkOnPhoto} /> : null}
      {label ? (
        <Txt variant="subhead" style={{ color: c.inkOnPhoto, fontWeight: '600', fontSize: 14 }}>
          {label}
        </Txt>
      ) : null}
    </PressableScale>
  );
}

/** Thin story-style progress segments (onboarding story, Follow-Along). */
export function Segments({ count, active, progress = 1, onPhoto = true }: { count: number; active: number; progress?: number; onPhoto?: boolean }) {
  const { c } = useTheme();
  const on = onPhoto ? c.inkOnPhoto : c.primary;
  const off = onPhoto ? 'rgba(251,247,244,0.35)' : c.track;
  return (
    <View style={styles.segments} accessibilityElementsHidden>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.segment, { backgroundColor: off }]}>
          <View style={[styles.segmentFill, { backgroundColor: on, width: i < active ? '100%' : i === active ? `${Math.round(progress * 100)}%` : '0%' }]} />
        </View>
      ))}
    </View>
  );
}

/** Plum → transparent scrim for type on photography (≥ 4.5:1 on every frame). */
export function PhotoScrim({ height = 300, top }: { height?: number; top?: boolean }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={top ? ['rgba(42,30,38,0.48)', 'rgba(42,30,38,0)'] : ['rgba(91,42,74,0)', 'rgba(91,42,74,0.35)', 'rgba(42,30,38,0.84)']}
      locations={top ? undefined : [0, 0.45, 1]}
      style={[styles.scrim, top ? { top: 0, height } : { bottom: 0, height }]}
    />
  );
}

export function Floating({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ position: 'absolute' }, style]}>{children}</View>;
}

/** Hook: true once, a beat after mount — drives on-open moments (The Unveil). */
export function useBeat(delayMs: number) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return [on, setOn] as const;
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', backgroundColor: '#2A1E26' },
  video: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  sheen: { position: 'absolute', top: '-25%', bottom: '-25%', left: '25%', width: '50%' },
  glass: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  glassRound: { width: layout.tapMin, height: layout.tapMin, borderRadius: layout.tapMin / 2 },
  glassPill: { height: layout.tapMin, paddingHorizontal: 14, borderRadius: radius.pill },
  segments: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 2, borderRadius: 1, overflow: 'hidden' },
  segmentFill: { height: 2 },
  scrim: { position: 'absolute', left: 0, right: 0 },
});
