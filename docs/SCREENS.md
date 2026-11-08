# Mago — Screens (v1.0)

IDs marked *(PRD S-xx)* match the PRD; others are new IDs from this plan (M-xx).
Every screen supports: **loading** (skeleton), **empty** (helpful + next action), **error** (what happened + what to do + retry), **offline**, **success**. Only exceptions are noted.
Layout: iPhone first; on iPad, Library and Routine detail become two-pane, Follow-Along stays single-focus with larger type.

## Navigation map
```
First launch: Welcome reel → Age 18+ → Q1–Q4 → Personalised preview → Today
Tabs: Today · Library · (+) · Discover · Me
(+) → Add sheet → Paste link | Upload | Write manually → Processing → Routine detail
Routine detail → Start → Before photo → Steps → After photo → Completion → Share card
Paywall: 6th conversion · Simplify · Me → Pro · soft after first aha
```

## Onboarding
| ID | Screen | Purpose | Key components | Notes / states |
|---|---|---|---|---|
| S-02 | Welcome reel | Show the value in 10–15 s | Looping clip, headline "Save it. Do it. See the glow-up.", "Get started" pill, "I already have an account" link | No network needed (bundled video) |
| M-01 | Age confirmation | 18+ gate (D-08) | Short line, "I'm 18 or older" pill, "I'm under 18" link | Under 18 → kind block screen, nothing stored |
| M-02–05 | Four questions | Personalise | One question per screen, large chips, Skip always visible, progress dots | See table below |
| S-07 | Personalised preview | First "aha" | 3 matched Discover routines, share-from-your-app animation, "Try one" pill | Anonymous account created silently; Discover offline → bundled starters |
| M-06 | Sign in (existing user) | Restore entitlements | Sign in with Apple, Sign in with Google, Terms/Privacy | Errors: cancelled, network, account not found |
| M-07 | UK analytics consent | GDPR (D-09) | Plain explanation, Allow / Not now | UK only |

**What each answer changes**
| Question | Changes |
|---|---|
| Main goal | Which 3 routines appear in the preview and as Today starters |
| Where she finds looks | Which share-tip animation she sees; Add sheet order (e.g. YouTube first) |
| Skill level | Step hints shown or hidden by default; Discover difficulty filter |
| Looks per week (1–7) | Her weekly streak goal N |

## Tabs
| ID | Screen | Purpose | Key components | Empty / special states |
|---|---|---|---|---|
| M-10 | Today | Daily home | Unfinished session card, today's planned look + Start, weekly streak ring, pinned, recent imports, one Discover pick | New user: "Your first look" + 3 starters |
| M-11 | Library | Her saved looks | Search bar, filter chips (category, occasion, time, collection, favorites, recently done), routine cards, collections row | Empty: "Share a tutorial to Mago" with how-to; search no-results |
| M-12 | Add sheet (+) | Start an import | Paste link (auto-reads clipboard with permission), Upload video, Write manually | Offline: link saved as "Pending" |
| M-13 | Discover | Looks to try | Rails: Trending this week, By occasion, Quick looks < 10 min, Because you saved; one-tap Save | Offline: cached rails; error: retry |
| M-14 | Me | Progress + account | Glow-up timeline preview, badges, stats, referral card, Pro status, Settings entry | No photos yet: explain + "Start a look" |

