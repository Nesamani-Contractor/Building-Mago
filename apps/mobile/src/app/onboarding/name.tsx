import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { NameField } from '@/components/NameField';
import { space } from '@/design/tokens';
import { useProfile } from '@/data/profile';
import { greeting } from '@/lib/hooks';
import { track } from '@/services/analytics';
import { haptic } from '@/design/haptics';

/** Onboarding: "What should we call you?" (FR-GRT, optional). Between the 18+ check and the questions. */
export default function OnboardingName() {
  const router = useRouter();
  const set = useProfile((s) => s.set);
  const [value, setValue] = useState(useProfile.getState().name ?? '');
  const next = (skipped: boolean) => {
    if (!skipped) set({ name: value.trim() || null });
    track('onb_q_name', { result: skipped || !value.trim() ? 'skipped' : 'answered' });
    haptic.select();
    router.push('/onboarding/questions');
  };
  return (
    <Screen
      header={
        <TopBar
          right={
            <PressableScale accessibilityLabel="Skip this question" onPress={() => next(true)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: space.s }}>
              <Txt variant="subhead" tone="secondary">
                Skip
              </Txt>
            </PressableScale>
          }
        />
      }
      footer={<Button label="Continue" disabled={!value.trim()} onPress={() => next(false)} />}
    >
      <View style={{ gap: space.s, marginTop: space.x3 }}>
        <Txt variant="title1" accessibilityRole="header">
          What should we call you?
        </Txt>
        <Txt variant="callout" tone="secondary">
          {value.trim() ? `${greeting()}, ${value.trim()}. ` : ''}We’ll greet you by name. It stays on this phone.
        </Txt>
      </View>
      <NameField autoFocus value={value} onChange={setValue} onSubmit={() => value.trim() && next(false)} />
    </Screen>
  );
}
