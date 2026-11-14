# MAGO — Luxury Redesign Brief for Claude Code

> Paste everything below into Claude Code from the root of the `Building-Mago` repo.
> Scope: **presentation layer only**. Keep every route, data model, store, service and business rule as it is.

---

## 0. Your role and the bar

You are a senior iOS product designer and a senior React Native / Expo engineer, working as one person. You have shipped apps at the level of Apple Fitness+, Aesop, Net-a-Porter and Rare Beauty.

Mago is for **elite, premium members**: women aged 18 to 30 who spend real money on beauty. It must feel like a **luxury beauty house's private app**, not a template. The current build fails that bar. Treat this as a full visual and interaction redesign of every screen, not a polish pass.

**The one idea:** *"Your private makeup artist, at your mirror."*
Every screen should feel calm, editorial and expensive, with very little on it. If an element doesn't serve that idea, cut it.

**Two references, each with one job. Do not blend in others.**
- **Editorial surfaces** (Today, Discover, Library, look detail, paywall): a printed luxury beauty magazine. Think *Porter* magazine or Net-a-Porter: full-bleed photography, a serif display face, generous white space, almost no chrome.
- **Follow-along player:** the Apple Fitness+ workout player. Media fills the top, there is one instruction at a time, the controls are huge, and the screen works with busy hands.

---

## 1. Diagnosis: why the current build looks cheap

I rendered the current web build at 393×852 and reviewed every main screen. Fix all of these:

1. **There is no photography anywhere.** Beauty is a visual category, yet every look card is a pastel square holding a generic line icon (star, pencil, heart). The look-detail hero is a beige gradient with a sparkle icon, and Discover's "Trending" cover is an empty peach box. This is the main reason the app looks like a wireframe.
2. **Icons sit in gold-ringed circles on nearly every screen** (onboarding, questions, Add, paywall, Me, empty states). This is a well-known sign of AI-generated UI.
3. **The screens are a pile of cards.** Every section is a white card with a radius of about 24 and a beige border, and all of them get equal weight. Today stacks a link card, a carousel of promo cards with page dots, and a "Your first look" card with a list nested inside it. Nothing leads.
4. **Gold hairline outlines appear everywhere**: chips, circles, card borders, badges. They make the app look like dated wedding stationery rather than luxury.
5. **The type system has no discipline.** There are too many sizes. Mauve-grey body text has low contrast. The "Your stylist's note" screen uses a **handwriting script font**, which looks kitschy and breaks consistency.
6. **Developer and demo copy shows up in the product**, for example: "Voice commands come with the full app", "Demo mode: sign-in is simulated", "Demo mode: no real charge" and "Pictures show the type of product and its shade."
7. **The app explains too much.** The "Share → Copy link → Paste" instructions appear on onboarding, Today, Library and Add. Luxury is quiet confidence.
8. **The follow-along screen, which is the hero feature, is mostly empty space.** It shows one step sentence, a cartoon tube illustration, a generic timer card and a hint pill. It never shows the actual tutorial moment.
9. **The tab bar is flat white with a heavy black FAB** that hangs over the bar, and content bleeds visibly underneath it. There is no material and no depth.
10. **The Me screen is a wall of zeros**: 0/3, 0 looks done, 0 weeks in a row, plus empty numbered badge circles (1, 5, 10, 25, 50, 100). On day one it makes the user feel behind.
11. **The welcome screen's hierarchy is broken.** A half-faded "2 of 3" carousel card sits mid-transition, above a template-style row of three icon features.
12. **The disabled primary button** ("Turn into steps") is a muddy grey-mauve that looks dirty, not quiet.

---

## 2. Non-negotiables