## Import
| ID | Screen | Purpose | Key components | States |
|---|---|---|---|---|
| M-20 | Paste link | Validate a link | Text field, live validation (allowed hosts), Continue | Unsupported link, duplicate ("Already in your library → Open") |
| M-21 | Upload | Upload a saved video | Picker (videos ≤ 15 min), resumable progress, cancel | Too long/large, upload failed → retry |
| M-22 | Guided upload (TikTok/IG) | When metadata isn't enough (D-05) | 3-step visual: Save video → Open Mago → Upload; "Write it myself" | — |
| M-23 | Manual routine editor | No-AI routine | Title, optional link, reorderable steps, optional products | Unsaved-changes guard |
| S-08 | Processing / routine placeholder | Honest progress | Stage list (Received → Watching → Writing steps → Checking products → Ready), Save now, "We'll notify you" | Private video, no speech, non-English (D-07: "English videos only for now"), limit reached → paywall, failed → retry/manual |
| M-24 | Notification pre-permission | Ask after first success | Benefit copy (routine ready, planner reminders, weekly nudge), Allow / Not now | Shown once after first successful import |
| M-25 | Routine detail | Review before doing | Title, creator credit + source, time, difficulty, sections → steps, product chips ("Check this" < 0.6), mini player (D-06), Start pill, Plan, Simplify (Pro), add to collection | Low-confidence banner; source removed → still usable |
| M-26 | Routine edit | Fix AI mistakes | Edit/reorder/delete steps and products | — |

## Follow-Along (hero)
| ID | Screen | Purpose | Key components | Notes |
|---|---|---|---|---|
| S-14 | Before photo | Capture "before" | Front camera, face outline, ghost overlay (30%) from last time, auto-capture, shutter, Skip | Camera denied → skip + Settings hint |
| M-30 | Voice pre-permission | Opt into hands-free | "Say next, back, repeat", Allow mic / Use taps | First Follow-Along only (D-10) |
| S-15 | Step | One step at a time | Huge step text, hint toggle, product chips, "Watch this step", progress bar, Next pill (large), swipe, timer when needed, read-aloud, mic indicator | Screen kept awake; resume ≤ 7 days; arm's-length sizing |
| S-16 | After photo | Capture "after" | Same guide + ghost matched to before | Skip always visible |
| S-17 | Completion | Celebrate | Before/after slider, 3–6 word celebration, one signature animation + haptic, "Done N times", rating, optional note, Share card · Plan it again · Done | Counts toward weekly streak |
| S-18 | Share card composer | Share the result | 9:16 and 1:1 templates, photo toggle, caption with referral link (editable), system share sheet | Photos shared only on explicit tap |

## Habit layer
| ID | Screen | Purpose | Key components |
|---|---|---|---|
| M-40 | Plan sheet | Schedule a look | Date (≤ 60 days), occasion, optional time, repeat weekdays |
| M-41 | Planner calendar | See plans | Month view with dots, day list, empty day → "Plan a look" |
| M-42 | Glow-up timeline | Progress photos | Chronological pairs, filter by routine, compare any two side by side |
| M-43 | Badges & stats | Milestones | Badges (list to reconcile), looks completed, weeks met |

## Growth & money
| ID | Screen | Purpose | Key components |
|---|---|---|---|
| M-50 | Referral | Invite friends | Personal link, share, status list (installed → activated → rewarded), cap info |
| S-26 | Paywall | Upgrade | Benefit headline, 3–4 benefits (unlimited conversions, Simplify, …), yearly pre-selected with savings + 7-day trial in plain words and charge date, monthly option, Restore, Terms/Privacy, always-visible close |
| M-51 | Simplify result | Shorter variant | Original ↔ Simplified switch, step count comparison |

## Settings (from Me)
| ID | Screen | Contents |
|---|---|---|
| M-60 | Settings home | Account, Subscription, Notifications, Backup & restore, Privacy, Help, Legal |
| M-61 | Account | Link Apple/Google, sign out, delete account |
| M-62 | Subscription | Status, renewal date, Manage (opens store), Restore |
| M-63 | Notifications | Routine ready, planner reminders, weekly nudge; quiet hours info |
| M-64 | Backup & restore | Last backup time, Back up now, Restore (D-02) |
| M-65 | Privacy | Analytics consent, step photos on/off, save photos to Photos (opt-in), Export my data, Delete all local data |
| M-66 | Delete account | Plain explanation of what's deleted, confirm, offer local wipe |
| M-67 | Legal | Terms, Privacy Policy, licenses |
