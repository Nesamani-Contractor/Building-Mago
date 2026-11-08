import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import Svg, { Ellipse } from 'react-native-svg';
import { useTheme } from '@/design/theme';
import { layout, radius, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { Txt } from './Txt';
import { Button } from './Button';
import { PressableScale } from './PressableScale';

interface Props {
  title: string;
  body: string;
  /** Previous photo for the same look: shown at 30% as a framing ghost. */
  ghostUri?: string;
  onCapture: (uri: string) => void;
  onSkip: () => void;
}

/**
 * Before/after photo with a face guide and ghost overlay. Skip is always visible.
 * Photos stay on the device (never uploaded). Face detection / auto-capture runs on-device in
 * the full build; here the shutter is manual.
 */
export function PhotoCapture({ title, body, ghostUri, onCapture, onSkip }: Props) {
  const { c } = useTheme();
  const [perm, request] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function shoot() {
    if (!cam.current) return;
    setBusy(true);
    try {
      const pic = await cam.current.takePictureAsync({ quality: 0.7 });
      haptic.select();
      onCapture(pic.uri);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const granted = perm?.granted;
  return (
    <View style={styles.wrap}>
      <View style={{ gap: space.s }}>
        <Txt variant="title2" accessibilityRole="header">
          {title}
        </Txt>
        <Txt variant="callout" tone="secondary">
          {body}
        </Txt>
      </View>
      <View style={[styles.frame, { backgroundColor: c.surfaceAlt, borderColor: c.hairline }]}>
        {granted && !failed ? (
          <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="front" mirror onMountError={() => setFailed(true)} />
        ) : (
          <View style={styles.center}>
            <Txt variant="callout" tone="secondary" align="center" style={{ maxWidth: 260 }}>
              {failed
                ? 'The camera isn’t available here. You can skip photos and still finish your look.'
                : perm && !perm.canAskAgain
                  ? 'Camera access is off. You can turn it on in Settings, or skip photos.'
                  : 'Mago uses your front camera only for this photo. It stays on your phone.'}
            </Txt>
          </View>
        )}
        {ghostUri && granted && !failed ? <Image source={{ uri: ghostUri }} style={[StyleSheet.absoluteFill, { opacity: 0.3 }]} contentFit="cover" /> : null}
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 300 400" preserveAspectRatio="xMidYMid meet" pointerEvents="none">
          <Ellipse cx={150} cy={190} rx={100} ry={132} stroke={c.accent} strokeWidth={1.5} strokeDasharray="6 6" fill="none" />
        </Svg>
      </View>
      <View style={{ gap: space.s }}>
        {granted && !failed ? (
          <PressableScale accessibilityLabel="Take photo" onPress={shoot} disabled={busy} style={[styles.shutter, { borderColor: c.ink }]}>
            <View style={[styles.shutterInner, { backgroundColor: c.primary }]} />
          </PressableScale>
        ) : !failed && (!perm || perm.canAskAgain) ? (
          <Button label="Allow camera" icon="camera" onPress={() => request()} />
        ) : null}
        <Button variant="ghost" label="Skip photo" onPress={onSkip} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.xl, paddingTop: space.l },
  frame: { flex: 1, minHeight: 280, borderRadius: radius.card, overflow: 'hidden', borderWidth: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  shutter: { width: layout.tapMirror, height: layout.tapMirror, borderRadius: layout.tapMirror / 2, borderWidth: 2, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 28 },
});