- Don't touch business logic, storage, the Gemini import service, pricing rules, quotas or routes. If a component mixes logic and UI, split it and restyle only the UI half.
- Remove every gold-ringed icon circle in the app. Icons may stand alone at 20 to 24pt, but never inside a decorative ring.
- **Use real photography for every look.** See §5.
- Use one display serif and one UI sans. **Delete the handwriting font.**
- No borders on cards. Separate elements with space, image and tone; reserve shadow for floating layers only.
- Each screen has exactly one primary action and one emphasized element.
- Move all demo and developer copy to `settings/developer` behind `__DEV__` or a demo flag. None of it appears in user-facing UI.
- Every interactive element gets a spring press state, instant feedback, and haptics where the map in §3.6 says so.
- Design and test every screen in light **and** dark mode, at the default and the largest Dynamic Type size, with Reduce Motion on, at a 393×852 safe area.

---

## 3. Design tokens

Build these first, in `src/theme/` (or the repo's existing theme folder). Then replace every hard-coded value in the app with a token.

### 3.1 Color: "Porcelain & Plum"

| Role | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#FAF7F4` porcelain | `#0F0C0D` | screen background |
| `surface` | `#FFFFFF` | `#1A1517` | sheets, raised areas |
| `surfaceSunken` | `#F2ECE7` | `#231C1F` | chips, inputs, segmented controls |
| `ink` | `#1F1418` | `#F6F0EC` | primary text, icons |
| `inkSecondary` | `#6B5A60` | `#B5A6AB` | secondary text (≥ 4.5:1 on bg) |
| `inkTertiary` | `#9C8D92` | `#7D6F74` | captions and meta, large sizes only |
| `hairline` | `rgba(31,20,24,0.08)` | `rgba(246,240,236,0.10)` | dividers only |
| `plum` (accent) | `#4A1F35` | `#E7C9D6` | primary button fill, selection, active tab |
| `onPlum` | `#FFF8F4` | `#2A1220` | text on the primary button |
| `champagne` | `#B8956A` | `#D4B48C` | **decoration only**: progress ring, selected check, one detail per screen. Never use it for text. |
| `blush` | `#F4DDD6` | `#3A2A2E` | soft tint behind media while it loads |
| `success` / `warning` / `error` | `#2F6B4F` / `#9A6A1F` / `#A23B3B` | lighter pairs | semantic only |

Rules: plum is the only strong color in the UI; all other color comes from photography. Gradients are allowed only as image scrims (black or ink at 0 → 55%). Remove every decorative peach-to-pink UI gradient.

### 3.2 Typography

- **Display serif:** Cormorant Garamond **Medium/SemiBold only**, used only at 28pt and above. Track it tighter as it grows: −0.5% at 28pt and −1.5% at 40pt and up. Never use it for body or controls.
- **UI sans:** the iOS system font (SF Pro, via `fontFamily: undefined` / `System`), so you get optical sizing and Dynamic Type for free. Remove DM Sans.
- **Delete the handwriting/script font and its assets.**

| Token | Font | Size/Line | Weight | Notes |
|---|---|---|---|---|
| `display` | Serif | 40/42 | 500 | one per screen, maximum |
| `title1` | Serif | 30/34 | 500 | screen titles |
| `title2` | SF | 22/28 | 600 | section titles |
| `headline` | SF | 17/22 | 600 | card titles |
| `body` | SF | 17/24 | 400 | |
| `callout` | SF | 15/20 | 400 | secondary lines |
| `footnote` | SF | 13/18 | 400 | meta |
| `eyebrow` | SF | 11/14 | 600 | UPPERCASE, +8% tracking, `inkSecondary` |

All text scales with Dynamic Type through `allowFontScaling`. Layouts must reflow without clipping.

### 3.3 Space, radius, elevation

- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32, 40, 56. Screen side margin is 20. The gap between sections is 40.
- **Radii:** 10 for small controls and chips, 16 for list thumbnails, 24 for media cards, 32 for hero media and sheets, full for buttons. Use one radius per size everywhere, with continuous corners (`borderCurve: 'continuous'`).
- **Elevation:** do not use it on content cards. Floating layers (tab bar, sheet, sticky CTA bar) get `0 8 24 rgba(31,20,24,0.08)` plus a blur material.

### 3.4 Iconography

Use **one** set: SF Symbols on iOS (`expo-symbols`), with Lucide at a 1.5 stroke as the Android/web fallback mapped to the same names. Use 22pt in bars and 20pt inline, in `ink` or `inkSecondary` only.

### 3.5 Motion (Reanimated)

- Default spring: critically damped (`damping ratio 1.0`, response about 0.35s).
- Sheets and drawers: damping 0.8, response 0.3, rubber-banding at their edges.
- Step swipe in Follow-along: hand off release velocity and project momentum with `d = 0.998` to choose the next or previous step.
- Press: scale to 0.97 on press-*in* using a 100ms spring. The press cancels if the user scrolls.
- Content arrival: fade in over 200ms. Images fade in when decoded (`expo-image` with `transition={200}`).
- Look card to look detail: a shared-element or zoom transition where the card image becomes the hero image.
- **Reduce Motion:** replace every slide and spring with a 150ms crossfade.

### 3.6 Haptics map (`expo-haptics`)

| Moment | Haptic |
|---|---|
| Tab change, chip and segment select | `selection` |
| Primary button press | `impactLight` |
| Next/previous step, timer start | `impactMedium` |
| Look completed, import finished, Pro started | `notificationSuccess` |
| Import failed, quota reached | `notificationWarning` |

---

## 4. Primitives

Build these in `src/ui/`, then use only these on screens.

`Text` (variant = token) · `PressableScale` (built on `pressto` or Reanimated + Gesture Handler) · `Button` (primary plum / secondary sunken / tertiary text; sizes 56 and 44; loading and disabled states; disabled = `plum` at 35% opacity, never grey) · `MediaCard` (image, scrim, title, meta; ratios 3:4 portrait, 4:5, 16:9) · `ListRow` (thumbnail 56, title, meta, chevron) · `Chip` (sunken fill, no border; selected = plum fill + onPlum text) · `SegmentedControl` · `SectionHeader` (title2 + optional "See all") · `ProgressRing` (champagne stroke 2pt) · `Sheet` (blur material, grabber, spring) · `Skeleton` (shimmer matching the final layout) · `EmptyState` (image or illustration, one sentence, one action) · `Toast` · `GlassBar` (`expo-blur`, intensity about 60, with a hairline top edge).

Delete the old `IconCircle`, the bordered `Card`, and any one-off styled views they replace.

---

## 5. Photography and media: the biggest single fix

- **Sample and Discover looks:** each one needs a 3:4 hero photo plus a 16:9 alternate. For the demo, use properly licensed stock (the Unsplash or Pexels licence), and record source and credit in `assets/looks/CREDITS.md`. Choose images with consistent warm, soft daylight, close crops of face and hands, and no busy backgrounds, so they read as one shoot. Plan a commissioned shoot for launch. **Do not use one-shot AI-generated faces or art.**
- **User-saved looks:** use the source video's thumbnail as the hero, from the YouTube oEmbed thumbnail or the TikTok/Instagram oEmbed `thumbnail_url`. For uploads, use a frame extracted at about 30%. Use the `blush` tint while it loads, never a broken box.
- **Step media in Follow-along:** play the tutorial moment for that step. For YouTube, use the official iframe player seeked to the step's `start` and looped to its `end` (Gemini already returns timestamps; add them to the step model if missing, with a fallback to the look's hero). For uploads, play the clip segment directly.
- **Products:** replace the cartoon tube drawings with one consistent set of refined monochrome product silhouettes (tube, bottle, compact, pencil, pot, palette) drawn in a single style, with a **real shade swatch dot** in the product's colour. When the user has scanned her bag, show **her own product photo** instead.
- **Occasions** (Everyday, Work, Date night, Party, Events) become photo tiles, not icon circles.

