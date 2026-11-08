import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { motion } from '@/design/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  /** Fade when disabled (default). Buttons draw their own disabled look instead. */
  dimWhenDisabled?: boolean;
}

/** Spring press state (scale ~0.97). Instant on press-in; respects Reduce Motion. */
export function PressableScale({ style, scaleTo = motion.pressScale, onPressIn, onPressOut, disabled, dimWhenDisabled = true, ...rest }: Props) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!reduced && !disabled) scale.set(withSpring(scaleTo, motion.spring));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, motion.spring));
        onPressOut?.(e);
      }}
      style={[style, animated, disabled && dimWhenDisabled ? { opacity: 0.35 } : null]}
    />
  );
}
