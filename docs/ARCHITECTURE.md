# Mago — Architecture (v1.0)

Plain-language summary: the **app keeps her library on her phone**. Our **server only does three things**: turns a video into a routine (and shares that result with everyone who imports the same video), keeps track of accounts / limits / subscriptions, and stores an encrypted backup. All AI keys live on the server.

## 1. Big picture

```
┌───────────────────────────── Phone / iPad (Expo app) ─────────────────────────────┐
│  Screens (Expo Router)   Design system   Zustand (UI state)   TanStack Query      │
│  SQLite + FTS: routines, steps, collections, plans, sessions, streaks, notes      │
│  Private files: before/after photos (never uploaded)                              │
│  Share Extension (iOS) / Share intent (Android)                                   │
│  RevenueCat SDK · PostHog · Sentry · Speech (TTS + on-device recognition)         │
└───────────────┬─────────────────────────────────────────────┬─────────────────────┘
                │ HTTPS (anon/linked user JWT)                 │ Store billing
                ▼                                              ▼
┌──────────────────────────── Supabase ───────────────────┐   ┌──────────────┐
│ Auth: anonymous · Apple · Google                         │   │  RevenueCat  │
│ Edge Functions:                                          │◄──┤  (webhooks)  │
│   import-start · import-status · upload-url · simplify   │   └──────────────┘
│   backup-put/get · referral · rc-webhook · delete-account│
│ Postgres (RLS on every table)                            │
│ Queues (pgmq): import_jobs                               │
│ Storage: uploads (private, deleted ≤ 24 h)               │
│ Cron: purge uploads, retry jobs, monthly counters        │
└───────────────┬──────────────────────────────────────────┘
                │ worker pulls jobs
                ▼
┌──────────────── Import worker ────────────────┐
│ Source adapters (switchable in app_config):    │
│   youtube  → Gemini (public URL)               │
│   upload   → Gemini File API (temp file)       │
│   tiktok / instagram → public metadata only    │
│   manual   → no AI                             │
│ → Claude: structure to Mago schema             │
│ → validate → routine_cache → notify app        │
└────────────────────────────────────────────────┘
```

