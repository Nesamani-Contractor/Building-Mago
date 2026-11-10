# CLAUDE.md — Permanent rules for building Mago

Every session that touches this repo follows these rules. If a rule here conflicts with `docs/PRD.md`, the PRD wins **except** where the Decisions Log below records an owner override. Tell the owner about any new conflict.

## Who you are working with
- The product owner (Nesamani) is not a coder. Explain decisions in plain language, keep the project simple to run, and never leave broken steps.
- Owner has an iPad and a Windows computer. No Mac, no iPhone. All iOS builds use EAS cloud builds; testing is via development build / TestFlight on iPad. Android testing via Play internal testing.
- Interrogate and challenge: ask before risky or irreversible choices; say plainly when something is risky or stuck. Never mark something done that isn't working.

## Source of truth
1. `docs/PRD.md` (Mago PRD v2.0, 7 Nov 2026) — product requirements.
2. Decisions Log (below) — owner overrides and answers to PRD open questions.
3. `docs/BUILD_PLAN.md`, `docs/ARCHITECTURE.md`, `docs/SCREENS.md`.

## Decisions Log (owner-approved, 7 Nov 2026)
| ID | Decision | Note |
|---|---|---|
| D-01 | No sign-in at first launch: anonymous Supabase account. Apple / Google linking optional (Me → Account). No email login. | PRD FR-ONB-02/03 (overrides build brief's email login) |
| D-02 | Library lives on device (SQLite + FTS). **Encrypted cloud backup & restore ships in v1** for linked accounts: routines, collections, plans. Photos never leave the device. | Overrides PRD (backup was v1.1) |
| D-03 | Pricing = PRD OQ-2: Free 5 new AI conversions/month (cached routines free). Pro $5.99/month or $39.99/year, 7-day trial on yearly, fair-use cap 150/month, Simplify is Pro. Configured remotely in RevenueCat. | Resolves OQ-2 |
| D-04 | Video understanding via **Google Gemini API** (public YouTube URLs + uploaded files) producing timestamped transcript/notes. **Claude API** structures + validates the routine. Both called server-side only. Golden set decides final model mix. | Resolves YouTube captions blocker; informs OQ-3 |
| D-05 | TikTok / Instagram in v1: public metadata (title/caption) + guided "save & upload" fallback. No scraping, no unofficial APIs. Every source adapter has a remote on/off switch in `app_config`. | Interim for OQ-1 |
| D-06 | "Watch this step": YouTube = official embed seeking to timestamp; uploads = play the user's own on-device file (never re-downloaded from server); TikTok/IG = open original (embeds can't seek). | Owner approved |
| D-07 | **Translation moved out of v1.** v1 accepts English-language videos; non-English videos get a friendly "English videos only for now" state, no credit charged, manual entry offered. Translation + English subtitles return in a later release. | Overrides PRD D7 |
| D-08 | Minimum age **18+**, confirmed in onboarding. | Overrides PRD 16+ (OQ-5) |
| D-09 | Launch markets **US + UK**. Analytics consent prompt for UK (GDPR). | Resolves OQ-6 |
| D-10 | Voice commands via `expo-speech-recognition` (approved). Mic opt-in at first Follow-Along; listening pauses while read-aloud speaks. | Owner approved |
| D-11 | All PRD v1.0 features ship at launch (Planner, weekly streaks, glow-up timeline, Discover, share cards, referrals). | Owner decision |
| D-12 | Design mockups of 5 hero screens approved before any Phase 1 code. | Owner decision |
| D-13 | ~~Superseded by D-20 (9 Nov).~~ Visual direction **Warm luxury A — Champagne & Plum** (8 Nov; replaces Blush Bloom): porcelain base, ambient champagne/peach/rose glows at 15–25% with 2–3% grain, Cormorant Garamond serif headlines + DM Sans, Deep Plum pill buttons. Full-strength gradient only on: streak ring, before/after reveal, paywall header. | Owner decision |
| D-14 | UX structure references **Ulta Beauty iOS** (Mobbin): greeting header, banner carousel, rails, round occasion tiles, labeled 5-slot tab bar, Account-style settings lists. Not copied: hot-pink/orange banners, sign-up-first forms, location prompt at launch, shopping. | Owner decision 8 Nov |
| D-16 | **Product pictures on every step for everyone** (8 Nov, revised same day — no longer Pro-gated). Until a licensed catalog is connected, pictures are type illustrations in the product's shade (`ProductArt`); `imageUrl` takes over when real photos exist. Switch: `PRODUCT_PICTURES_ARE_PRO` (false). | Owner request |
| D-17 | **Read-aloud uses a natural female English voice** chosen automatically (premium/enhanced first, known male voices excluded — `packages/shared/src/voice.ts`); she can preview and pick another in Settings → Read-aloud voice. **Default style "Soft & husky"** (pitch 0.88, rate 0.86; warmer voices like Ava/Zoe/Allison/Jenny ranked first); Natural and Bright also offered. | Owner request 8 Nov |
| D-18 | **My makeup bag** (8 Nov): she scans products (multi-photo camera or photo picker) or adds by hand; list lives on device. **Privacy change:** product photos (never face photos) are sent once to `scan-products` for Gemini vision reading and are not stored anywhere. Every look runs a bag check (have / swap with advice / missing — `packages/shared/src/bag.ts`) shown on the routine page, the stylist's note and each Follow-Along step. | Owner request |
| D-19 | **Stylist's note** before every look starts (not on resume): handwritten-style (Caveat font, note only) plan, bag check, what to lay out, tips. Built on-device from the routine + bag. | Owner request |
| D-15 | Build the full v1 app in **demo mode** first (all screens + flows on-device with sample data; backend written and typechecked, switched off until accounts/keys exist). Repo: github.com/Nesamani-Contractor/Building-Mago. | Owner decision 8 Nov |

