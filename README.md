# Mago

Turn beauty tutorials (YouTube, TikTok, Instagram) into calm, step-by-step looks you follow at the mirror.
iOS + Android from one Expo codebase. **Current state: full v1 app running in demo mode** — see [`docs/STATUS.md`](docs/STATUS.md) for exactly what is real and what is simulated.

## What's where

```
Building-Mago/
├─ apps/mobile/            ← the app (front end): Expo SDK 58, React Native, TypeScript, Expo Router
│  ├─ src/app/             ← every screen (file = route)
│  ├─ src/design/          ← design tokens: colors, type, spacing, motion, haptics (Warm luxury A)
│  ├─ src/components/      ← buttons, cards, icons, ambient glow, states, photo capture …
│  ├─ src/data/            ← on-device storage: library, sessions, plans, settings
│  ├─ src/services/        ← import pipeline client, purchases, analytics, voice, Supabase
│  └─ .maestro/            ← end-to-end test flows
├─ packages/shared/        ← rules shared by app + server (routine schema, link allow-list, streaks, quotas) + tests
├─ backend/supabase/       ← back end
│  ├─ migrations/          ← database tables, Row Level Security, quota functions, storage bucket
│  ├─ tests/               ← RLS proof tests (pgTAP)
│  └─ functions/           ← the API (Edge Functions) + _shared services (Gemini, Claude, source adapters)
├─ scripts/                ← sync-shared.mjs (copies shared rules into the backend)
└─ docs/                   ← PRD, build plan, architecture, screens, status
```

## See it on your iPad

### Option 1 — Web preview (no setup)
Open the preview link from Claude in Safari on your iPad. It's the same app compiled for the web.
Camera, read-aloud and haptics behave like a browser, not like the native app.

### Option 2 — Expo Go (the real app, no Apple account needed)
On your Windows computer, one time:
1. Install **Node.js LTS** from https://nodejs.org and **Git** from https://git-scm.com.
2. Open **Command Prompt** and run:
   ```
   git clone https://github.com/Nesamani-Contractor/Building-Mago.git
   cd Building-Mago\apps\mobile
   npm install
   ```
Every time you want to test:
3. In `Building-Mago\apps\mobile` run: `npx expo start --tunnel` (say yes if it offers to install a helper).
4. On the iPad, install **Expo Go** from the App Store, open the **Camera** app and scan the QR code shown on your computer.
5. Mago opens inside Expo Go. Keep the computer window open while you test.

If Expo Go says the SDK isn't supported, update Expo Go from the App Store.

### Option 3 — TestFlight (later)
Needs the Apple Developer account ($99/yr). Then `npx eas-cli@latest build --profile preview --platform ios` builds in the cloud — no Mac needed.

## For developers

```
cd packages/shared && npm install && npm test          # 32 rule tests
cd apps/mobile && npm install
npx tsc --noEmit && npx expo lint                      # typecheck + lint
npx expo start                                         # dev server
npx expo export -p web                                 # web build → dist/
cd backend/supabase/functions && deno check */index.ts # API typecheck
supabase test db                                       # RLS tests (needs Supabase CLI + Docker)
```
Rules every contributor (human or AI) follows: [`CLAUDE.md`](CLAUDE.md).
