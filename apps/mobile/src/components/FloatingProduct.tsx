import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { BagMatch, ProductRef } from '@mago/shared';
import { ProductArt } from '@/components/ProductArt';
import { PressableScale } from '@/components/PressableScale';
import { Txt } from '@/components/Txt';
import { useTheme } from '@/design/theme';
import { motion, radius, space } from '@/design/tokens';

/**
 * Floating studio tile (D-22): the product for this step, on the right of the instruction.
 * Pops in when the step appears, then floats and turns a few degrees, like it's on a turntable.
 * Reduce Motion → static. Tap opens every product in the look.
 */
export function FloatingProduct({
  product,
  more = 0,
  match,
  size = 96,
  onPress,
}: {
  product: ProductRef;
  more?: number;
  match?: BagMatch;
  size?: number;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const pop = useSharedValue(reduce ? 1 : 0);
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    pop.set(0);
    pop.set(withDelay(120, withSpring(1, motion.unveil)));
    t.set(0);
    t.set(withRepeat(withSequence(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.sin) }), withTiming(-1, { duration: 1900, easing: Easing.inOut(Easing.sin) })), -1, true));
  }, [product.ref, reduce, pop, t]);

  const tileStyle = useAnimatedStyle(() => {
    const p = pop.get();
    const v = t.get();
    return {
      opacity: Math.min(1, p * 1.4),
      transform: [{ translateY: (1 - p) * 14 + v * -3 }, { scale: 0.86 + p * 0.14 }, { rotate: `${v * 2.2}deg` }],
    };
  });

  const status =
    match?.status === 'have' ? { text: 'In your bag', color: c.success } : match?.status === 'swap' ? { text: 'Swap from your bag', color: c.success } : match?.status === 'missing' ? { text: 'Not in your bag', color: c.warningInk } : null;

  return (
    <PressableScale
      accessibilityLabel={`${product.name}${product.shade ? `, ${product.shade}` : ''}${status ? `. ${status.text}` : ''}${more ? `. Plus ${more} more` : ''}. See every product`}
      onPress={onPress}
      style={[styles.wrap, { width: size + 8 }]}
    >
      <Animated.View style={[styles.tile, { width: size, height: size, backgroundColor: c.surfaceAlt, shadowColor: c.shadow }, tileStyle]}>
        <ProductArt product={product} size={size} />
        {product.shadeHex ? <View style={[styles.dot, { backgroundColor: product.shadeHex, borderColor: c.surface }]} /> : null}
        {more > 0 ? (
          <View style={[styles.more, { backgroundColor: c.ink }]}>
            <Txt variant="caption" style={{ color: c.bg, fontWeight: '700' }}>
              +{more}
            </Txt>
          </View>
        ) : null}
      </Animated.View>
      <Txt variant="footnote" numberOfLines={2} align="center" style={{ fontWeight: '600', marginTop: space.s }}>
        {product.shade ?? product.name}
      </Txt>
      {status ? (
        <Txt variant="caption" numberOfLines={1} align="center" style={{ color: status.color }}>
          {status.text}
        </Txt>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  tile: { borderRadius: radius.card, overflow: 'visible', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  dot: { position: 'absolute', right: 8, bottom: 8, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  more: { position: 'absolute', right: -6, top: -6, minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
});
