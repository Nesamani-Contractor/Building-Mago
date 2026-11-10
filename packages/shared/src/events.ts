/**
 * The analytics event list (docs/ARCHITECTURE.md §6). Only these names may be sent.
 * Properties must be coarse: no personal data, no URLs, no photo information.
 */
export const ANALYTICS_EVENTS = [
  'onb_welcome_viewed',
  'onb_age_confirmed',
  'onb_q_goal',
  'onb_q_sources',
  'onb_q_skill',
  'onb_q_weekly_goal',
  'onb_preview_viewed',
  'onb_completed',
  'import_started',
  'import_cache_hit',
  'import_stage',
  'import_succeeded',
  'import_failed',
  'import_limit_hit',
  'manual_routine_created',
  'fa_started',
  'fa_step_advanced',
  'fa_voice_enabled',
  'fa_photo_taken',
  'fa_completed',
  'fa_abandoned',
  'routine_saved',
  'collection_created',
  'search_performed',
  'plan_created',
  'reminder_opened',
  'streak_week_met',
  'streak_freeze_used',
  'badge_earned',
  'share_card_exported',
  'referral_installed',
  'referral_rewarded',
  'discover_saved',
  'paywall_viewed',
  'trial_started',
  'purchase_completed',
  'restore_tapped',
  'simplify_used',
  'account_linked',
  'backup_completed',
  'restore_completed',
  'export_completed',
  'account_deleted',
  'bag_scan_started',
  'bag_item_added',
  'bag_check_viewed',
  'stylist_note_viewed',
  // WOW v2 (D-21): The Unveil, onboarding story, vibe picker.
  'unveil_complete',
  'unveil_sample_started',
  'onb_story_viewed',
  'vibe_selected',
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
export type AnalyticsProps = Record<string, string | number | boolean>;

const BANNED_KEYS = /url|email|name|phone|photo|token|note|address/i;

/** Drop any property that could carry personal data. */
export function sanitizeProps(props: AnalyticsProps = {}): AnalyticsProps {
  const out: AnalyticsProps = {};
  for (const [k, v] of Object.entries(props)) {
    if (BANNED_KEYS.test(k)) continue;
    if (typeof v === 'string' && /https?:\/\//i.test(v)) continue;
    out[k] = typeof v === 'string' ? v.slice(0, 64) : v;
  }
  return out;
}