---

## 6. Navigation chrome

- **Tab bar:** a `GlassBar` with content scrolling underneath, four tabs (Today, Library, Discover, Me) and a compact 44pt plum `+` button sitting *inside* the bar in the centre (not overhanging it). Active tab: filled symbol + `ink`, label weight 600. Inactive: outline symbol + `inkTertiary`. Remove the dot under the active tab. Labels are 10pt on one line, tap targets are at least 44pt, and the bar respects the home-indicator safe area.
- **Headers:** large-title style. The serif `title1` collapses into a small centred SF title on scroll, with a soft blur edge instead of a hard divider.
- **Back and close:** a plain 22pt symbol on a 44pt hit area. Remove the bordered circle buttons, except over photography, where you use a small glass circle.

---

## 7. Screen by screen

For each screen, design the default, loading (skeleton), empty, error and offline states.

### 7.1 Welcome (`onboarding/index`)
- Show a full-bleed looping video or photo (licensed) of a woman finishing her makeup at a mirror, with a bottom scrim.
- Put the wordmark `MAGO` top-left as an eyebrow in white.
- Headline in the display serif, in white, over the scrim: "Every tutorial, ready for your mirror." Add one callout line beneath it.
- Primary button: "Get started". Text button: "I already have an account".
- **Remove** the fading "2 of 3" card and the row of three icon features.

