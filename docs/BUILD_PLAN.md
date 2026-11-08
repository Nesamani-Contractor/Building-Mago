# Mago — Build Plan (v1.0)

Status: **draft for owner approval** · 7 Nov 2026
Inputs: PRD v2.0 (7 Nov 2026), owner build brief, Decisions Log in `CLAUDE.md`.

## How we work
- One phase at a time. At the end of each phase: summary, what's left, risks, iPad test checklist → **STOP for approval**.
- Every phase must meet the Definition of Done in `CLAUDE.md`.
- PRD milestones are noted in brackets (M0–M6).

## What changed from the original 9 phases
- **Phase 0 added**: accounts + design mockups before code (D-12).
- **Old Phase 5 "Translation" removed from v1** (D-07). Its slot now holds **Backup & restore, export, account deletion** (D-02), which was promoted into v1.
- **4-week beta** (PRD M6) added to Phase 9.

## Timeline reality check
Everything in the PRD ships at launch (D-11). Realistic estimate with one AI engineer + owner testing: **~14–18 weeks to beta, +4 weeks beta**. The biggest timeline risks are the golden-set accuracy bar (≥85%) and seeding 200 Discover routines — both need human reviewers (see Open items).

---

## Phase 0 — Accounts & design sign-off
**Owner tasks** (I'll give step-by-step guides):
- Apple Developer Program ($99/yr). Decide individual vs company. Company needs a D-U-N-S number (can take 1–2 weeks) — start first.
- Google Play Console ($25 one-time). New personal accounts must run a closed test with testers before production — plan for this.
- Expo, Supabase, RevenueCat, PostHog, Sentry, Google AI Studio (Gemini), Anthropic Console (Claude) — free to create.
- Decide store name (OQ-4) so I can reserve the bundle ID (e.g. `app.mago.ios`).

**Claude tasks**: mockups of 5 hero screens (Today, Add sheet, Import/processing, Follow-Along step, Completion with before/after) in light + dark, iPhone + iPad.

**Acceptance**: owner approves mockups; accounts exist; bundle ID chosen.

## Phase 1 — Setup, design system, navigation shell, iPad dev build [M0]
- Expo + TS strict + Expo Router + ESLint/Prettier + Jest; git repo.
- Design tokens: color (light/dark), type scale, spacing, radii, shadows, spring presets, haptic presets. Core components: PillButton, Card, Chip, Sheet, Skeleton, EmptyState, ErrorState, OfflineBanner, PressableScale.
- Five-tab shell: Today · Library · + · Discover · Me, with placeholder screens using real states.
- Sentry + PostHog wired (no events with personal data); `app_config` remote flags read at startup.
- EAS: development build on owner's iPad and an Android device/emulator.

**Acceptance**
- App installs on iPad via EAS dev build; tabs work; light/dark switch follows system.
- Zero hard-coded style values in screens (lint rule).
- Reduce Motion and 200% text size don't break the shell.

## Phase 2 — Anonymous auth, account linking, onboarding [M0]
- Silent anonymous Supabase session on first launch; session in secure store; auto-refresh.
- Welcome reel (S-02) → age confirmation 18+ (D-08) → 4 skippable questions → personalised preview (S-07).
- "I already have an account": Sign in with Apple / Google restores entitlements.
- Link Apple/Google from Me → Account keeps the same user ID.
- UK users: analytics consent prompt (D-09).
- Every onboarding step tracked.

**Acceptance**
- Fresh install → preview in **< 60 s** with all questions skipped or answered.
- Each answer visibly changes something (see SCREENS.md "What each answer changes").
- Under-18 answer → respectful block screen; no account data kept.
- RLS tests for `profiles` pass.

## Phase 3 — Import pipeline + routine generation [M1]
- Add sheet: paste link, upload video/screen recording, write manually.
- iOS Share Extension + Android share intent ("Share → Mago").
- Server: URL allow-list + normalisation → shared cache check → job queue → **source adapters** (YouTube via Gemini, Upload via Gemini File API, TikTok/IG metadata-only) → Claude structuring → schema validation → cache → stream status to app.
- Honest progress stages; background processing; "routine ready" notification (pre-permission screen after first successful import).
- Edge states: private video, no speech, non-English (D-07), unsupported link, offline (queued "Pending"), free limit reached, duplicate.
- Quotas (5 free/month, cache hits free), rate limits, global AI spend cap.
- Golden-set harness: run 100 tutorial videos, score accuracy, report cost per import.

**Acceptance**
- Cached routine appears in ≤ 1.5 s; uncached YouTube routine completes with honest stages.
- Golden-set run produces an accuracy + cost report (target ≥ 85% accurate, AI cost on track for ≤ $0.15 per MAU).
- SSRF tests: non-allow-listed hosts and redirects rejected.
- Turning an adapter off in `app_config` hides it without an app update.

## Phase 4 — Library + Follow-Along + completion [M2, M3]
- On-device SQLite library: routines, sections, steps, products, notes, collections, tags; FTS search; filter chips.
- Routine detail with "Check this" for low-confidence items; edit steps; mini player (D-06).
- Follow-Along: before photo (face guide, ghost overlay, auto-capture, skip) → one step per screen, large type, product chips, "Watch this step", progress bar, read-aloud, voice "next/back/repeat" (D-10), swipe, keep awake, timers, resume within 7 days → after photo → completion (before/after slider, one celebration, "Done N times", rating, note, Share/Plan again/Done).

**Acceptance**
- A full look can be completed hands-free at arm's length on iPad.
- Voice never triggers itself during read-aloud (tested).
- Camera denied → photos skipped gracefully.
- Search returns results offline in < 200 ms for 500 routines.

## Phase 5 — Backup & restore, export, account deletion (replaces Translation)
- Encrypted backup of routines, collections, plans for linked accounts; restore on a new phone or iPad after sign-in.
- Export: JSON + photo zip via share sheet.
- Delete account: server data deleted (incl. backup, usage, referrals), RevenueCat customer handled, offer local wipe.

**Acceptance**
- Install on iPad, link Apple, save 10 looks → reinstall → sign in → library restored.
- Backup rows unreadable by other users (RLS test) and stored encrypted.
- Deleted account leaves no rows in any user table (test).

## Phase 6 — Paywall + subscriptions + Simplify [M5]
- RevenueCat offerings (remote), paywall S-26: benefit headline, 3–4 benefits, yearly pre-selected with savings, monthly alternative, trial explained in plain words with date, Restore, Terms/Privacy, close always visible.
- Triggers: 6th conversion in a month, tapping Simplify, from Me; soft paywall after first aha.
- RevenueCat webhook → `entitlements`; server checks before Simplify / over-quota imports.
- Handles trial, purchase, cancel, expiry, billing grace, refund, restore, family sharing, device switch.
- Simplify (Pro): ≤ 60% of steps, saved as a variant, switchable.

**Acceptance**
- Sandbox purchase, restore and cancel tested on iOS (TestFlight) and Android (internal track).
- Required Apple 3.1.2 / Google Play billing disclosures present (list in `docs/privacy/store-disclosures.md`).
- Saved content never blocked by the paywall.

## Phase 7 — Today, Planner, weekly streaks, glow-up timeline, Discover, share cards, referrals [M4, M5]
- Today: unfinished session, today's plan, weekly streak ring, pinned, recent imports, one Discover pick.
- Planner: plan up to 60 days ahead, occasion, time, weekday repeat, local reminder (max 1/day, quiet hours 10pm–8am).
- Weekly streaks with goal N (1–7), one freeze/month, nudge with 2 days left, badges (list to reconcile).
- Glow-up timeline in Me with side-by-side compare.
- Discover rails from shared cache (200 reviewed routines), admin hide flag, creator removal ≤ 72 h.
- Share card composer (9:16, 1:1) with referral link; referral rewards (1 month Pro each on friend's first completed look, cap 12/yr) via RevenueCat promotional entitlements.

**Acceptance**
- Max one notification per day (routine-ready excepted) verified.
- Referral reward fires only on install + first completed look (test with two devices).

## Phase 8 — Hardening: security, privacy, accessibility, performance, analytics
- Run vibe-app-security-audit checklist; fix findings.
- RLS test suite green; secret scan of bundle; rate-limit tests.
- VoiceOver/TalkBack pass on every screen; contrast check; 200% text.
- Performance: cold start, scroll, Follow-Along frame rate on older devices.
- Analytics review against event list + funnel dashboards.
- Privacy policy draft, App Store privacy label, iOS Privacy Manifest, Play Data Safety (from real code).

## Phase 9 — Store readiness + beta [M6]
- Icons, splash, screenshots (iPhone 6.9", iPad 13", Android phone/tablet), store listings, age rating, review notes (demo instructions).
- TestFlight external + Play closed testing; **4-week beta with 50–100 users**.
- Launch DoD (PRD): must-haves pass on 3 iOS + 3 Android reference devices; ≥ 85% golden-set accuracy; 200 Discover routines; sandbox purchases both stores; accessibility + privacy checks complete.

## Post-launch (v1.1+)
- Translation of non-English videos to English steps + English subtitles (D-07); first languages chosen from beta demand.
- TikTok/Instagram richer import once OQ-1 research finds a compliant method.
- PRD v1.1/v2.0 items: screenshot import, ingredient analysis, skin profile.

## Open items for the owner
1. Create accounts (Phase 0) — Apple first.
2. Store name + trademark check (OQ-4).
3. Who curates Discover and handles creator removal requests (OQ-7)?
4. Who rates the 100-video golden set?
5. Badge list: PRD has two versions. Proposal: 1, 5, 10, 25, 50, 100 looks + 4-week streak.
6. Quick legal review: processing user-uploaded copies of creators' videos (deleted ≤ 24 h, never redistributed).
7. Upload exact PRD text as `docs/PRD.md`.
