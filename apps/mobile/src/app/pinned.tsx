import { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { StateView } from '@/components/States';
import { PinnedRow } from '@/components/LookActions';
import { space } from '@/design/tokens';
import { pinnedLooks, useLibrary } from '@/data/library';

/** FR-PIN "See all": every pinned look, newest pin first, with routine time and last tried. */
export default function Pinned() {
  const router = useRouter();
  const items = useLibrary((s) => s.items);
  const pinned = useMemo(() => pinnedLooks(items), [items]);
  return (
    <Screen header={<TopBar title="You and your beauty" />}>
      {pinned.length === 0 ? (
        <StateView icon="pin" title="Nothing pinned yet" body="Open a look you love and tap the pin to keep it at the top of Home." actionLabel="Open your looks" onAction={() => router.replace('/(tabs)/library')} />
      ) : (
        <>
          <Txt variant="footnote" tone="secondary" style={{ marginTop: space.l }}>
            {pinned.length} pinned · long-press a look to unpin it
          </Txt>
          <View style={{ gap: space.s, marginTop: space.m, marginBottom: space.xxl }}>
            {pinned.map((x) => (
              <PinnedRow key={x.routine.id} saved={x} onPress={() => router.push(`/routine/${x.routine.id}`)} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
