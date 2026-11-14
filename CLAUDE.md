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
| D-13 | Visual direction **Warm luxury A — Champagne & Plum** (8 Nov; replaces Blush Bloom): porcelain base, ambient champagne/peach/rose glows at 15–25% with 2–3% grain, Cormorant Garamond serif headlines + DM Sans, Deep Plum pill buttons. Full-strength gradient only on: streak ring, before/after reveal, paywall header. | Owner decision |
| D-14 | UX structure references **Ulta Beauty iOS** (Mobbin): greeting header, banner carousel, rails, round occasion tiles, labeled 5-slot tab bar, Account-style settings lists. Not copied: hot-pink/orange banners, sign-up-first forms, location prompt at launch, shopping. | Owner decision 8 Nov |
| D-16 | **Product pictures on every step for everyone** (8 Nov, revised same day — no longer Pro-gated). Until a licensed catalog is connected, pictures are type illustrations in the product's shade (`ProductArt`); `imageUrl` takes over when real photos exist. Switch: `PRODUCT_PICTURES_ARE_PRO` (false). | Owner request |
| D-17 | **Read-aloud uses a natural female English voice** chosen automatically (premium/enhanced first, known male voices excluded — `packages/shared/src/voice.ts`); she can preview and pick another in Settings → Read-aloud voice. **Default style "Soft & husky"** (pitch 0.88, rate 0.86; warmer voices like Ava/Zoe/Allison/Jenny ranked first); Natural and Bright also offered. | Owner request 8 Nov |
| D-18 | **My makeup bag** (8 Nov): she scans products (multi-photo camera or photo picker) or adds by hand; list lives on device. **Privacy change:** product photos (never face photos) are sent once to `scan-products` for Gemini vision reading and are not stored anywhere. Every look runs a bag check (have / swap with advice / missing — `packages/shared/src/bag.ts`) shown on the routine page, the stylist's note and each Follow-Along step. | Owner request |
| D-19 | **Stylist's note** before every look starts (not on resume): handwritten-style (Caveat font, note only) plan, bag check, what to lay out, tips. Built on-device from the routine + bag. | Owner request |
| D-20 | **Visual direction: Luxury v2 · A · Porter editorial** (8 Nov; replaces D-13, and the visual parts of D-14 and D-19). Template: claude.ai design "Mago — Hero Screens v1", page "Luxury v2", option A. Porcelain `#FAF7F4` + blush wash on tab screens; one strong color, Plum `#4A1F35`; Cormorant Garamond for display only (≥28pt), system sans (SF Pro) for all UI text; real photography on every look; no gold-ringed icon circles, no bordered cards, no handwriting font; floating glass pill tab bar (Today · Looks · + · Discover · Me); Follow-Along = photo/clip on top + sheet with step, product tiles, timer ring inside Next. Spec: `docs/design/LUXURY_V2.md`. | Owner decision 8 Nov |
| D-15 | Build the full v1 app in **demo mode** first (all screens + flows on-device with sample data; backend written and typechecked, switched off until accounts/keys exist). Repo: github.com/Nesamani-Contractor/Building-Mago. | Owner decision 8 Nov |
| D-21 | **Visual direction: WOW v2 · Porcelain Luxe, blended** (9 Nov; refines D-20). Template: claude.ai design canvas https://claude.ai/artifact/SAS5tKsbWEyTmNz19Tor1T, pages "WOW v2 · 5 screens" + "Rose · Home hero". Rose accents on the **Home tab only**; Plum `#5B2A4A` everywhere else; one serif (Cormorant). New flow: story onboarding → sample **Unveil** (step cards spring out, gold shimmer) → 18+ → Home. Unveil also follows every import. Approved packages: expo-video (looping clips), expo-sensors (tilt sheen), react-native-keyboard-controller (guarded; falls back in Expo Go/web). Placeholder photos/videos flagged in `assets/media/manifest.json`. Branch `design/wow-v2`. | Owner decision 9 Nov |
| D-22 | **Photography & product pictures** (13 Nov): looks use Figma-AI generated 4K editorial photos of white models (owner choice), Figma file "Mago — Photography & Product Renders". Product pictures = unbranded 4K studio renders per product type + shade (`src/design/products.ts`) until a **licensed retailer feed** supplies real brand photos via `imageUrl`; never scrape brand photos. Follow-Along shows a **floating studio tile** (product, shade dot, shade name, bag status) on the right of every step (mandatory). Share-to-Mago + owner extraction prompt: `docs/PRD_ADDENDUM_SHARE_TO_MAGO.md`, `OWNER_PROMPT` in `_shared/ai.ts`. | Owner decision 13 Nov |
| D-23 | **Uploaded videos are really watched** (13 Nov, owner bug report: uploads showed an unrelated sample lip look). Steps always come from the uploaded video itself — never a sample. Every kind of video is handled: creator talking, captions only, or silent with only products and actions (speech, on-screen text, packaging labels and visible actions are all read; `packages/shared/src/watch.ts`). Full app: private upload → `import-upload` → worker → Gemini File API (hears + sees) → Claude → deleted. Claude web preview: frames read on the device as time-stamped contact sheets → Claude (`sample` capability, images) → validated routine. A video that isn't a beauty routine gets a clear message and no charge. | Owner requirement |
| D-24 | **Save & organize, Pinned, Greeting, Favorites** (13 Nov). After every conversion a **Save to your library** sheet asks for categories (existing or new), her own tags and an optional pin; "Collections" are called **Categories** in the UI. Home starts with **Pinned · You and your beauty** (3 rows, See all) showing routine time + last tried. Every main tab screen greets her by time of day and name (name asked once in onboarding, editable in Me). A heart on every routine adds it to **Favorites** (row at the top of Library). Spec: `docs/PRD_ADDENDUM_ORGANIZE.md`. | Owner request |
| D-25 | **Makeup bag counts, quantity check, cart & orders** (13 Nov; reverses D-14's "no shopping"). Library has a My makeup bag card: add by hand, one photo or several photos; photos are read for name/brand/shade/type and identical units are counted. The same product (type + brand + name + shade) added again raises its **count** instead of duplicating. Every look's bag check shows how many she owns, how the look uses each product (steps + amounts) and what to buy. **Cart**: add one or all missing products, change quantity, remove with Undo, checkout, order placed, My orders, "It arrived" adds to the bag. No retail partner yet: orders are saved on the phone, nothing charged. Spec: `docs/PRD_ADDENDUM_BAG_CART.md`. | Owner request |
| D-26 | **Automatic photo scan** (13 Nov). Product photos (one product or a cluttered table) are read and ADDED to the bag automatically — name, brand, shade, type, category, count — then a **Check your bag** review asks her to confirm, especially quantities (stepper, Undo, "Check this" below 70% confidence, name unread photos by hand). Same product in two photos counts once; owned products get their count raised. Categories: Face, Eyes & brows, Lips, Skincare, Fragrance, Tools, Other; bag viewable by category or brand. Spec: `docs/PRD_ADDENDUM_BAG_CART.md` §5. | Owner request |

Still open: retail partner for checkout (D-25), OQ-4 store name/trademark, OQ-7 Discover curation owner, golden-set reviewers, badge list reconciliation, legal review of upload processing, accounts not yet created.

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
- react-native-reanimated (use `.get()`/`.set()` on shared values) + gesture-handler, expo-haptics, expo-keep-awake, expo-speech, expo-speech-recognition (approved, not yet installed), expo-camera, expo-secure-store, expo-blur, expo-linear-gradient, expo-clipboard, expo-document-picker, react-native-svg, @expo-google-fonts (Cormorant Garamond only — UI text uses the system font), expo-image, expo-video, expo-sensors, react-native-keyboard-controller (load only through `src/lib/keyboard.tsx`).
- On web, wrap any `<Svg>` in a `<View>` so it stacks above frosted-glass layers.
- Tests: Jest + React Native Testing Library; Maestro for key flows; SQL tests proving RLS.
- **Dependencies:** only well-maintained packages; ask the owner before adding any package not listed here, and state its monthly cost.

## Design rules (premium, not template) — WOW v2 · Porcelain Luxe (D-21, builds on D-20)
- Design system first. **No hard-coded colors, sizes, radii, shadows or durations in screens** — use tokens from `src/design/tokens.ts` and photos from `src/design/media.ts`.
- Palette (tokens in `src/design/tokens.ts`): Porcelain `#FBF7F4` background; ink `#2A1E26`; muted `#7C6A73`; Plum `#5B2A4A` is the strong UI color (primary buttons, selection, active tab); sunken `#F6EEE9` for chips, inputs, secondary buttons and product tiles; gold `#C9A46A` for achievement moments only (Unveil shimmer, streaks) — never text. **Home tab only:** rose `c.home.*` (accent `#D9716F` for non-text, `#C45F5D` for large text only, fill `#B5504E` with white text). Glass only on controls over photos (`GlassButton`). Dark: plum-black bg, primary = blush.
- Type: Cormorant Garamond 500 for display/titles ≥ 28pt only; system sans (SF Pro / Roboto) for everything else; UPPERCASE `eyebrow` labels above titles; sentence case; Dynamic Type to 200%.
- Photography leads: every look shows a real photo (`LookPhoto` / `routineImage`) — source thumbnail for saved YouTube looks, licensed demo photos (`assets/looks/CREDITS.md`) until the commissioned shoot. Never an icon placeholder for a look.
- No borders on cards and no gold-ringed icon circles. Separate with space and tone (`surface`, `surfaceAlt`). Shadows only on floating layers (tab bar, sticky footers).
- Radii: chips 10, thumbs 14, cards 20, sheets/hero media 32, buttons pill. Spacing 4-pt base, 20 side margin, 40 between sections.
- One emphasized element and one primary action per screen. Primary = Plum pill 56px. Disabled = sunken fill + tertiary text (never a faded plum).
- Product pictures: one line-silhouette style with a real shade dot (`ProductArt` mono); her own bag photo when she has one.
- Motion: critically damped springs by default, press scale 0.97, step changes slide 250 ms; Reduce Motion → fades. Haptics on meaningful moments only.
- Every screen designs: loading (skeletons), empty (helpful + next action), error (what happened + what to do + retry), offline, success.
- Anything used during makeup works at arm's length: large type, ≥44pt targets (56pt in Follow-Along), one-handed.
- Accessibility: WCAG 2.1 AA, 4.5:1 text contrast, VoiceOver/TalkBack labels on every control.
- Native feel: iOS HIG and Material 3 where they differ. Layout works on iPhone and iPad (two-pane Follow-Along on iPad). Light + dark.
- Copy: warm, short, second person. Buttons are verb + object. Explain things once, where needed. No demo/developer copy in the main UI. No guilt or loss-aversion copy.
- Use skills when available: premium-ios-app-design, premium-mobile-app, apple-design, secure-vibe-coding-workflow.

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
