/**
 * Rose design components (D-20). Built from the owner's rose reference UI and the
 * "Rose · Home hero" board: serif two-line hero, pill search, category circles,
 * gradient promo banner, look cards, frosted controls.
 */
import { useState, type ReactNode } from 'react';
import { Platform, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { Routine } from '@mago/shared';
import { useTheme } from '@/design/theme';
import { fonts, layout, radius, softShadow, space, type } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';
import { Icon, type IconName } from './Icon';
import { RoutineThumb } from './Bits';

/** Two-line serif hero: line 1 ink, line 2 rose (large text only — 3.8:1 is AA for 24pt+). */
export function SerifHero({ line1, line2, subtitle, style }: { line1: string; line2?: string; subtitle?: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={style}>
      <Txt variant="display" accessibilityRole="header">
        {line1}
        {line2 ? (
          <>
            {'\n'}
            <Txt variant="display" style={{ color: c.accentDisplay }}>
              {line2}
            </Txt>
          </>
        ) : null}
      </Txt>
      {subtitle ? (
        <Txt variant="footnote" tone="secondary" style={{ marginTop: space.s }}>
          {subtitle}
        </Txt>
      ) : null}
    </View>
  );
}

/** White 36px circle with soft shadow; 44pt hit area. Optional rose dot for "new". */
export function IconCircle({ icon, label, onPress, dot, tinted }: { icon: IconName; label: string; onPress: () => void; dot?: boolean; tinted?: boolean }) {
  const { c } = useTheme();
  return (
    <PressableScale accessibilityLabel={label} onPress={onPress} hitSlop={4} style={[styles.iconCircle, { backgroundColor: tinted ? c.tint : c.surface }, !tinted && softShadow(c)]}>
      <Icon name={icon} size={18} strokeWidth={1.6} color={tinted ? c.accentText : c.ink} />
      {dot ? <View style={[styles.dot, { backgroundColor: c.accent, borderColor: c.surface }]} /> : null}
    </PressableScale>
  );
}

/** Profile initial in a petal circle with a white ring. */
export function Avatar({ initial, onPress, label = 'Your profile' }: { initial: string; onPress: () => void; label?: string }) {
  const { c } = useTheme();
  return (
    <PressableScale accessibilityLabel={label} onPress={onPress} hitSlop={4} style={[styles.iconCircle, { backgroundColor: c.tint, borderWidth: 2, borderColor: c.surface }, softShadow(c)]}>
      <Txt style={{ fontFamily: fonts.serif, fontSize: 17, lineHeight: 20, color: c.accentText }}>{initial}</Txt>
    </PressableScale>
  );
}

/**
 * Pill search, 48px. Typing searches; a pasted YouTube/TikTok/Instagram link is routed to import.
 * The sliders button opens filters.
 */
export function SearchPill({
  placeholder,
  onSubmit,
  onFilters,
  value: controlled,
  onChangeText,
  autoFocus,
}: {
  placeholder: string;
  onSubmit?: (text: string) => void;
  onFilters?: () => void;
  value?: string;
  onChangeText?: (t: string) => void;
  autoFocus?: boolean;
}) {
  const { c } = useTheme();
  const [local, setLocal] = useState('');
  const value = controlled ?? local;
  return (
    <View style={[styles.search, { backgroundColor: c.surface }, softShadow(c)]}>
      <Icon name="search" size={18} color={c.inkSecondary} strokeWidth={1.6} />
      <TextInput
        value={value}
        onChangeText={(t) => {
          setLocal(t);
          onChangeText?.(t);
        }}
        onSubmitEditing={() => value.trim() && onSubmit?.(value.trim())}
        placeholder={placeholder}
        placeholderTextColor={c.inkSecondary}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        accessibilityLabel={placeholder}
        style={[styles.searchInput, { color: c.ink }]}
      />
      {onFilters ? <IconCircle icon="sliders" label="Filters" onPress={onFilters} tinted /> : null}
    </View>
  );
}

/** 56px circle with art inside, label below. Selected = rose ring with a blush gap. */
export function CategoryCircle({ label, selected, onPress, children }: { label: string; selected?: boolean; onPress: () => void; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={styles.catWrap}
    >
      <View style={[styles.catRing, { borderColor: selected ? c.accent : 'transparent' }]}>
        <View style={[styles.cat, { backgroundColor: c.tint }, !selected && softShadow(c)]}>{children}</View>
      </View>
      <Txt variant="caption" numberOfLines={1} style={{ color: selected ? c.ink : c.inkSecondary, fontFamily: selected ? fonts.sansSemibold : fonts.sansMedium }}>
        {label}
      </Txt>
    </PressableScale>
  );
}

/** Full-width 150px gradient banner: serif title, caption, small rose pill CTA, art bleeding off the right. */
export function PromoBanner({
  title,
  body,
  cta,
  onPress,
  art,
}: {
  title: string;
  body: string;
  cta: string;
  onPress: () => void;
  art?: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${title.replace('\n', ' ')}. ${body}. ${cta}`} scaleTo={0.985}>
      <LinearGradient colors={c.bannerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.banner, softShadow(c)]}>
        {art ? <View style={styles.bannerArt}>{art}</View> : null}
        <View style={styles.bannerText}>
          <Txt variant="title3" style={{ fontSize: 24, lineHeight: 26 }}>
            {title}
          </Txt>
          <Txt variant="footnote" style={{ marginTop: space.xs, color: c.ink, opacity: 0.78 }} numberOfLines={2}>
            {body}
          </Txt>
          <View style={[styles.pill, { backgroundColor: c.primary, marginTop: 'auto' }]}>
            <Txt variant="caption" style={{ color: c.inkOnPrimary, fontFamily: fonts.sansSemibold, fontSize: 12 }}>
              {cta}
            </Txt>
            <Icon name="chevronRight" size={12} color={c.inkOnPrimary} strokeWidth={2} />
          </View>
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

/** Small rose pill button (32px) for card actions. */
export function PillButton({ label, onPress, icon, variant = 'filled', style }: { label: string; onPress: () => void; icon?: IconName; variant?: 'filled' | 'tint'; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const filled = variant === 'filled';
  return (
    <PressableScale
      accessibilityLabel={label}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      hitSlop={6}
      style={[styles.pill, { backgroundColor: filled ? c.primary : c.tint, justifyContent: 'center' }, style]}
    >
      {icon ? <Icon name={icon} size={14} color={filled ? c.inkOnPrimary : c.accentText} strokeWidth={1.8} /> : null}
      <Txt variant="caption" style={{ color: filled ? c.inkOnPrimary : c.accentText, fontFamily: fonts.sansSemibold, fontSize: 12 }}>
        {label}
      </Txt>
    </PressableScale>
  );
}

/**
 * 2-column look card: art well with heart, creator caption, 2-line title, meta, full-width pill.
 * (The rose reference's product card, re-purposed for looks — Mago is not a shop.)
 */
export function LookCard({
  routine,
  width,
  saved,
  onOpen,
  onToggleSave,
  actionLabel,
  onAction,
}: {
  routine: Routine;
  width: number;
  saved: boolean;
  onOpen: () => void;
  onToggleSave: () => void;
  actionLabel: string;
  onAction: () => void;
}) {
  const { c } = useTheme();
  const steps = routine.sections.reduce((n, s) => n + s.steps.length, 0);
  return (
    <View style={[styles.lookCard, { width, backgroundColor: c.surface }, softShadow(c)]}>
      <PressableScale onPress={onOpen} accessibilityLabel={`${routine.title}. ${steps} steps, about ${routine.totalTimeMin} minutes`} scaleTo={0.985} style={{ gap: space.s }}>
        <View>
          <RoutineThumb routine={routine} size={Math.round(width * 0.82)} wide />
          <PressableScale
            accessibilityLabel={saved ? 'Saved to your library' : 'Save to your library'}
            accessibilityState={{ selected: saved }}
            onPress={() => {
              haptic.select();
              onToggleSave();
            }}
            hitSlop={8}
            style={[styles.heart, { backgroundColor: c.surface }, softShadow(c)]}
          >
            <Icon name="heart" size={15} filled={saved} color={saved ? c.accent : c.ink} strokeWidth={1.7} />
          </PressableScale>
        </View>
        <View style={{ gap: 2, paddingHorizontal: 2 }}>
          <Txt variant="caption" tone="secondary" numberOfLines={1}>
            {routine.category === 'Face/Base' ? 'Face' : routine.category} · {routine.creator?.name ?? 'Mago'}
          </Txt>
          <Txt variant="footnote" numberOfLines={2} style={{ fontFamily: fonts.sansSemibold, minHeight: 36 }}>
            {routine.title}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="clock" size={12} color={c.inkSecondary} />
            <Txt variant="caption" tone="secondary">
              {steps} steps · {routine.totalTimeMin} min
            </Txt>
          </View>
        </View>
      </PressableScale>
      <PillButton label={actionLabel} onPress={onAction} style={{ marginTop: space.s, alignSelf: 'stretch' }} />
    </View>
  );
}

/** Frosted circular control for use over imagery (blur + 28% plum-ink tint so the white icon keeps ≥ 3:1), optional label below. */
export function FrostedIconButton({ icon, label, onPress, showLabel, selected, size = layout.tapMin }: { icon: IconName; label: string; onPress: () => void; showLabel?: boolean; selected?: boolean; size?: number }) {
  const { c } = useTheme();
  return (
    <PressableScale accessibilityLabel={label} accessibilityState={{ selected: !!selected }} onPress={onPress} style={{ alignItems: 'center', gap: 4 }}>
      <View style={[styles.frost, { width: size, height: size, borderRadius: size / 2 }]}>
        {Platform.OS !== 'android' ? <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} /> : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: selected ? c.primary : 'rgba(42,30,29,0.28)' }]} />
        <Icon name={icon} size={20} color="#FFFFFF" strokeWidth={1.7} />
      </View>
      {showLabel ? (
        <Txt variant="tab" style={{ color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 4 }}>
          {label}
        </Txt>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  iconCircle: { width: layout.iconButton, height: layout.iconButton, borderRadius: layout.iconButton / 2, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
  search: { height: layout.searchHeight, borderRadius: layout.searchHeight / 2, flexDirection: 'row', alignItems: 'center', gap: space.s, paddingLeft: space.l, paddingRight: 6 },
  searchInput: { flex: 1, minWidth: 0, height: 44, ...type.footnote, fontSize: 14, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  catWrap: { alignItems: 'center', gap: 6, width: 64 },
  catRing: { padding: 2, borderRadius: 32, borderWidth: 2 },
  cat: { width: layout.categoryCircle - 4, height: layout.categoryCircle - 4, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  banner: { height: 150, borderRadius: radius.card, overflow: 'hidden' },
  bannerArt: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '52%', alignItems: 'center', justifyContent: 'center' },
  bannerText: { flex: 1, padding: 18, width: '58%' },
  pill: { height: layout.pillSmall, borderRadius: layout.pillSmall / 2, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  lookCard: { borderRadius: radius.card, padding: space.s, paddingBottom: space.m },
  heart: { position: 'absolute', top: space.s, right: space.s, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  frost: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.45)' },
});