## 2. Import pipeline (step by step)
1. App sends link (or upload hash) to `import-start`.
2. Server checks: user is signed in (anonymous counts), link host is on the allow-list, normalises to `platform:video_id`. **The server never fetches the raw URL the user typed** (SSRF protection); adapters only call official APIs with the parsed video ID.
3. **Cache check**: if `routine_cache` has this key → return immediately (≤ 1.5 s), no credit used.
4. Quota check (server-side): free = 5 new conversions/month; Pro = 150 fair-use. Over limit → `limit_reached` → app shows paywall.
5. Job queued; app shows honest stages: *Received → Watching the video → Writing your steps → Checking products → Ready*.
6. Worker runs adapter:
   - **YouTube**: Gemini receives the public YouTube URL, returns timestamped transcript + visual notes (what's applied where), detected language.
   - **Upload**: app gets a signed upload URL, uploads (≤ 15 min / 500 MB, resumable), worker passes file to Gemini, then **deletes the file**. Cache key = SHA-256 of file, scoped to the user.
   - **TikTok / Instagram**: public title/caption via oEmbed. If < 40 words of usable text → app offers "save & upload" or manual entry (no credit used).
7. **Language gate (D-07)**: non-English → stop, no credit, friendly state.
8. Claude structures into the routine schema; validator enforces: 3–40 steps, ≤ 25 words per step, fixed category/occasion lists, products with confidence (< 0.6 shown as "Check this").
9. Save to `routine_cache`; app receives it via `import-status` (Realtime) and stores it locally in SQLite.
10. If she left the app → "Your routine is ready" push (after she opted in).

**Cost controls**: shared cache, per-user quotas, per-user rate limit (e.g. 10 imports/hour), video length cap (15 min), global daily AI spend cap with Sentry alert, golden-set cost report each model change.

## 3. Payments
```
App ──RevenueCat SDK──► App Store / Google Play
RevenueCat ──webhook──► rc-webhook ──► entitlements table
simplify / import-start ──► check entitlements (server) before any AI call
referral reward ──► RevenueCat REST (promotional entitlement, 1 month)
```
Offerings and prices are set in the RevenueCat dashboard, so they change without an app update.

## 4. Backup & restore (D-02)
- Only for users who linked Apple or Google (so the account exists on a new device).
- What's backed up: routines, steps, products, collections, tags, plans, streak history. **Not** photos. Notes and transcripts are excluded (PRD keeps them off server).
- How it's protected: the backup is a single encrypted blob per user. Encrypted with a per-user data key; that key is itself encrypted by a server master key held in Supabase secrets (envelope encryption). Plus RLS so only the owner's session can request it, plus Postgres encryption at rest.
- **Honest trade-off for the owner**: this is *not* end-to-end encryption — our server could technically decrypt it. True end-to-end would require her to remember a recovery passphrase, which hurts the experience and loses data when forgotten. Recommendation: envelope encryption for v1; revisit if users ask.

## 5. Data model

### Server (Supabase Postgres) — RLS on every table
| Table | Contents | Who can read / write |
|---|---|---|
| `profiles` | user_id, created_at, age_confirmed_at, country, linked_provider | owner only |
| `routine_cache` | canonical_key (unique), platform, video_id, creator, language, routine_json, model_version, hidden, created_at | any signed-in user reads (non-hidden); service role writes |
| `import_log` | id, user_id, canonical_key, adapter, status, stage, error_code, est_cost, created_at | owner reads own; service role writes |
| `usage_counters` | user_id, month, conversions, simplify_count | owner reads; service role writes |
| `entitlements` | user_id, is_pro, product_id, expires_at, in_grace, updated_at | owner reads; service role writes |
| `referrals` | code, referrer_id, referee_id, status (installed/activated/rewarded), rewarded_at | each party reads own rows; service role writes |
| `backups` | user_id, ciphertext, wrapped_key, key_version, schema_version, updated_at | owner via function only |
| `discover_items` | routine_cache_id, rail, rank, published, hidden | everyone reads published; admin writes |
| `app_config` | key, value (adapter switches, limits, copy flags) | everyone reads; admin writes |
| `upload_objects` | user_id, sha256, storage_path, expires_at | owner; purged ≤ 24 h |

### On device (SQLite)
`routines`, `sections`, `steps`, `products`, `routine_products`, `collections`, `routine_collections`, `tags`, `notes`, `sessions` (resume ≤ 7 days), `photos` (file URIs, private dir), `plans`, `streak_weeks`, `badges`, `local_video_refs` (D-06), `routines_fts` (FTS5).

## 6. Analytics (PostHog) — event list v1
No personal data, no URLs, no photo info. Properties are coarse (platform, adapter, skill level).
- Onboarding: `onb_welcome_viewed`, `onb_age_confirmed`, `onb_q_goal`, `onb_q_sources`, `onb_q_skill`, `onb_q_weekly_goal` (each with `answered|skipped`), `onb_preview_viewed`, `onb_completed`
- Import: `import_started` (adapter), `import_cache_hit`, `import_stage`, `import_succeeded`, `import_failed` (error_code), `import_limit_hit`, `manual_routine_created`
- Follow-Along: `fa_started`, `fa_step_advanced` (input: tap|swipe|voice), `fa_voice_enabled`, `fa_photo_taken` (before|after), `fa_completed`, `fa_abandoned`
- Library: `routine_saved`, `collection_created`, `search_performed`
- Habit: `plan_created`, `reminder_opened`, `streak_week_met`, `streak_freeze_used`, `badge_earned`
- Growth: `share_card_exported`, `referral_installed`, `referral_rewarded`, `discover_saved`
- Money: `paywall_viewed` (trigger), `trial_started`, `purchase_completed`, `restore_tapped`, `simplify_used`
- Account: `account_linked`, `backup_completed`, `restore_completed`, `export_completed`, `account_deleted`
North-star: Looks Completed per Weekly Active User (target ≥ 1.5).

## 7. Monthly cost estimate (to confirm when we sign up)
| Service | Before launch | At launch |
|---|---|---|
| Apple Developer | $99/yr | $99/yr |
| Google Play | $25 once | — |
| Supabase | Free | Pro ~$25/mo (free projects pause when idle) |
| Expo EAS | Free tier (limited builds) | Free or ~$19/mo if build queue is too slow |
| RevenueCat | Free | Free until revenue threshold, then % of revenue |
| PostHog / Sentry | Free tiers | Free tiers likely enough for beta |
| Gemini + Claude | Pennies in testing | Usage-based; target ≤ $0.15 per monthly active user (measured in Phase 3) |

## 8. Risks
| Risk | Mitigation |
|---|---|
| Platform ToS (TikTok/IG) | Metadata + user upload only; adapters switchable; legal review |
| Gemini YouTube input changes or limits | Adapter interface; fallback to upload/manual; monitor errors |
| AI accuracy < 85% | Golden set every model change; "Check this" UI; easy step edits |
| AI cost overrun | Cache, quotas, length cap, spend cap alert |
| Data loss on phone change | Backup in v1 for linked accounts; nudge to link after 3rd saved look |
| App Review (subscriptions, camera, mic) | Clear permission copy, disclosures, demo notes |
