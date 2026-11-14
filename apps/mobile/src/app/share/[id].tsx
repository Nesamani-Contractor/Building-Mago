import { useState } from 'react';
import { Share, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Chip, ToggleRow, stepCount } from '@/components/Bits';
import { Card } from '@/components/Surface';
import { useTheme } from '@/design/theme';
import { fonts, palette, radius, space } from '@/design/tokens';
import { useRoutine } from '@/lib/routines';
import { useSessions } from '@/data/sessions';
import { useProfile } from '@/data/profile';
import { config } from '@/services/config';
import { track } from '@/services/analytics';

/** S-18 Share card composer: 9:16 and 1:1. Photos included only when she turns them on. */
export default function ShareCard() {
  const { id, session: sessionId } = useLocalSearchParams<{ id: string; session?: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const routine = useRoutine(id);
  const session = useSessions((s) => (sessionId ? s.sessions[sessionId] : undefined));
  const code = useProfile((s) => s.referralCode);
  const [format, setFormat] = useState<'story' | 'square'>('story');
  const [withPhoto, setWithPhoto] = useState(false);
  const link = `${config.referralBaseUrl}${code}`;
  const [caption, setCaption] = useState(routine ? `Did “${routine.title}” with Mago ✨ Get the steps: ${link}` : '');

  if (!routine) return null;
  const photo = session?.afterPhoto;

  async function share() {
    track('share_card_exported', { format, with_photo: withPhoto && !!photo });
    // The full build renders this card to an image (react-native-view-shot) and shares the file.
    await Share.share({ message: caption });
    router.back();
  }

  return (
    <Screen header={<TopBar title="Share card" backIcon="close" backLabel="Close" />} footer={<Button label="Share" icon="share" onPress={share} />}>
      <View style={styles.formats}>
        <Chip label="Story 9:16" selected={format === 'story'} onPress={() => setFormat('story')} />
        <Chip label="Square 1:1" selected={format === 'square'} onPress={() => setFormat('square')} />
      </View>

      <View style={[styles.card, { aspectRatio: format === 'story' ? 9 / 16 : 1, width: format === 'story' ? '72%' : '100%' }]} accessibilityLabel={`Preview of share card for ${routine.title}`}>
        <LinearGradient colors={[palette.champagne, palette.peach, palette.rose]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {withPhoto && photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        <View style={styles.cardInner}>
          <Txt variant="caption" style={{ color: palette.plum, letterSpacing: 2 }}>
            MAGO
          </Txt>
          <View style={[styles.panel, { backgroundColor: 'rgba(251,247,244,0.86)' }]}>
            <Txt variant={format === 'story' ? 'title2' : 'title1'} style={{ color: palette.plum }}>
              {routine.title}
            </Txt>
            <Txt variant="footnote" style={{ color: palette.inkSecondary }}>
              {stepCount(routine)} steps · {routine.totalTimeMin} min
            </Txt>
          </View>
        </View>
      </View>

      <Card style={{ marginTop: space.xl, gap: space.s }}>
        <ToggleRow label="Include my after photo" body={photo ? 'Only shared when you tap Share.' : 'Take an after photo next time to add it.'} value={withPhoto && !!photo} onChange={setWithPhoto} disabled={!photo} />
        <Txt variant="footnote" tone="secondary">
          Caption
        </Txt>
        <TextInput value={caption} onChangeText={setCaption} multiline accessibilityLabel="Caption" style={[styles.caption, { color: c.ink, borderColor: 'transparent', backgroundColor: c.surfaceAlt }]} />
        <Txt variant="footnote" tone="secondary">
          Your invite link is included. When a friend installs Mago and finishes a look, you both get a month of Pro.
        </Txt>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  formats: { flexDirection: 'row', gap: space.s, marginTop: space.l, justifyContent: 'center' },
  card: { alignSelf: 'center', borderRadius: radius.card, overflow: 'hidden', marginTop: space.xl },
  cardInner: { flex: 1, justifyContent: 'space-between', padding: space.xl },
  panel: { borderRadius: radius.thumb, padding: space.l, gap: space.xs },
  caption: { borderWidth: 1, borderRadius: radius.chip, minHeight: 80, padding: space.m, fontFamily: fonts.sans, fontSize: 15, textAlignVertical: 'top' },
});
