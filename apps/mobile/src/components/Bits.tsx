import { useRef, useState, type ReactNode } from 'react';
import {
  FlatList,
  StyleSheet,
  Switch,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { Routine } from '@mago/shared';
import { useTheme } from '@/design/theme';
import { fonts, layout, palette, radius, scrimColors, space } from '@/design/tokens';
import { routineImage, type LookImage } from '@/design/media';
import { haptic } from '@/design/haptics';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';
import { Icon, type IconName } from './Icon';

/** Selectable chip (filters, answers). Sunken fill; selected = plum fill. No borders. */
export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  const { c } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={() => {
        haptic.select();
        onPress?.();
      }}
      style={[styles.chip, { backgroundColor: selected ? c.primary : c.surfaceAlt }]}
    >
      {icon ? <Icon name={icon} size={16} color={selected ? c.inkOnPrimary : c.ink} /> : null}
      <Txt variant="subhead" style={{ color: selected ? c.inkOnPrimary : c.ink }}>
        {label}
      </Txt>
    </PressableScale>
  );
}

/** Answer card (onboarding): tonal row, plain icon, plum inset ring + check when selected. */
export function ChoiceCard({
  title,
  body,
  icon,
  selected,
  onPress,
}: {
  title: string;
  body?: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={body ? `${title}. ${body}` : title}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={[
        styles.choice,
        { backgroundColor: c.surface, borderColor: selected ? c.primary : 'transparent', borderWidth: 1.5 },
      ]}
    >
      <Icon name={icon} size={22} color={c.inkSecondary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="headline">{title}</Txt>
        {body ? (
          <Txt variant="footnote" tone="secondary">
            {body}
          </Txt>
        ) : null}
      </View>
      <View style={[styles.radio, { borderColor: selected ? c.primary : c.hairlineStrong, backgroundColor: selected ? c.primary : 'transparent' }]}>
        {selected ? <Icon name="check" size={14} color={c.inkOnPrimary} strokeWidth={2.2} /> : null}
      </View>
    </PressableScale>
  );
}

/** Small uppercase label above a title. */
export function Eyebrow({ children, onPhoto, style }: { children: ReactNode; onPhoto?: boolean; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return (
    <Txt variant="eyebrow" tone="secondary" style={[onPhoto && { color: c.inkOnPhoto, opacity: 0.9 }, style]}>
      {children}
    </Txt>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Txt variant="title3" accessibilityRole="header" style={{ flex: 1 }}>
        {title}
      </Txt>
      {action && onAction ? (
        <PressableScale onPress={onAction} accessibilityLabel={action} style={styles.link}>
          <Txt variant="subhead" style={{ color: c.primary }}>
            {action}
          </Txt>
        </PressableScale>
      ) : null}
    </View>
  );
}

/** Weekly goal ring: thin track, plum progress, quiet number. */
export function StreakRing({ done, goal, size = 64, onPhoto }: { done: number; goal: number; size?: number; onPhoto?: boolean }) {
  const { c } = useTheme();
  const stroke = size >= 56 ? 4 : 3;
  const r = size / 2 - stroke;
  const circ = 2 * Math.PI * r;
  const frac = Math.min(1, goal > 0 ? done / goal : 0);
  const ink = onPhoto ? c.inkOnPhoto : c.ink;
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`${done} of ${goal} looks this week`} accessibilityRole="image">
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.track} strokeWidth={stroke} fill="none" />
        {frac > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={c.primary}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circ * frac} ${circ}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
        <SvgText
          x={size / 2}
          y={size / 2 + size * 0.1}
          textAnchor="middle"
          fontSize={size * 0.3}
          fontWeight="600"
          fontFamily={fonts.sans}
          fill={ink}
        >
          {`${done}/${goal}`}
        </SvgText>
      </Svg>
    </View>
  );
}

export function ProgressBar({ value, style }: { value: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ height: 3, borderRadius: 2, backgroundColor: c.track, overflow: 'hidden' }, style]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: 3, backgroundColor: c.primary }} />
    </View>
  );
}

