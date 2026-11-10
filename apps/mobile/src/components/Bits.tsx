import { useRef, useState, type ReactNode } from 'react';
import {
  FlatList,
  StyleSheet,
  Switch,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import type { Category, Routine } from '@mago/shared';
import { useTheme } from '@/design/theme';
import { fonts, layout, palette, radius, softShadow, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';
import { Icon, type IconName } from './Icon';
import { ProductArt } from './ProductArt';

/** Selectable chip (filters, onboarding answers). Selected = rose fill, white text; else white with hairline. */
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
      style={[
        styles.chip,
        { borderColor: selected ? c.primary : c.hairlineStrong, backgroundColor: selected ? c.primary : c.surface },
      ]}
    >
      {icon ? <Icon name={icon} size={18} color={selected ? c.inkOnPrimary : c.ink} /> : null}
      <Txt variant="subhead" style={{ color: selected ? c.inkOnPrimary : c.ink }}>
        {label}
      </Txt>
    </PressableScale>
  );
}

/** Big tappable answer card (onboarding). */
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
        { backgroundColor: c.surface, borderColor: selected ? c.accent : 'transparent', borderWidth: 1.5 },
        softShadow(c),
      ]}
    >
      <View style={[styles.choiceIcon, { backgroundColor: c.tint }]}>
        <Icon name={icon} size={22} color={c.accentText} />
      </View>
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

export function SectionHeader({ title, action, onAction, chevron }: { title: string; action?: string; onAction?: () => void; chevron?: boolean }) {
  const { c } = useTheme();
  const titleEl = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <Txt variant="headline" accessibilityRole="header">
        {title}
      </Txt>
      {chevron ? <Icon name="chevronRight" size={16} strokeWidth={1.8} /> : null}
    </View>
  );
  return (
    <View style={styles.sectionHeader}>
      {chevron && onAction ? (
        <PressableScale onPress={onAction} accessibilityLabel={`${title}, see all`} style={styles.link}>
          {titleEl}
        </PressableScale>
      ) : (
        titleEl
      )}
      {action && onAction ? (
        <PressableScale onPress={onAction} accessibilityLabel={action} style={styles.link}>
          <Txt variant="footnote" style={{ color: c.accentText, fontFamily: fonts.sansSemibold }}>
            {action}
          </Txt>
        </PressableScale>
      ) : null}
    </View>
  );
}

/** Weekly streak ring — one of three places a full-strength gradient is allowed. */
export function StreakRing({ done, goal, size = 64 }: { done: number; goal: number; size?: number }) {
  const { c } = useTheme();
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const frac = Math.min(1, goal > 0 ? done / goal : 0);
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`${done} of ${goal} looks this week`} accessibilityRole="image">
    <Svg width={size} height={size}>
      <Defs>
        <SvgGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={palette.bannerB} />
          <Stop offset="1" stopColor={palette.rose} />
        </SvgGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.tint} strokeWidth={6} fill="none" />
      {frac > 0 ? (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={6}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circ * frac} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ) : null}
      <SvgText x={size / 2} y={size / 2 + 6} textAnchor="middle" fontSize={size * 0.28} fontFamily={fonts.serif} fill={c.ink}>
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
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: 3, backgroundColor: c.accent }} />
    </View>
  );
}

const CATEGORY_ICON: Record<Category, IconName> = {
  Eyes: 'sparkle',
  Lips: 'heart',
  'Face/Base': 'star',
  Brows: 'pencil',
  'Full look': 'wand',
  Skincare: 'cloud',
  Hair: 'star',
  Other: 'bookmark',
};

/**
 * Routine artwork. Real thumbnails come from the source in production. In demo mode: a blush
 * "flat-lay" — the look's own products drawn in their shades on a soft rose gradient
 * (illustrations of product types, never a brand's product photo).
 */