### 7.2 Age check / Sign in
- Use a plain `bg` screen with `title1` and one body line. Show the privacy assurance as a single line with a lock symbol, not a card.
- Sign in: use native Apple and Google buttons with Apple's required styling. Remove the demo notice.

### 7.3 Questions (`onboarding/questions`)
- Use a thin plum progress bar (2pt) at the top with "1 of 4" as an eyebrow.
- For Q1, Q2 and Q3, use a **2-column grid of 4:5 photo choice cards**, each with its label on a scrim. Selected state: a 2pt plum inset ring, a champagne check badge in the top-right corner, and a `selection` haptic. Q4 is a large segmented 1–7 control with a live label ("3 looks a week").
- Keep the button pinned above the safe area. Its label changes to show the result: "Show my looks".

### 7.4 Preview (`onboarding/preview`)
- Use `title1` "Your first looks are ready", then a **horizontal rail of 3:4 MediaCards** (peek the next card at 15%).
- Replace the "Save looks from YouTube" 3-step card with one line plus a small "How to save from YouTube" text button that opens a sheet. Primary button: "Try my first look".

### 7.5 Today (`(tabs)/index`)
Hierarchy, top to bottom:
1. **Header:** date as an eyebrow, then "Good morning, {name}" in `title1`. Place a 32pt **ProgressRing** for the weekly goal at the right of the header row. Tapping it opens a sheet. Remove the "0 of 3" card.
2. **Hero, the one emphasized element:** a large 4:5 MediaCard showing "Continue: Soft glam, step 4 of 9" if a look is in progress, otherwise "Tonight's look". It shows the title in the serif over a scrim, meta in footnote, and a "Start" pill.
3. **Paste field:** a sunken, search-style field reading "Paste a tutorial link". If the clipboard holds a supported URL (`Clipboard.hasUrlAsync`, with no paste prompt until she taps), show it inline: "Use link from clipboard · youtu.be/…".
4. **Rail:** "Picked for you", with 3:4 cards.
5. **Rail:** "From your library" (hidden when empty).

**Remove** the promo carousel and its page dots. Show at most **one** contextual tip (bag scan, Pro) in total, only after her second completed look, and make it dismissible.

### 7.6 Library (`(tabs)/library`)
- Large title, then a sunken search field.
- Show one row of at most 4 chips (All, Favorites, Under 10 min, Filters…). "Filters…" opens a sheet with occasion, area and duration.
- Collections are 2-up cards whose cover is a 2×2 mosaic of their looks' images, with the serif name and count.
- Looks are a **2-column grid of 3:4 MediaCards**.
- **Empty state:** one editorial image, "Your looks will live here", one body line and the button "Add a tutorial". No icon circle.

### 7.7 Discover (`(tabs)/discover`)
- Treat it like a magazine issue. The cover story is a full-width 4:5 image with an eyebrow ("THIS WEEK"), a serif title and a "Save" glass pill.
- "By occasion": 3:4 photo tiles in a rail.
- "Quick looks · under 10 min": a rail.
- "All looks": a 2-column grid.
- Remove "reviewed by our team" unless it's true; if it is, use an eyebrow: "EDITED BY MAGO".

