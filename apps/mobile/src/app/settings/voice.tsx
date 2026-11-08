import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { pickReadAloudVoice, voiceLabel, VOICE_STYLES, type VoiceInfo, type VoiceStyle } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Card, Hairline } from '@/components/Surface';
import { Chip, ToggleRow } from '@/components/Bits';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton, StateView } from '@/components/States';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { usePrefs } from '@/data/prefs';
import { femaleVoices, loadVoices, speak, stopSpeaking } from '@/services/voice';

const SAMPLE = 'Sweep a soft brown shade into your crease with small circles.';

/** Read-aloud voice: female English voices on this device, best first, with a preview. */
export default function VoiceSettings() {
  const { c } = useTheme();
  const readAloud = usePrefs((s) => s.readAloud);
  const voiceId = usePrefs((s) => s.voiceId);
  const set = usePrefs((s) => s.set);
  const voiceStyle = usePrefs((s) => s.voiceStyle);
  const [voices, setVoices] = useState<VoiceInfo[] | null>(null);
  const [auto, setAuto] = useState<VoiceInfo | undefined>();

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [list, all] = await Promise.all([femaleVoices(), loadVoices()]);
      if (!alive) return;
      setVoices(list);
      setAuto(pickReadAloudVoice(all));
    })();
    return () => {
      alive = false;
      stopSpeaking();
    };
  }, []);

  function choose(id: string | null) {
    haptic.select();
    set({ voiceId: id });
    speak(SAMPLE, undefined, id ?? auto?.identifier);
  }

  return (
    <Screen header={<TopBar title="Read-aloud voice" />}>
      <Card style={{ marginTop: space.l, paddingVertical: space.xs }}>
        <ToggleRow label="Read each step aloud" body="During Follow-Along" value={readAloud} onChange={(v) => set({ readAloud: v })} />
      </Card>

      <Txt variant="title3" style={{ marginTop: space.xl }}>
        How she sounds
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.m }} accessibilityRole="radiogroup">
        {(Object.keys(VOICE_STYLES) as VoiceStyle[]).map((k) => (
          <Chip
            key={k}
            label={VOICE_STYLES[k].label}
            selected={voiceStyle === k}
            onPress={() => {
              set({ voiceStyle: k });
              speak(SAMPLE, undefined, voiceId ?? auto?.identifier, k);
            }}
          />
        ))}
      </View>

      <Txt variant="title3" style={{ marginTop: space.xl }}>
        Voice
      </Txt>
      <Txt variant="callout" tone="secondary" style={{ marginTop: space.s }}>
        Tap a voice to hear it. Premium and Enhanced voices sound the most natural — on iPhone and iPad you can download more in Settings → Accessibility → Spoken Content → Voices → English.
      </Txt>

      {voices === null ? (
        <View style={{ gap: space.m, marginTop: space.l }}>
          <Skeleton height={20} width="70%" />
          <Skeleton height={20} width="60%" />
          <Skeleton height={20} width="75%" />
        </View>
      ) : voices.length === 0 ? (
        <StateView icon="speaker" title="No English voices found" body="Your device will use its default voice. You can add voices in your device’s accessibility settings." />
      ) : (
        <Card style={{ marginTop: space.l, paddingVertical: space.xs }} accessibilityRole="radiogroup">
          <Row
            label="Automatic"
            body={auto ? `Recommended: ${voiceLabel(auto)}` : 'Best voice on this device'}
            selected={!voiceId}
            onPress={() => choose(null)}
          />
          {voices.map((v) => (
            <View key={v.identifier}>
              <Hairline />
              <Row label={voiceLabel(v)} selected={voiceId === v.identifier} onPress={() => choose(v.identifier)} />
            </View>
          ))}
        </Card>
      )}
      <View style={{ flexDirection: 'row', gap: space.s, alignItems: 'center', marginTop: space.l }}>
        <Icon name="info" size={16} color={c.inkSecondary} />
        <Txt variant="footnote" tone="secondary" style={{ flex: 1 }}>
          Voices come from your device, so the list differs between phones, tablets and browsers.
        </Txt>
      </View>
    </Screen>
  );
}

function Row({ label, body, selected, onPress }: { label: string; body?: string; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressableScale accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={label} onPress={onPress} scaleTo={0.99} style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="body">{label}</Txt>
        {body ? (
          <Txt variant="footnote" tone="secondary">
            {body}
          </Txt>
        ) : null}
      </View>
      <View style={[styles.radio, { borderColor: selected ? c.primary : c.hairlineStrong, backgroundColor: selected ? c.primary : 'transparent' }]}>
        {selected ? <Icon name="check" size={14} color={c.inkOnPrimary} strokeWidth={2.4} /> : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.l, minHeight: 56, paddingVertical: space.m },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
