# Mago PRD Addendum — Save & Organize, Pinned, Greeting, Favorites (D-24)

13 Nov 2026 · Owner: Nesamani · Shareable copy: https://claude.ai/artifact/1VGyA5uH6jYz4VVDFhJHfM

| ID | Feature | What she gets |
|---|---|---|
| FR-ORG | Save & organize after conversion | Every converted video (pasted link or upload) ends on a **Save to your library** sheet: pick categories, create a new one, add her own tags, optionally pin |
| FR-PIN | Pinned: You and your beauty | Pinned section at the top of Home, collapsed to 3 looks, **See all (N)** for the rest; each card shows routine time and last tried |
| FR-GRT | Greeting on every main screen | "Good morning / afternoon / evening, Name" on Home, Library, Discover and Me from the phone's own time zone |
| FR-FAV | Heart = Favorite, everywhere | Heart on every routine card and screen; Favorites row at the top of Library |

## FR-ORG — Save to your library
1. Conversion finishes → `/save/[id]` (modal) shows photo, title, steps, minutes.
2. Category chips (multi-select) + **New category** (case-insensitive duplicates reuse the existing one; empty name refused).
3. Tags: type + Return or comma; suggestions = her most-used tags + the video's tags. Max 10 tags, 24 chars, de-duplicated.
4. **Pin to You and your beauty** toggle.
5. **Save to library** → files it → Unveil. **Not now** → kept in Library unsorted → Unveil.
- "Collections" renamed **Categories** in the UI. Edit later: look page → **Organize** (same screen, `?edit=1`).
- Library search includes her tags; tag chips appear as Library filters (`#tag`).

## FR-PIN — You and your beauty
- Home, under the greeting: eyebrow PINNED + title. Up to 3 rows, newest pin first; **See all (N)** → `/pinned` when > 3.
- Row: photo, title, clock + "N min", "Last tried today / yesterday / N days ago / last week / <date>" or "Not tried yet", heart.
- Pin from the look page (Pin), the Save sheet toggle; long-press a pinned row to unpin. Pinning a sample saves it first.
- Empty state: "Pin looks you love to keep them here." → Library.

## FR-GRT — Greeting
- 5:00–11:59 Good morning · 12:00–16:59 Good afternoon · 17:00–4:59 Good evening, from the phone's local clock (follows her country/time zone; no location permission). Refreshes every minute.
- Name: new optional onboarding step after 18+ (`/onboarding/name`), editable in Me → Your name (`/name`). Max 24 chars, stays on device, never in analytics.
- Shown on Home, Library, Discover (on the hero photo) and Me.

## FR-FAV — Heart
- `HeartButton` on Home picks, pinned rows, Library tiles, Discover tiles, look page, Unveil, completion ("Loved it?").
- Filled plum = favorite. 44pt target, VoiceOver "Add/Remove <look> to/from Favorites", selection haptic, announcement.
- Hearting a Discover sample saves it first. Library: **Favorites** row + Favorites filter.

## Data model (on device, `mago.library.v1`)
`SavedRoutine` gains `userTags?: string[]`, `pinnedAt?: string`, `filed?: boolean` (all optional — older saves keep working). `ProfileState.name` (existing) now collected. New store actions: `file()`, `ensureSaved()`; helpers `normalizeTags`, `pinnedLooks`, `allUserTags`; `lastTriedLabel`, `useGreeting` in `lib/hooks.ts`. Backup (D-02) carries the new fields automatically.

## Analytics
`library_filed` {categories, tags, pinned} · `library_file_skipped` · `routine_favorited` / `routine_unfavorited` · `routine_pinned` / `routine_unpinned` · `pinned_see_all` {count} · `onb_q_name` {result}. No tag text, category names or her name are ever sent.

## Not in this release
Reordering pins by drag; renaming/deleting categories (still from Library later); syncing tags to the server (they travel only in the encrypted backup).
