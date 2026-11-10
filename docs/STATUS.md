# Build status — 9 Nov 2026

Mode: **demo** (D-15). Everything below runs on the device with sample data unless marked otherwise.

## 9 Nov — Rose redesign (D-20)
The whole app now uses the **Rose** look from the owner's reference UI and the "Rose · Home hero" board: blush page, white cards with soft rose shadows, DM Serif Display + Inter, rose buttons, category circles, gradient promo banner.
- **Home** rebuilt to the reference layout: avatar + bell + search, "Discover / Your Beauty" hero, search pill (a pasted video link goes straight to Add), 5 category circles → Discover, promo banner carousel (New looks, makeup bag, share tip, Pro), Trending Now rail, Today's / Your next look, Your week, Pinned, Recently saved.
- **Discover** rebuilt like the reference category screen: filter chips, occasion circles, 2-column look cards (heart to save, "Save look" / "Start look"), Quick looks, Recommended for you.
- **Follow-Along** rebuilt: deep-rose stage with the step's products drawn large, frosted controls (close, step count, read-aloud), right rail (Watch, Tip, Steps), white step sheet that springs in, coach tip, products, timer, big Next. New "All steps" list to jump to any step. iPad: stage left, step panel right.
- **Routine detail** hero now shows the look's products as a flat-lay.
- **Tab bar:** Home · Discover · (+) · Library · Profile.
- Every other screen picks up the new tokens automatically (checked: onboarding, Library, Profile, Add, stylist's note, makeup bag, paywall, settings, planner, glow-up, dark mode).
- Imagery is still illustration (product types in their shades). The reference's photos can't ship until we license real, model-released photography.

## Works now (demo)
| Area | Screens | Notes |
|---|---|---|
| Onboarding | Welcome reel, 18+ gate, 4 skippable questions, personalised preview, "I already have an account" | Each answer changes starters, share tips, tip visibility and weekly goal. No sign-up needed (D-01). |
| Today | Greeting, banner carousel (weekly ring, share tip, Pro), imports in progress, resume, today's plan, pinned, recently saved, Discover pick | Ulta structure, Warm luxury A skin. |
| Add / import | Paste link (clipboard), upload a video, write it myself, honest 4-stage progress, guided upload for TikTok/Instagram, offline/limit/failed/non-English states | Link allow-list + normalisation is the real shared code. **Demo: generated steps are sample content, clearly labelled** — they are not read from the video. |
| Routine detail | Full-bleed art, badges, favorites, collections, pin, Simplify (Pro), "Check this" products, tips toggle, Watch this step (opens YouTube at the timestamp), edit steps, remove | |
| Follow-Along | Before photo (front camera, face guide, ghost overlay, skip), one step per screen, read-aloud, swipe, big Next, wait timers, keep-awake, resume within 7 days, after photo, iPad two-pane layout | Voice commands need the full build (see below). |
| Completion | Celebration line + haptic, before/after slider, weekly goal, rating, private note, share card, plan again | |
| Share card | 9:16 / 1:1, optional after photo, caption with referral link | Demo shares text; the full build shares the rendered image. |
| Library | Search (title, steps, products, notes), filters, collections, favorites, recently done | Production moves search to SQLite FTS5. |
| Discover | Hero carousel, occasion circles, quick looks, because-you-saved, all looks, one-tap save | 8 Mago-written sample routines. |
| Planner | Plan sheet (60 days, time, occasion, weekdays), month calendar with dots | Reminders are not scheduled yet. |
| Me | Weekly ring, stats, glow-up timeline, badges, referral, Pro, backup, settings | |
| Product pictures (everyone) | "Use these" on every Follow-Along step, per step and "Products in this look" on routine detail | Illustrations of the product type in its shade; real photos need a product catalog (open question). AI now returns product kind + shade. |
| Read-aloud voice | Female English voice picked automatically; Settings → Read-aloud voice lists this device's female voices with a tap-to-preview | Voices come from the device; the web preview uses the browser's voices. |
| My makeup bag | Scan (several photos in a row with the camera, or pick photos), review/confirm, add by hand, edit/remove, grouped list (Face, Eyes & brows, Lips, Skincare, Tools) | **Demo: Mago can't read labels yet — you name each product on the review screen.** Live: `scan-products` (Gemini vision) pre-fills names, brands, type and shade. |
| Bag check | On every look: what you have, what to swap (which of your products + how to use it), what's missing; also on each Follow-Along step | Matching rules + tests in `packages/shared/src/bag.ts`. |
| Stylist's note | Handwritten-style preview before a look starts: plan, bag check, what to lay out, tips | Built on the device, works offline. |
| Paywall | Benefit headline, yearly pre-selected, trial timeline, restore, terms/privacy, Apple/Google disclosures, close always visible | **Demo purchase — no charge.** |
| Settings | Account linking, subscription, weekly goal, notifications, backup & restore, privacy toggles, export, delete account, appearance, analytics event log | |
| Design system | Tokens (light + dark), Reduce Motion, Dynamic Type to 200%, 44pt+ targets, VoiceOver labels | |

## Written and checked, but switched off until you have accounts
| Piece | Where | Needs |
|---|---|---|
| Database + RLS on every table + quota functions + private upload bucket | `backend/supabase/migrations` | Supabase project |
| RLS proof tests (16 checks) | `backend/supabase/tests/rls.test.sql` | Supabase CLI + Docker to run |
| API: import-start, import-worker, import-status, upload-url, simplify, backup (AES-GCM envelope encryption), rc-webhook, referral, delete-account, purge-uploads | `backend/supabase/functions` (all pass `deno check`) | Supabase + secrets |
| AI: Gemini watches public YouTube videos / uploads; Claude writes validated steps | `functions/_shared/ai.ts` | Gemini + Anthropic API keys; golden-set tuning |
| App live mode (anonymous session, import polling, backup calls) | `apps/mobile/src/services` | `EXPO_PUBLIC_SUPABASE_URL` / `ANON_KEY` |

## Not built yet (honest list)
- Real Apple / Google sign-in (needs expo-apple-authentication + Google client) — demo simulates linking.
- RevenueCat SDK (Phase 6) — paywall flow is real, purchase is simulated.
- Voice commands (expo-speech-recognition, approved) — needs a development build, not Expo Go.
- Push/local notifications (expo-notifications) — the pre-permission screen and settings exist; nothing is scheduled.
- iOS Share Extension / Android share intent ("Share → Mago") — needs a development build.
- Upload path end to end (client upload to signed URL + Gemini File API in the worker).
- Rendering the share card to an image; photo zip export; on-device face auto-capture.
- PostHog + Sentry SDKs (event list and sanitising are done; events show in Settings → Developer).
- App icon, splash, store screenshots and listings (Phase 9). Translation is out of v1 (D-07).

## Checks run
- Shared rules: 32 Jest tests pass.
- App: `tsc --noEmit` clean, `expo lint` clean, web export builds.
- Headless browser click-through of onboarding → import → Follow-Along → completion, plus Discover, Library, Me, Paywall, Settings, Planner and iPad layouts: no runtime errors.
- Backend: `deno check` passes for all 10 functions.
- Not yet run: RLS tests against a live database, Maestro on a device, real-device performance.
