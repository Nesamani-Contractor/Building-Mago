import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Routine } from '@mago/shared';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { RoutineTile, Eyebrow } from '@/components/Bits';
import { Icon } from '@/components/Icon';
import { space } from '@/design/tokens';
import { useTheme } from '@/design/theme';
import { useProfile, type SourceApp } from '@/data/profile';
import { useLibrary } from '@/data/library';
import { startersFor } from '@/lib/routines';
import { track } from '@/services/analytics';

function shareSteps(sources: SourceApp[]): string {
  const app = sources.find((s) => s === 'tiktok' || s === 'instagram' || s === 'youtube');
  const name = app === 'tiktok' ? 'TikTok' : app === 'instagram' ? 'Instagram' : 'YouTube';
  return name;
}

/** S-07 Personalised preview — first "aha". */
export default function Preview() {
  const router = useRouter();
  const { c } = useTheme();
  const goal = useProfile((s) => s.goal);
  const sources = useProfile((s) => s.sources);
  const set = useProfile((s) => s.set);
  const save = useLibrary((s) => s.save);
  const starters = useMemo(() => startersFor(goal), [goal]);
  const app = shareSteps(sources);

  useEffect(() => {
    track('onb_preview_viewed');
  }, []);

  function finish(openId?: string) {
    set({ onboarded: true });
    track('onb_completed');
    router.replace('/(tabs)');
    if (openId) {
      save(starters.find((r) => r.id === openId) as Routine);
      setTimeout(() => router.push(`/routine/${openId}`), 50);
    }
  }

  return (
    <Screen
      mood="warm"
      footer={
        <View style={{ gap: space.xs }}>
          <Button label="Try my first look" onPress={() => finish(starters[0]?.id)} />
          <Button variant="ghost" label="Go to Today" onPress={() => finish()} />
        </View>
      }
    >
      <View style={{ gap: space.s, marginTop: space.x4 }}>
        <Eyebrow>Picked for you</Eyebrow>
        <Txt variant="title1" accessibilityRole="header">
          Your first looks are ready
        </Txt>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -space.xl, marginTop: space.xxl }}
        contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.m }}
      >
        {starters.map((r) => (
          <RoutineTile key={r.id} routine={r} width={200} onPress={() => finish(r.id)} />
        ))}
      </ScrollView>

      <View style={styles.tip}>
        <Icon name="share" size={18} color={c.inkSecondary} />
        <Txt variant="callout" tone="secondary" style={{ flex: 1 }}>
          To save your own, tap Share in {app} and choose Mago.
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tip: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: space.xxl },
});