| D-20 | **Visual direction "Rose"** (9 Nov; replaces D-13 Warm luxury A). Owner's rose reference UI + "Rose · Home hero" board in *Mago — Top 5 screens (GlowUp reference)*: blush `#FCF5F3` page with a `#FBEDEA → #F5DCD7` hero fade, white cards with a 0 4 16 rose shadow (8%), DM Serif Display headlines (two-line hero, second line rose) + Inter, rose accent `#D9716F` (dots, rings, swatches — never text), filled buttons `#B5504E` (white text 5:1), category circles, gradient promo banner, 2-column look cards, Follow-Along on a deep-rose stage with frosted controls + white step sheet. Tab bar: Home · Discover · (+) · Library · Profile. Shopping language from the reference ("Add to bag") is not used — Mago is not a shop. | Owner request 9 Nov |

Still open: OQ-4 store name/trademark, OQ-7 Discover curation owner, golden-set reviewers, badge list reconciliation, legal review of upload processing, accounts not yet created.

## Repository layout
- `apps/mobile` — the Expo app (front end). Routes in `src/app`, design system in `src/design` + `src/components`, on-device data in `src/data`, services (import, purchases, analytics, voice, Supabase) in `src/services`.
- `packages/shared` — pure TypeScript rules shared by app and server (routine schema + validation, link allow-list, streaks, quotas, analytics event list) with Jest tests.
- `backend/supabase` — database migrations with RLS, pgTAP RLS tests, Edge Functions (the API) and `_shared` services (AI, source adapters). Run `node scripts/sync-shared.mjs` after changing `packages/shared`.
- `docs/` — PRD, build plan, architecture, screens, status.