export function RoutineThumb({ routine, size = 56, wide }: { routine: Routine; size?: number; wide?: boolean }) {
  const { isDark } = useTheme();
  const tones: Record<string, readonly [string, string]> = {
    Lips: [palette.bannerA, palette.bannerB],
    Eyes: [palette.blushTop, palette.bannerA],
    Skincare: [palette.blush, palette.petal],
    Brows: [palette.petal, palette.blushMid],
    'Full look': [palette.blushMid, palette.bannerB],
  };
  const [a, b] = tones[routine.category] ?? [palette.blushTop, palette.blushMid];
  const items = routine.products.slice(0, size >= 96 ? 3 : 1);
  const art = size >= 96 ? size * 0.46 : size * 0.78;
  return (
    <LinearGradient
      colors={isDark ? ['#3A2828', '#2A1C1C'] : [a, b]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: wide ? '100%' : size,
        height: size,
        borderRadius: radius.thumb,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        overflow: 'hidden',
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {items.length === 0 ? (
        <Icon name={CATEGORY_ICON[routine.category]} size={Math.min(28, size * 0.4)} color={palette.roseText} />
      ) : (
        items.map((p, i) => (
          <View
            key={p.ref}
            style={{
              marginLeft: i === 0 ? 0 : -art * 0.28,
              transform: [{ rotate: items.length > 1 ? `${(i - 1) * 12}deg` : '-8deg' }, { translateY: i === 1 ? -art * 0.06 : art * 0.04 }],
            }}
          >
            <ProductArt product={p} size={art} bare />
          </View>
        ))
      )}
    </LinearGradient>
  );
}

export function stepCount(r: Routine): number {
  return r.sections.reduce((n, s) => n + s.steps.length, 0);
}

export function routineMeta(r: Routine): string {
  const level = r.difficulty === 'easy' ? 'Easy' : r.difficulty === 'medium' ? 'Medium' : 'Advanced';
  return `${stepCount(r)} steps · about ${r.totalTimeMin} min · ${level}`;
}

/** Rail tile: rounded art on top, 12pt semibold title, caption below (rose "Trending" card). */
export function RoutineTile({ routine, onPress, width = 140, badge }: { routine: Routine; onPress: () => void; width?: number; badge?: string }) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${routine.title}. ${routineMeta(routine)}`} style={{ width, gap: space.s }}>
      <View>
        <RoutineThumb routine={routine} size={width} wide />
        {badge ? (
          <View style={{ position: 'absolute', top: space.s, left: space.s }}>
            <BadgeLight label={badge} />
          </View>
        ) : null}
      </View>
      <View style={{ gap: 1 }}>
        <Txt variant="footnote" numberOfLines={2} style={{ fontFamily: fonts.sansSemibold }}>
          {routine.title}
        </Txt>
        <Txt variant="caption" tone="secondary" numberOfLines={1}>
          {stepCount(routine)} steps · {routine.totalTimeMin} min
        </Txt>
      </View>
    </PressableScale>
  );
}

function BadgeLight({ label }: { label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.pill, paddingHorizontal: space.s, paddingVertical: 2 }}>
      <Txt variant="caption" style={{ color: c.accentText }}>{label}</Txt>
    </View>
  );
}

/** Row card for lists. */
export function RoutineRow({ routine, onPress, right, subtitle }: { routine: Routine; onPress: () => void; right?: ReactNode; subtitle?: string }) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${routine.title}. ${subtitle ?? routineMeta(routine)}`} style={styles.row}>
      <RoutineThumb routine={routine} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="headline" numberOfLines={2}>
          {routine.title}
        </Txt>
        <Txt variant="footnote" tone="secondary" numberOfLines={1}>
          {subtitle ?? routineMeta(routine)}
        </Txt>
      </View>
      {right ?? <Icon name="chevronRight" size={18} />}
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
            <View key={i} style={[styles.dot, { width: i === index ? 18 : 6, backgroundColor: i === index ? c.accent : c.tintStrong }]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Ulta "deal circles" pattern, used for occasions. */
export function CircleTile({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} style={{ alignItems: 'center', gap: space.s, width: 76 }}>
      <View style={[styles.circle, { backgroundColor: c.tint }, softShadow(c)]}>
        <Icon name={icon} size={24} color={c.accentText} />
      </View>
      <Txt variant="caption" tone="secondary" align="center" numberOfLines={1}>
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
    minHeight: layout.tapMin - 4,
    paddingHorizontal: space.l,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.l,
    padding: space.l,
    borderRadius: radius.card,
    minHeight: 72,
  },
  choiceIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.xxl },
  link: { minHeight: layout.tapMin, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.l, paddingVertical: space.m, minHeight: 72 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.l, minHeight: 56, paddingVertical: space.m },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  circle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
