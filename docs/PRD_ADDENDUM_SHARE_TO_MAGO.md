# Mago PRD — Addendum A: Share to Mago (YouTube) & the product-rich routine

*Adds to Mago PRD v2.0. Status: draft for owner approval, 13 Nov 2026. Paste this whole section into the Google Doc PRD.*

## A1. Problem and goal
She finds a makeup video on YouTube and wants to do the look. Today she has to pause and rewind, and she guesses the products. **Goal:** from YouTube she taps **Share → Mago**. Within about a minute she has a routine of fewer than 10 steps. Every step shows the product she needs, as a picture on the right side of the instruction, with its shade and how much to use.

## A2. User flow
1. In the YouTube app she taps **Share** and picks **Mago** from the share sheet. If Mago isn't in the first row, she taps **More** and Mago is listed there.
2. Mago opens straight to **Unveil a look** with the link already filled in. There is one button: **Unveil this look**. A short line shows her free looks left this month (D-03).
3. The video is processed on the server while she watches a progress screen. She can close the app; a notification tells her when it's ready.
4. **The Unveil** screen plays (D-21): the step cards appear, then the routine page opens.
5. In **Follow-Along**, the product picture sits on the right of every step instruction.

## A3. Functional requirements

| ID | Requirement |
|---|---|
| FR-SHR-01 | Mago appears in the iOS and Android share sheet for links: an iOS Share Extension and an Android `ACTION_SEND` intent filter for text and URLs. |
| FR-SHR-02 | A shared link opens **Unveil a look** with the link pre-filled. Only allow-listed hosts are accepted (CLAUDE.md security rules). Any other link shows "Mago works with YouTube, TikTok and Instagram links". |
| FR-SHR-03 | If the video was already unveiled (cached as `platform:video_id`), the routine opens instantly and no credit is used. |
| FR-SHR-04 | The server runs the **Owner Extraction Prompt (A4) word for word**, plus the Mago output rules (A5). |
| FR-SHR-05 | **All signals are read.** The video may be silent, captioned, narrated, music-only, noisy, or only show products. Products are extracted from speech, on-screen captions and text, packaging shown to the camera, and what is visibly applied. |
| FR-SHR-06 | **Product list:** the complete list with brand, product name and shade, each with a confidence score. Never invent a brand or shade; unsure items show "Check this". |
| FR-SHR-07 | **Product picture on every step, on the right of the instruction (mandatory):** a floating studio tile that pops in when the step appears and gently floats and turns. It shows the shade dot and the shade name, with an "In your bag / Swap / Not in your bag" status. "+N" means the step uses more products; tapping opens **See every product**. |
| FR-SHR-08 | **Three skill levels** per step. Expert: a one-liner. Intermediate: the default. Novice: detailed. Each names the product and the estimated quantity. The level is set in Settings → Skill level and can be switched inside Follow-Along. |
| FR-SHR-09 | **Waits:** when a step needs a wait (for example, let primer set for 60 s), the step shows a timer and Next stays available. |
| FR-SHR-10 | **Timestamps:** each step stores its start and end time in the source video. "Watch this step" plays exactly that clip (D-06). |
| FR-SHR-11 | **Fewer than 10 steps** for AI-made routines (`AI_TARGET_MAX_STEPS = 9`). |
| FR-SHR-12 | **Title and tags:** an appropriate title, plus category tags such as "Date Night", "5 Min Lip Gloss" or "10 Min Workday". Also an estimated total time. |
| FR-SHR-13 | **Step visuals:** each step shows the frame at its start timestamp. For uploads, the frame comes from her own on-device file. Generated step illustrations are a later phase (cost and accuracy review first). |
| FR-SHR-14 | Language: English only in v1 (D-07). Non-English videos show "English videos only for now", and no credit is charged. |

## A4. Owner Extraction Prompt (use exactly)
> You are an expert makeup artist. Review the attached video/YouTube video in the link and prepare a step by step make up tutorial. Your output should include the following details from the video: 1. An appropriate title for the makeup routine 2. Category tags for the makeup routine. It will be things like "Date Night", "5 Mins lip gloss", "10 min workday" etc. 3. An estimated time to complete the makeup. 4. Complete list of products used in the makeup with brand name, shade, product name etc. Prepare this as a list and get images from Internet to show the products. 5. A step by step make up instruction with required product and estimated quantity. Generate visuals to show the step being performed. Generate instructions for 3 type of users:  a. expert in makeup - need a brief one liner about the steps with the product and estimated quantity. b. Intermediate in makeup - Need a bit more detail on how to complete the step along with required product and estimated quantity. c. Novice/New to makeup: A detailed instruction on how to complete this step along with product name and estimated quantity. 6. When any step requires some wait before the next step, capture it in the step by step breakdown and indicate how much time the user needs to wait before going to the next step. 7. Include the start and end timestamps for each of these steps from the original video.  8. Keep the maximum number of steps to under 10.

*In code: `OWNER_PROMPT` in `backend/supabase/functions/_shared/ai.ts`. It is used by both stages: Gemini watching the video, and Claude structuring the routine (D-04).*

## A5. How Mago fulfils items 4 and 5 (images)
- **Product images (item 4).** The model does **not** fetch images from the internet. Copying brand photos without permission is a copyright and App Store risk. Instead:
  - **Launch:** the server matches brand + product + shade to a **licensed retailer catalog** (an affiliate feed, e.g. Ulta/Sephora via Rakuten, or Amazon Product Advertising API). The feed grants display rights and also gives a "Shop" link. The match is saved as `imageUrl`.
  - **Until then / no match:** Mago shows its own **4K studio render** for that product type in the matching shade (D-22). These renders have no logos or brand names.
- **Step visuals (item 5).** These are frames taken from the video at each step's start timestamp. AI-generated step illustrations are not in v1.

## A6. Output contract (what the server returns)
`Routine` with:
- `title`, `tags[]`, `totalTimeMin`, `category`, `occasion[]`, `difficulty`
- `products[]`: `{ ref, brand, name, shade, shadeHex, kind, confidence, imageUrl? }`
- `sections[].steps[]`: `{ text (intermediate), levels.expert, levels.novice, amount, productRefs[], waitSec?, timestampSec, endTimestampSec, hint? }`

It is validated by `validateRoutine`, with one automatic retry that feeds back the validation errors.

## A7. Success measures
- Share → routine ready: median under 60 s.
- Product recall on the golden set: at least 90% of products named in the video are listed, and at least 95% of listed products are real (not invented).
- At least 85% of steps have a product tile with a correct shade family.
- At least 40% of first-time sharers start Follow-Along.

## A8. Open questions for the owner
1. Which retailer feed should we apply to first (affiliate approval takes 1–4 weeks)?
2. Should the skill level be asked during onboarding, or default to Intermediate?
3. "Shop this product" links: show them in v1 (affiliate revenue), or later?