### 7.8 Look detail (`routine/[id]`)
- Show a **full-bleed hero image** (about 60% of the screen height) that stretches on overscroll, with glass back and share buttons over it.
- Below it: an eyebrow (`FACE · WORK · EVERYDAY`, plain text instead of outlined pills), the serif `title1`, then meta as "6 steps · 10 min · Easy".
- Put favourite, collections and pin in **one** row of three icon buttons (heart, bookmark, pin) with labels in `footnote`. Remove the outlined pills.
- "In this look": a horizontal rail of product tiles (silhouette + shade dot, or her own photo).
- Steps: a numbered list grouped by phase. Phase names are eyebrows. Each row shows a thumbnail frame, one line of text, and the timestamp.
- Make Simplify (Pro) a single quiet row with a "PRO" eyebrow, not a bordered card.
- Sticky bottom `GlassBar`: secondary "Plan" (44pt icon + label) and primary "Start this look".

### 7.9 Stylist's note (`brief/[id]`)
- Style it as a printed card. Remove the handwriting font.
- Serif title, then one sentence in the stylist's voice in `body`.
- "The plan" shows three phases on a vertical champagne hairline timeline.
- "Lay these out first": a 3-column grid of product tiles with a check overlay if she owns them.
- Primary button: "Begin the look". Text button: "Not now". Make "Read aloud" a small speaker icon button at top-right. It must use a pleasant female voice.

### 7.10 Follow-along (`follow/[id]`), the hero experience. Spend the most care here.
- **Top 55%:** the step's video segment, full-bleed, looping, with rounded bottom corners (radius 32). Over it: a glass close button top-left, glass speaker and "1 of 6" top-right, and segmented progress (6 segments, 3pt, white at 35% / 100%) across the top.
- **Below:** the phase as an eyebrow ("PREP"), then the step instruction in the serif at 28/32, with a maximum of 3 lines.
- **Products for this step:** a horizontal row of 64pt tiles (silhouette + shade dot or her photo). Tapping one opens a sheet with details. This shows for every user, not only Pro.
- **Timed steps:** the timer lives *inside* the Next button as a champagne ring that fills, with a "Start 60s timer" text button above. Remove the separate timer card.
- **Controls:** a 64pt-tall bottom bar with a 56pt "previous" button and a full-width primary "Next step". On the last step the label becomes "Finish look".
- **Gestures:** swipe left or right to change steps, tracking 1:1 with velocity projection and a spring settle. Rubber-band at the first and last step. `impactMedium` on commit.
- Keep the screen awake (`expo-keep-awake`). Use large hit areas, because her hands are busy.
- Remove "Swipe or tap. Voice commands come with the full app." Show a one-time coach mark on her first use only: "Swipe to move between steps".
- **The before-photo prompt** becomes an optional bottom sheet *before* step 1 ("Take a before photo?" with "Take photo" / "Skip"). Use a pre-permission explanation, then the system prompt only if she taps Take photo.

### 7.11 Complete (`complete/[id]`), the peak moment
- Show her after photo (if taken) side by side with the before photo, or the look's hero image. The serif title reads "Look complete."
- Show a subtle champagne shimmer sweep once, with a `notificationSuccess` haptic.
- Show progress toward her weekly goal ("2 of 3 this week"). Never show a zero.
- Actions: primary "Share my look" (opens the share card), secondary "Back to Today".

### 7.12 Add a look (`add/index`) and import (`import/[id]`)
- `title1` "Add a tutorial". Put a large sunken URL field at the top with an inline "Paste" button. If the clipboard has a supported link, pre-fill it.
- Show the primary button "Turn into steps" (disabled = plum at 35%).
- Make "Upload a video" and "Write it myself" two quiet `ListRow`s below a hairline. Remove the "How it works" card and move it into a "?" sheet.
- Quota line in `footnote`: "4 of 5 free this month · Refreshes Nov 30".
- **Import loading:** show the source thumbnail at the top, then the real steps as they happen, with shimmer text: "Watching the tutorial…", "Finding each step…", "Matching products…", "Writing your plan…". Each line gets a check when done. They must reflect real pipeline stages. End with `notificationSuccess` and a zoom transition into the look detail.
- **Errors:** name the problem and the fix, for example "This video is private. Try a public link, or upload the video instead." Add a retry button.

