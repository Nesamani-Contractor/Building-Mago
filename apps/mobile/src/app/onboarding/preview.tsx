import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Routine } from '@mago/shared';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { RoutineRow } from '@/components/Bits';
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
    <Screen mood="reveal" footer={<Button variant="hero" label="Try my first look" onPress={() => finish(starters[0]?.id)} />}>
      <View style={{ gap: space.m, marginTop: space.x4 }}>
        <Txt variant="title1" accessibilityRole="header">
          Your first looks are ready
        </Txt>
        <Txt variant="body" tone="secondary">
          Picked for you. Start one now, or save your own from {app}.
        </Txt>
      </View>

      <Card style={{ marginTop: space.xxl, paddingVertical: space.s }}>
        {starters.map((r, i) => (
          <View key={r.id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: c.hairline } : undefined}>
            <RoutineRow routine={r} onPress={() => finish(r.id)} />
          </View>
        ))}
      </Card>

      <Card variant="outline" style={{ marginTop: space.l, gap: space.m }}>
        <Txt variant="headline">Save looks from {app}</Txt>
        <View style={styles.flow}>
          <View style={styles.flowStep}>
            <Icon name="play" size={22} />
            <Txt variant="footnote" align="center">
              Open a tutorial in {app}
            </Txt>
          </View>
          <Icon name="chevronRight" size={16} color={c.inkSecondary} />
          <View style={styles.flowStep}>
            <Icon name="share" size={22} />
            <Txt variant="footnote" align="center">
              Tap Share
            </Txt>
          </View>
          <Icon name="chevronRight" size={16} color={c.inkSecondary} />
          <View style={styles.flowStep}>
            <Icon name="sparkle" size={22} />
            <Txt variant="footnote" align="center">
              Choose Mago
            </Txt>
          </View>
        </View>
      </Card>

      <Button variant="ghost" label="Go to Today" onPress={() => finish()} style={{ marginTop: space.l }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s },
  flowStep: { flex: 1, alignItems: 'center', gap: space.s },
});
