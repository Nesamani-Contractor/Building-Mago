import { create } from 'zustand';
import { sanitizeProps, type AnalyticsEvent, type AnalyticsProps } from '@mago/shared';
import { usePrefs } from '@/data/prefs';
import { useProfile } from '@/data/profile';
import { isDemo } from './config';

export interface LoggedEvent {
  name: AnalyticsEvent;
  props: AnalyticsProps;
  at: string;
}

/** In demo mode events are kept in memory so you can see them in Settings → Developer. */
export const useEventLog = create<{ events: LoggedEvent[] }>(() => ({ events: [] }));

/**
 * Track one event from the defined list. Personal data is stripped before anything leaves.
 * UK users must opt in first (D-09); US users can opt out in Settings → Privacy.
 */
export function track(name: AnalyticsEvent, props: AnalyticsProps = {}): void {
  const clean = sanitizeProps(props);
  const consent = usePrefs.getState().analyticsConsent;
  const country = useProfile.getState().country;
  const allowed = consent === 'granted' || (consent === 'unasked' && country !== 'UK');
  useEventLog.setState((s) => ({ events: [{ name, props: clean, at: new Date().toISOString() }, ...s.events].slice(0, 200) }));
  if (!allowed || isDemo) return;
  // Live mode: PostHog capture goes here (SDK added in Phase 8 after consent flow review).
}
