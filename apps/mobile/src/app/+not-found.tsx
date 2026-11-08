import { Redirect } from 'expo-router';

/** Unknown address (old link, or the web preview opened at an unexpected path): go home. */
export default function NotFound() {
  return <Redirect href="/" />;
}
