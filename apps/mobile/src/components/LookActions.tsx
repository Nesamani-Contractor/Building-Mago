import { AccessibilityInfo, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Routine } from '@mago/shared';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { RoutineThumb, RoutineTile } from '@/components/Bits';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { useLibrary, type SavedRoutine } from '@/data/library';
import { useGreeting, lastTriedLabel } from '@/lib/hooks';
import { track } from '@/services/analytics';

/**
 * FR-FAV: the heart that sits on every routine. One tap = Favorite (saves a Discover sample to her
 * library first); tap again to remove. Same state everywhere because it reads the library store.
 */
export function HeartButton({ routine, onPhoto, size = 22, style }: { routine: Routine; onPhoto?: boolean; size?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const fav = useLibrary((s) => !!s.items[routine.id]?.favorite);
  const lib = useLibrary.getState;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: fav }}
      accessibilityLabel={fav ? `Remove ${routine.title} from Favorites` : `Add ${routine.title} to Favorites`}
      hitSlop={6}
      onPress={() => {
        lib().ensureSaved(routine);
        lib().toggleFavorite(routine.id);
        haptic.select();
        track(fav ? 'routine_unfavorited' : 'routine_favorited', {});
        AccessibilityInfo.announceForAccessibility(fav ? 'Removed from Favorites' : 'Added to Favorites');
      }}
      style={[styles.round, onPhoto && { backgroundColor: c.glass }, style]}
    >
      <Icon name="heart" size={size} color={fav ? c.primary : onPhoto ? c.ink : c.inkSecondary} filled={fav} />
    </PressableScale>
  );
}

/** FR-PIN: pin / unpin a look to "You and your beauty". */
export function PinButton({ routine, onPhoto, size = 22, style }: { routine: Routine; onPhoto?: boolean; size?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const pinned = useLibrary((s) => !!s.items[routine.id]?.pinned);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: pinned }}
      accessibilityLabel={pinned ? `Unpin ${routine.title}` : `Pin ${routine.title} to You and your beauty`}
      hitSlop={6}
      onPress={() => {
        const lib = useLibrary.getState();
        lib.ensureSaved(routine);
        lib.togglePinned(routine.id);
        haptic.select();
        track(pinned ? 'routine_unpinned' : 'routine_pinned', {});
        AccessibilityInfo.announceForAccessibility(pinned ? 'Unpinned' : 'Pinned to You and your beauty');
      }}
      style={[styles.round, onPhoto && { backgroundColor: c.glass }, style]}
    >
      <Icon name="pin" size={size} color={pinned ? c.primary : onPhoto ? c.ink : c.inkSecondary} filled={pinned} />
    </PressableScale>
  );
}

/** FR-GRT: "Good evening, Maya" — the first line of every main tab screen. */
export function Greeting({ style, onPhoto }: { style?: StyleProp<ViewStyle>; onPhoto?: boolean }) {
  const hello = useGreeting();
  const { c } = useTheme();
  return (
    <View style={style}>
      <Txt variant="callout" tone={onPhoto ? undefined : 'secondary'} style={onPhoto ? { color: c.inkOnPhoto } : undefined} accessibilityRole="text">
        {hello}
      </Txt>
    </View>
  );
}

/** FR-PIN card: photo, title, routine time, last tried, heart. Long-press to unpin. */
export function PinnedRow({ saved, onPress }: { saved: SavedRoutine; onPress: () => void }) {
  const { c } = useTheme();
  const r = saved.routine;
  const tried = lastTriedLabel(saved.lastDoneAt);
  return (
    <View style={[styles.row, { backgroundColor: c.surface }]}>
      <PressableScale
        onPress={onPress}
        onLongPress={() => {
          useLibrary.getState().togglePinned(r.id);
          haptic.select();
          AccessibilityInfo.announceForAccessibility('Unpinned');
        }}
        scaleTo={0.985}
        accessibilityLabel={`${r.title}. ${r.totalTimeMin} minutes. ${tried}.`}
        accessibilityHint="Opens the look. Long-press to unpin."
        style={styles.rowMain}
      >
        <RoutineThumb routine={r} />
        <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
          <Txt variant="headline" numberOfLines={1}>
            {r.title}
          </Txt>
          <View style={styles.meta}>
            <Icon name="clock" size={14} color={c.inkSecondary} />
            <Txt variant="footnote" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
              {r.totalTimeMin} min
            </Txt>
            <Txt variant="footnote" tone="secondary">
              ·
            </Txt>
            <Txt variant="footnote" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
              {tried}
            </Txt>
          </View>
        </View>
      </PressableScale>
      <HeartButton routine={r} />
    </View>
  );
}

const styles = StyleSheet.create({
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingLeft: space.m, paddingRight: space.xs, paddingVertical: space.s, borderRadius: radius.thumb },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 64 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});

/** A look tile (photo + title) with the Favorite heart on the photo (FR-FAV). */
export function LookTile({ routine, onPress, width = 150, badge }: { routine: Routine; onPress: () => void; width?: number; badge?: string }) {
  return (
    <View style={{ width }}>
      <RoutineTile routine={routine} onPress={onPress} width={width} badge={badge} />
      <HeartButton routine={routine} onPhoto size={20} style={tileStyles.heart} />
    </View>
  );
}

const tileStyles = StyleSheet.create({
  heart: { position: 'absolute', right: 6, top: 6 },
});
