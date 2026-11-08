import { Redirect } from 'expo-router';
import { useProfile } from '@/data/profile';

export default function Index() {
  const onboarded = useProfile((s) => s.onboarded);
  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}
