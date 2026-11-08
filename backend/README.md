# Mago backend (Supabase)

Plain version: the server turns videos into steps, tracks limits and subscriptions, and keeps an encrypted backup. Her library and photos never come here.

## One-time setup (when you have accounts)
1. Create a Supabase project (free tier to start; Pro ~$25/mo at launch).
2. Install the Supabase CLI, then from `backend/`:
   ```
   supabase link --project-ref <your-project-ref>
   supabase db push                 # creates tables, RLS, functions, bucket
   supabase test db                 # runs the RLS proof tests
   ```
3. Add secrets (never put these in the app):
   ```
   supabase secrets set GEMINI_API_KEY=... ANTHROPIC_API_KEY=... \
     REVENUECAT_SECRET_KEY=... REVENUECAT_WEBHOOK_SECRET=... \
     WORKER_SECRET=$(openssl rand -hex 32) BACKUP_MASTER_KEY=$(openssl rand -base64 32)
   # optional: GEMINI_MODEL, CLAUDE_MODEL
   ```
4. Deploy the API: `node ../scripts/sync-shared.mjs && supabase functions deploy`
5. Schedule the worker and the upload purge (SQL editor, with pg_cron + pg_net enabled):
   ```sql
   select cron.schedule('import-worker', '10 seconds',
     $$ select net.http_post(url := '<project-url>/functions/v1/import-worker',
        headers := jsonb_build_object('Authorization', 'Bearer <WORKER_SECRET>')) $$);
   select cron.schedule('purge-uploads', '0 * * * *',
     $$ select net.http_post(url := '<project-url>/functions/v1/purge-uploads',
        headers := jsonb_build_object('Authorization', 'Bearer <WORKER_SECRET>')) $$);
   ```
6. In RevenueCat, point the webhook to `<project-url>/functions/v1/rc-webhook` with header `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`.
7. Turn on Anonymous sign-ins, Apple and Google in Supabase Auth.

## API
| Function | Who calls it | What it does |
|---|---|---|
| `import-start` | app | Allow-list + normalise link → shared cache (free, instant) → rate limit (10/h) → daily AI spend cap → server-side quota → queue |
| `import-worker` | cron only | Gemini watches the video → language gate (English only, D-07) → Claude writes steps → validate → cache. Refunds the credit on any failure |
| `import-status` | app | The caller's own job only |
| `upload-url` | app | Signed, expiring upload URL in the private bucket (MP4/MOV/WebM, ≤ 500 MB) |
| `simplify` | app | Pro-only, checked on the server |
| `backup` | app | AES-256-GCM, key wrapped by `BACKUP_MASTER_KEY`; linked accounts only |
| `rc-webhook` | RevenueCat | Trial, purchase, renewal, cancel, billing grace, expiry, transfer → `entitlements` |
| `referral` | app | Claim a code at install; reward both on first completed look (cap 12/yr) |
| `delete-account` | app | Deletes uploads + the auth user (cascades to every table) |
| `purge-uploads` | cron only | Deletes uploads older than 24 h |

## Security notes
- Every table has RLS; clients can never write entitlements, usage, cache or backups.
- The server never fetches a user-typed URL — only official APIs with a parsed video ID.
- Errors returned to the app are human messages; provider errors and stack traces stay server-side.
- TikTok/Instagram: public metadata only, then guided upload (D-05). Instagram oEmbed needs a Meta app token (OQ-1).
