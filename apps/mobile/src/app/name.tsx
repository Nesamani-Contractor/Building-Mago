import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { NameField } from '@/components/NameField';
import { space } from '@/design/tokens';
import { useProfile } from '@/data/profile';
import { greeting } from '@/lib/hooks';

/** Me → Your name (FR-GRT). */
export default function NameScreen() {
  const router = useRouter();
  const current = useProfile((s) => s.name);
  const set = useProfile((s) => s.set);
  const [value, setValue] = useState(current ?? '');
  const save = () => {
    set({ name: value.trim() || null });
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/me');
  };
  return (
    <Screen header={<TopBar title="Your name" />} footer={<Button label="Save name" onPress={save} />}>
      <Txt variant="title1" accessibilityRole="header" style={{ marginTop: space.xxl }}>
        What should we call you?
      </Txt>
      <Txt variant="callout" tone="secondary" style={{ marginTop: space.s }}>
        We’ll greet you with it, like “{greeting()}, {value.trim() || 'Maya'}”. It stays on this phone.
      </Txt>
      <NameField autoFocus value={value} onChange={setValue} onSubmit={save} />
    </Screen>
  );
}
