import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { layout, radius, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { useScanDraft } from '@/data/bag';
import { photoData } from '@/services/photoData';

/** Scan products: take several photos in a row, or pick photos you already have. */
export default function Scan() {
  const router = useRouter();
  const { c } = useTheme();
  const [perm, request] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [mode, setMode] = useState<'choose' | 'camera'>('choose');
  const [shots, setShots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const setPhotos = useScanDraft((s) => s.setPhotos);

  function finish(list: string[]) {
    if (list.length === 0) return;
    setPhotos(list);
    router.replace('/bag/review');
  }

  async function pick() {
    const res = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: true, copyToCacheDirectory: true });
    if (res.canceled) return;
    finish(res.assets.map((a) => a.uri));
  }

  async function shoot() {
    if (!cam.current) return;
    setBusy(true);
    try {
      const pic = await cam.current.takePictureAsync({ quality: 0.6, base64: true });
      if (pic.base64) photoData.set(pic.uri, pic.base64);
      haptic.select();
      setShots((s) => [...s, pic.uri]);
    } catch {
      setCameraFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'camera' && perm?.granted && !cameraFailed) {
    return (
      <View style={[styles.fill, { backgroundColor: '#000' }]}>
        <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="back" onMountError={() => setCameraFailed(true)} />
        <View style={styles.camTop}>
          <PressableScale accessibilityLabel="Close camera" onPress={() => setMode('choose')} style={[styles.round, { backgroundColor: c.glass }]}>
            <Icon name="close" size={20} />
          </PressableScale>
          <View style={[styles.tip, { backgroundColor: c.glass }]}>
            <Txt variant="footnote">One product per photo · label facing you</Txt>
          </View>
        </View>
        <View style={styles.camBottom}>
          <ScrollView horizontal contentContainerStyle={{ gap: space.s, paddingHorizontal: space.l }} showsHorizontalScrollIndicator={false}>
            {shots.map((u) => (
              <Image key={u} source={{ uri: u }} style={styles.shot} contentFit="cover" accessibilityLabel="Photo taken" />
            ))}
          </ScrollView>
          <View style={styles.camControls}>
            <View style={{ width: 96 }} />
            <PressableScale accessibilityLabel="Take photo" onPress={shoot} disabled={busy} style={[styles.shutter, { borderColor: '#FFFFFF' }]}>
              <View style={styles.shutterInner} />
            </PressableScale>
            <PressableScale
              accessibilityLabel={`Done, ${shots.length} photos`}
              disabled={shots.length === 0}
              onPress={() => finish(shots)}
              style={[styles.done, { backgroundColor: shots.length ? c.surface : c.glass }]}
            >
              <Txt variant="subhead">Done{shots.length ? ` (${shots.length})` : ''}</Txt>
            </PressableScale>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Screen mood="warm" header={<TopBar title="Scan products" backIcon="close" backLabel="Close" />}>
      <Txt variant="title2" style={{ marginTop: space.l }}>
        Add what you own
      </Txt>
      <Txt variant="callout" tone="secondary" style={{ marginTop: space.s }}>
        Take one photo per product, or several in a row. Mago reads each one and you confirm before anything is saved.
      </Txt>

      <PressableScale
        accessibilityLabel="Take photos with the camera"
        onPress={async () => {
          if (!perm?.granted) {
            const r = await request();
            if (!r.granted) return;
          }
          setMode('camera');
        }}
        style={{ marginTop: space.xxl }}
      >
        <Card style={styles.option}>
          <View style={[styles.optIcon, { borderColor: 'transparent', backgroundColor: c.surfaceAlt }]}>
            <Icon name="camera" size={26} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="headline">Take photos</Txt>
            <Txt variant="footnote" tone="secondary">
              Snap your products one after another
            </Txt>
          </View>
          <Icon name="chevronRight" size={18} />
        </Card>
      </PressableScale>
      {cameraFailed ? (
        <Txt variant="footnote" tone="danger" style={{ marginTop: space.s }}>
          The camera isn’t available here. Choose photos instead.
        </Txt>
      ) : null}

      <PressableScale accessibilityLabel="Choose photos you already have" onPress={pick} style={{ marginTop: space.m }}>
        <Card style={styles.option}>
          <View style={[styles.optIcon, { borderColor: 'transparent', backgroundColor: c.surfaceAlt }]}>
            <Icon name="upload" size={26} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="headline">Choose photos</Txt>
            <Txt variant="footnote" tone="secondary">
              Pick one or many from your photo library
            </Txt>
          </View>
          <Icon name="chevronRight" size={18} />
        </Card>
      </PressableScale>

      <Card variant="outline" style={{ marginTop: space.xxl, gap: space.s }}>
        <Txt variant="headline">For the best results</Txt>
        <Txt variant="callout" tone="secondary">
          Good light, the label facing the camera, and one product per photo. A group photo works too — Mago will list each product it sees.
        </Txt>
      </Card>
      <Txt variant="footnote" tone="secondary" style={{ marginTop: space.l }}>
        Product photos are read once to fill in the names and are never stored on our server. Your list stays on your phone.
      </Txt>
      <Button variant="ghost" label="Add a product by hand" onPress={() => router.replace('/bag/review?manual=1')} style={{ marginTop: space.l }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.l },
  optIcon: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  camTop: { position: 'absolute', top: 56, left: space.l, right: space.l, flexDirection: 'row', alignItems: 'center', gap: space.m },
  round: { width: layout.tapMin, height: layout.tapMin, borderRadius: layout.tapMin / 2, alignItems: 'center', justifyContent: 'center' },
  tip: { borderRadius: radius.pill, paddingHorizontal: space.l, paddingVertical: space.s },
  camBottom: { position: 'absolute', bottom: 40, left: 0, right: 0, gap: space.l },
  shot: { width: 56, height: 56, borderRadius: radius.chip },
  camControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl },
  shutter: { width: layout.tapMirror, height: layout.tapMirror, borderRadius: layout.tapMirror / 2, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF' },
  done: { width: 96, minHeight: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