## Tech stack (do not change without explaining first)
- Expo SDK 58 + React Native 0.88 + TypeScript `strict`, Expo Router (routes in `src/app`). Install packages with `EXPO_OFFLINE=1 npx expo install <pkg>` if the Expo version API is unreachable.
- TanStack Query (server data), Zustand (small local state), expo-sqlite (on-device library + FTS5).
- Supabase: Auth (anonymous + Apple + Google), Postgres with RLS, Storage (temporary uploads only), Edge Functions, Queues (pgmq) + worker.
- AI: Gemini (video understanding) + Claude (routine structuring, Simplify) — server-side only.
- RevenueCat (subscriptions), PostHog (analytics, defined event list), Sentry (crashes).
- react-native-reanimated (use `.get()`/`.set()` on shared values) + gesture-handler, expo-haptics, expo-keep-awake, expo-speech, expo-speech-recognition (approved, not yet installed), expo-camera, expo-secure-store, expo-blur, expo-linear-gradient, expo-clipboard, expo-document-picker, react-native-svg, @expo-google-fonts (DM Serif Display, Inter, Caveat — Caveat only in the stylist's note).
- On web, wrap any `<Svg>` in a `<View>` so it stacks above frosted-glass layers.
- Tests: Jest + React Native Testing Library; Maestro for key flows; SQL tests proving RLS.
- **Dependencies:** only well-maintained packages; ask the owner before adding any package not listed here, and state its monthly cost.

## Design rules (premium, not template)
- Design system first. **No hard-coded colors, sizes, radii, shadows or durations in screens** — use tokens from `src/design/`.
- Palette (D-20 Rose, exact): Blush `#FCF5F3` background with the hero fade `#FBEDEA → #F5DCD7`; white cards; Petal `#F7E4E0` for chips, circles and wells; Rose `#D9716F` ONLY for dots, rings, swatches, progress and icons — never text; filled buttons Rose button `#B5504E` with white text; small rose text `#A84846`; large serif accent line `#C45F5D` (24pt+ only); ink `#2A1E1D`; secondary text `#7A6461` (the spec's `#8A7673` fails AA). Promo banner gradient `#F8D9D3 → #EFC1BA`. Follow-Along stage `#D48C87 → #9E5653`. Dark: bg `#1C1414`, surface `#271C1C`, ink `#F8EEEC`, secondary `#C4AFAC`, rose `#E58A87`. Source of truth: `apps/mobile/src/design/tokens.ts`.
- Type: DM Serif Display for headlines (two-line heroes: line 2 in rose), Inter for everything else; sentence case; Dynamic Type to 200%.
- Spacing 4-pt base, screen padding 20, section gap 24. Radii: cards 16, images 14, chips + buttons pill, sheets 24. Cards are white with the soft rose shadow `0 4 16 rgba(150,90,85,0.08)` — no hard borders, never grey shadows. Text never sits directly on a saturated gradient (white text on the deep-rose Follow-Along stage is the one exception, with frosted dark-tinted controls).
- One primary action per screen: a rose pill (`#B5504E`, 52px; 64px in Follow-Along), white text; hero buttons get a soft rose glow. Small card actions use the 32px rose pill. Icons: one set, 1.5–1.7px outline. Avoid: hot pink, Instagram purple-pink gradients, glitter, emoji icons, gradient text, real brand logos.
- Motion: one shared spring preset, ≤400 ms; press scale ~0.97; step advance slides 250 ms; Reduce Motion → fades. Haptics on meaningful moments only (step complete, look complete, streak met, purchase).
- Every screen designs: loading (skeletons, never blank spinners), empty (helpful + next action), error (what happened + what to do + retry), offline, success.
- Anything used during makeup works at arm's length: large type, ≥44pt targets (bigger in Follow-Along), one-handed.
- Accessibility: WCAG 2.1 AA, 4.5:1 text contrast, VoiceOver/TalkBack labels on every control.
- Native feel: iOS HIG and Material 3 where they differ (back gestures, sheets, system dialogs).
- Layout works on iPhone sizes and iPad (adaptive two-pane where it helps). Light + dark.
- Copy: warm, short, second person. Buttons 1–3 words. Celebrations 3–6 words. No guilt or loss-aversion copy ("Don't lose your streak!" is banned).
- Use skills when available: premium-mobile-app, premium-ios-app-design, secure-vibe-coding-workflow.

## Security & privacy rules (non-negotiable)
- No secret keys in the app bundle. Only the Supabase anon key, RevenueCat public SDK keys, PostHog project key and Sentry DSN may ship in the app.
- RLS ON for every table; users read/write only their own rows. SQL tests prove it for every table.
- Validate every input server-side. Video URLs: allow-listed hosts only (youtube.com, youtu.be, m.youtube.com, tiktok.com, vm.tiktok.com, instagram.com), normalised to `platform:video_id`; the server never fetches arbitrary user URLs (SSRF protection).
- Pro entitlement and quota checked **on the server** before any paid AI call. Per-user rate limits + monthly quotas; global daily AI spend cap with alert.
- Uploaded videos: private bucket, signed expiring upload URLs, deleted right after processing and never later than 24 h.
- Face photos, notes, transcripts never reach our server. Product photos for the makeup bag are sent once for reading and never stored (D-18). Backups encrypted (see ARCHITECTURE).
- Tokens in expo-secure-store; HTTPS only; no personal data, URLs-with-tokens, or photo data in logs, Sentry, or analytics.
- In-app account deletion that truly deletes server data (and offers to wipe local), plus data export (JSON + photo zip).
- No App Tracking Transparency: we do not track across apps. Re-check before adding any ad/attribution SDK.
- Privacy labels, iOS Privacy Manifest and Play Data Safety answers are generated from what the code actually does and kept in `docs/privacy/`.

## Definition of done (every phase)
- Runs on iPhone-size and iPad-size, light + dark, iOS + Android.
- All states designed (loading, empty, error, offline, success).
- `npx tsc --noEmit` clean, lint passes, tests pass (incl. RLS tests when tables change).
- Analytics events for the phase added to the event list and implemented.
- Owner gets: what was built, what's left, risks, and a "How to test this on my iPad" checklist with exact steps.
- Commit to git after each working step with clear messages. STOP after each phase for approval.