### 7.13 Paywall (`paywall`)
- Top 45%: a **real product shot**, a device-free capture of the Follow-along screen over a lifestyle photo, with a scrim. Eyebrow `MAGO PRO`, serif title "Every tutorial, ready for your mirror".
- Show three benefits as plain lines with a small champagne check, no icon circles.
- Plans are two selectable rows. Yearly is selected by default and shows "$3.33/mo · billed $39.99/yr" with a "Save 44%" plum chip.
- Keep the trial timeline (Today / Nov 13 reminder / Nov 15 charge) on a champagne vertical line. Keep it truthful and actually send the reminder.
- Primary button: "Start my free week". Put "Cancel anytime in Settings" beside it. Shrink the legal text to `footnote` in `inkTertiary`, and remove "Demo mode".

### 7.14 Me (`(tabs)/me`)
- Show the large title, then her name and "Member since November 2026".
- Show stats only once they're non-zero. Before that, show one warm line: "Your first look unlocks your glow-up timeline."
- Glow-up timeline: a rail of before/after pairs, or one elegant empty image.
- Badges: hide them until the first one is earned. Make them real objects (engraved medallions, commissioned art) instead of numbered circles.
- Settings, Planner, Backup, Invite and Pro go in an iOS-style grouped `ListRow` list.

### 7.15 Planner, Bag, Settings, Share card, Notifications
Apply the same tokens and primitives. Planner uses a week strip with day selection and a `selection` haptic, and looks shown as rows with thumbnails. Bag scan uses the camera full-bleed with a glass bottom sheet listing what was recognised. The share card is a 9:16 editorial composition: her after photo, serif title, a small `MAGO` wordmark, and no UI chrome.

---

## 8. Copy rules

- Buttons are a verb plus an object: "Start this look", "Turn into steps", "Start my free week", "Add a tutorial".
- Explain each idea once, in the place where it's needed. Delete repeated how-to text.
- Use specific numbers: "6 steps · 10 min", "4 of 5 free this month".
- Write in the voice of a warm, confident makeup artist. Avoid exclamation marks and emoji.
- Every error names the problem and the fix.

---

## 9. How to work

1. Create a branch, `design/luxury-v2`.
2. Build tokens (§3) and primitives (§4) first. Add a hidden `/dev/ui` route that shows every primitive in light and dark mode.
3. Redesign in this order: **Follow-along → Look detail → Today → Add/Import → Paywall → Discover → Library → Onboarding → Me → the rest.**
4. After each screen, render the web build at 393×852 in light and dark mode, take screenshots, and compare them against this brief. Run another pass and ask "can this feel better?" before moving on.
5. Don't add new libraries beyond these: `react-native-reanimated`, `react-native-gesture-handler`, `pressto`, `moti`, `expo-image`, `expo-blur`, `expo-haptics`, `expo-symbols`, `expo-keep-awake`, `react-native-keyboard-controller`, `expo-linear-gradient` (scrims only).
6. Commit per screen with before/after screenshots in the PR description.

---

## 10. Acceptance checklist (every screen must pass)

- [ ] It has real imagery wherever a look appears, with no icon placeholders.
- [ ] It has no gold-ringed icon circles, no bordered cards and no handwriting font.
- [ ] It has one emphasized element and one primary action.
- [ ] Only tokens are used, with no hard-coded colours, sizes or radii.
- [ ] Text contrast is at least 4.5:1 for body text and at least 3:1 for inactive UI. No custom glass sits behind body text.
- [ ] Spring press states, instant response, and haptics per §3.6.
- [ ] Skeleton, empty, error and offline states are designed.
- [ ] Light, dark, largest Dynamic Type and Reduce Motion all work.
- [ ] No demo or developer copy is visible.
- [ ] Tab bar: glass, 4 tabs + inline `+`, an active state with two changes, 44pt targets, and the safe area respected.
- [ ] It passes the test: "Would this screen look at home in a luxury beauty house's own app?"

Finish with a **craft list**: the small details you added and why each one matters, plus a 1–5 score for point of view, consistency and execution.
