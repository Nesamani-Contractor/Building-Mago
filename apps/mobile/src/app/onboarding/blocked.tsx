import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/States';
import { useProfile } from '@/data/profile';

/** Under 18: kind, final, nothing stored. */
export default function Blocked() {
  const router = useRouter();
  const reset = useProfile((s) => s.reset);
  return (
    <Screen scroll={false} contentStyle={{ flex: 1, justifyContent: 'center' }}>
      <StateView
        icon="info"
        title="Mago is for 18 and up"
        body="Thanks for your interest. We haven’t saved anything about you. We’d love to see you when you’re 18."
        actionLabel="Back to start"
        onAction={() => {
          reset();
          router.replace('/onboarding');
        }}
      />
    </Screen>
  );
}