/** A look's photograph (source thumbnail, or demo photography). Tinted while it loads. */
export function LookPhoto({
  image,
  style,
  accessibilityLabel,
}: {
  image: LookImage;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const [x, y] = (image.focus ?? '50% 50%').split(' ');
  return (
    <Image
      source={image.source}
      contentFit="cover"
      contentPosition={{ left: x as `${number}%`, top: y as `${number}%` }}
      transition={200}
      style={[{ backgroundColor: c.mediaTint }, style]}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

/** Square/landscape thumbnail of a look. */
export function RoutineThumb({ routine, size = 64, wide }: { routine: Routine; size?: number; wide?: boolean }) {
  return (
    <LookPhoto
      image={routineImage(routine)}
      style={{ width: wide ? '100%' : size, height: size, borderRadius: wide ? radius.card : size <= 64 ? radius.chip : radius.thumb }}
    />
  );
}

export function stepCount(r: Routine): number {
  return r.sections.reduce((n, s) => n + s.steps.length, 0);
}

export function routineMeta(r: Routine): string {
  const level = r.difficulty === 'easy' ? 'Easy' : r.difficulty === 'medium' ? 'Medium' : 'Advanced';
  return `${stepCount(r)} steps · ${r.totalTimeMin} min · ${level}`;
}

/** Portrait 3:4 look card for rails and grids: photo, then title and meta below. */
export function RoutineTile({ routine, onPress, width = 150, badge }: { routine: Routine; onPress: () => void; width?: number; badge?: string }) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${routine.title}. ${routineMeta(routine)}`} style={{ width, gap: space.s }}>
      <View>
        <LookPhoto image={routineImage(routine)} style={{ width, height: Math.round((width * 4) / 3), borderRadius: radius.thumb }} />
        {badge ? (
          <View style={[styles.photoBadge, { backgroundColor: c.glass }]}>
            <Txt variant="caption" style={{ fontWeight: '600' }}>
              {badge}
            </Txt>
          </View>
        ) : null}
      </View>
      <View style={{ gap: 2 }}>
        <Txt variant="headline" numberOfLines={2}>
          {routine.title}
        </Txt>
        <Txt variant="footnote" tone="secondary" numberOfLines={1}>
          {stepCount(routine)} steps · {routine.totalTimeMin} min
        </Txt>
      </View>
    </PressableScale>
  );
}

/**
 * Hero look card (the one emphasized element on a screen): full photo, bottom scrim, serif title
 * and an optional pill action, all on the photo.
 */
export function LookHero({
  routine,
  eyebrow,
  meta,
  action,
  onPress,
  onAction,
  actionIcon = 'play',
  height = 380,
}: {
  actionIcon?: 'play' | 'bookmark';
  routine: Routine;
  eyebrow?: string;
  meta?: string;
  action?: string;
  onPress: () => void;
  onAction?: () => void;
  height?: number;
}) {
  const { c } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={`${eyebrow ? `${eyebrow}. ` : ''}${routine.title}. ${meta ?? routineMeta(routine)}`}
      scaleTo={0.985}
      style={[styles.hero, { height, backgroundColor: c.mediaTint }]}
    >
      <LookPhoto image={routineImage(routine)} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={scrimColors(c)} style={styles.heroScrim} />
      <View style={styles.heroText}>
        {eyebrow ? <Eyebrow onPhoto>{eyebrow}</Eyebrow> : null}
        <Txt variant="title2" style={{ color: c.inkOnPhoto }} numberOfLines={2}>
          {routine.title}
        </Txt>
        <View style={styles.heroRow}>
          <Txt variant="callout" style={{ color: c.inkOnPhoto, opacity: 0.92, flex: 1 }} numberOfLines={1}>
            {meta ?? routineMeta(routine)}
          </Txt>
          {action ? (
            <PressableScale
              onPress={onAction ?? onPress}
              accessibilityLabel={`${action} ${routine.title}`}
              style={[styles.heroPill, { backgroundColor: palette.blush }]}
            >
              <Icon name={actionIcon} size={14} color={palette.plum} filled />
              <Txt variant="subhead" style={{ color: palette.plum, fontWeight: '600' }}>
                {action}
              </Txt>
            </PressableScale>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

/** Row for lists: 64pt photo, title, meta; optional progress. Tonal row, no border. */
export function RoutineRow({
  routine,
  onPress,
  right,
  subtitle,
  progress,
  plain,
}: {
  routine: Routine;
  onPress: () => void;
  right?: ReactNode;
  subtitle?: string;
  progress?: number;
  /** No row fill (inside an already-tinted group). */
  plain?: boolean;
}) {
  const { c } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      accessibilityLabel={`${routine.title}. ${subtitle ?? routineMeta(routine)}`}
      style={[styles.row, !plain && { backgroundColor: c.surface, paddingHorizontal: space.m, borderRadius: radius.thumb }]}
    >
      <RoutineThumb routine={routine} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt variant="headline" numberOfLines={2}>
          {routine.title}
        </Txt>
        <Txt variant="footnote" tone="secondary" numberOfLines={1}>
          {subtitle ?? routineMeta(routine)}
        </Txt>
        {progress !== undefined ? <ProgressBar value={progress} style={{ marginTop: 2 }} /> : null}
      </View>
      {right ?? <Icon name="chevronRight" size={20} color={c.inkSecondary} />}
    </PressableScale>
  );
}

/** Settings-style list row (Ulta Account pattern). */
export function ListRow({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon?: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={onPress} disabled={!onPress} accessibilityLabel={value ? `${label}, ${value}` : label} style={styles.listRow} scaleTo={0.99}>
      {icon ? <Icon name={icon} size={22} color={danger ? c.danger : c.ink} /> : null}
      <Txt variant="body" tone={danger ? 'danger' : 'ink'} style={{ flex: 1 }}>
        {label}
      </Txt>
      {value ? (
        <Txt variant="callout" tone="secondary">
          {value}
        </Txt>
      ) : null}
      {onPress ? <Icon name="chevronRight" size={18} color={c.inkSecondary} /> : null}
    </PressableScale>
  );
}

export function ToggleRow({ label, body, value, onChange, disabled }: { label: string; body?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={styles.listRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="body">{label}</Txt>
        {body ? (
          <Txt variant="footnote" tone="secondary">
            {body}
          </Txt>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        disabled={disabled}
        onValueChange={(v) => {
          haptic.select();
          onChange(v);
        }}
        trackColor={{ false: c.track, true: c.primary }}
        thumbColor={c.surface}
        ios_backgroundColor={c.track}
        // react-native-web colors the knob with activeThumbColor
        {...({ activeThumbColor: c.surface } as object)}
      />
    </View>
  );
}

/** Ulta-style paged banner carousel with dots. */
export function Carousel<T>({ data, render, height = 196 }: { data: T[]; render: (item: T, width: number) => ReactNode; height?: number }) {
  const { width: screenW } = useWindowDimensions();
  const { c } = useTheme();
  const w = Math.min(screenW, layout.maxContentWidth) - space.xl * 2;
  const [index, setIndex] = useState(0);
  const ref = useRef<FlatList<T>>(null);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (w + space.m));
    if (i !== index) setIndex(i);
  };
  return (
    <View style={{ gap: space.m }}>
      <FlatList
        ref={ref}
        horizontal
        data={data}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <View style={{ width: w, height }}>{render(item, w)}</View>}
        ItemSeparatorComponent={() => <View style={{ width: space.m }} />}
        snapToInterval={w + space.m}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
      />
      {data.length > 1 ? (
        <View style={styles.dots} accessibilityLabel={`Slide ${index + 1} of ${data.length}`}>
          {data.map((_, i) => (
            <View key={i} style={[styles.dot, { borderColor: c.ink, backgroundColor: i === index ? c.ink : 'transparent' }]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Occasion tile: 3:4 photo with the label on a scrim. */
export function OccasionTile({ label, image, onPress, width = 112 }: { label: string; image: LookImage; onPress: () => void; width?: number }) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} style={{ width, height: Math.round((width * 4) / 3), borderRadius: radius.thumb, overflow: 'hidden' }}>
      <LookPhoto image={image} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={scrimColors(c)} style={[StyleSheet.absoluteFill, { top: '40%' }]} />
      <Txt variant="headline" style={{ position: 'absolute', left: space.m, right: space.m, bottom: space.m, color: c.inkOnPhoto }} numberOfLines={1}>
        {label}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 36,
    paddingHorizontal: space.l,
    borderRadius: radius.pill,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.l,
    padding: space.l,
    paddingVertical: space.xl,
    borderRadius: radius.card,
    minHeight: 76,
  },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.x4 },
  link: { minHeight: layout.tapMin, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: space.m, minHeight: 88 },
  photoBadge: { position: 'absolute', top: space.s, left: space.s, borderRadius: radius.pill, paddingHorizontal: space.s, paddingVertical: 3 },
  hero: { borderRadius: radius.card, overflow: 'hidden', borderCurve: 'continuous' },
  heroScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 240 },
  heroText: { position: 'absolute', left: space.xl, right: space.xl, bottom: space.xl, gap: 6 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: space.s },
  heroPill: { height: 44, paddingHorizontal: space.xl, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 6 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.l, minHeight: 56, paddingVertical: space.m },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.s },
  dot: { width: 7, height: 7, borderRadius: 4, borderWidth: 1 },
});
