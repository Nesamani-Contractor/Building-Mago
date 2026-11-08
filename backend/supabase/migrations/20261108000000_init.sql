-- Mago v1 schema. The server stores only: accounts, the shared routine cache, usage, entitlements,
-- referrals, encrypted backups and app config. Never photos, notes, transcripts or her library.
-- Row Level Security is ON for every table (tests: backend/supabase/tests/rls.test.sql).

create extension if not exists pgcrypto;
create extension if not exists pgmq;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  age_confirmed_at timestamptz,
  country text check (country in ('US', 'UK', 'other')),
  linked_provider text check (linked_provider in ('apple', 'google'))
);
alter table public.profiles enable row level security;
create policy "own profile: read" on public.profiles for select using (auth.uid() = user_id);
create policy "own profile: insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "own profile: update" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------- shared routine cache
-- One row per public video. Built only from public videos, never from user data.
create table public.routine_cache (
  id uuid primary key default gen_random_uuid(),
  canonical_key text not null unique check (canonical_key ~ '^(youtube|tiktok|instagram):[A-Za-z0-9_-]{5,40}$'),
  platform text not null check (platform in ('youtube', 'tiktok', 'instagram')),
  video_id text not null,
  creator_name text,
  language text not null default 'en',
  routine jsonb not null,
  model_version text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.routine_cache enable row level security;
create policy "signed-in users read visible cache" on public.routine_cache for select to authenticated using (hidden = false);
-- No insert/update/delete policies: only the service role (Edge Functions) writes.

-- ---------------------------------------------------------------- import jobs + log
create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  canonical_key text,
  adapter text not null check (adapter in ('youtube', 'tiktok', 'instagram', 'upload')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'ready', 'failed', 'non_english', 'needs_upload')),
  stage smallint not null default 0 check (stage between 0 and 4),
  routine_cache_id uuid references public.routine_cache (id),
  routine jsonb, -- upload results are user-scoped and not shared
  error_code text,
  est_cost_usd numeric(8, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index import_jobs_user_idx on public.import_jobs (user_id, created_at desc);
alter table public.import_jobs enable row level security;
create policy "own jobs: read" on public.import_jobs for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------- usage counters
create table public.usage_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  conversions int not null default 0,
  simplify_count int not null default 0,
  primary key (user_id, month)
);
alter table public.usage_counters enable row level security;
create policy "own usage: read" on public.usage_counters for select using (auth.uid() = user_id);

-- Atomic quota claim used by import-start (prevents racing past the limit).
create or replace function public.claim_conversion(p_user uuid, p_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare m text := to_char(now() at time zone 'utc', 'YYYY-MM');
declare used int;
begin
  insert into usage_counters (user_id, month) values (p_user, m) on conflict do nothing;
  update usage_counters set conversions = conversions + 1
    where user_id = p_user and month = m and conversions < p_limit
    returning conversions into used;
  return used is not null;
end $$;
revoke all on function public.claim_conversion(uuid, int) from public, anon, authenticated;

create or replace function public.refund_conversion(p_user uuid)
returns void language sql security definer set search_path = public as $$
  update usage_counters set conversions = greatest(0, conversions - 1)
  where user_id = p_user and month = to_char(now() at time zone 'utc', 'YYYY-MM');
$$;
revoke all on function public.refund_conversion(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- entitlements (mirror of RevenueCat)
create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_pro boolean not null default false,
  product_id text,
  expires_at timestamptz,
  in_grace boolean not null default false,
  source text not null default 'revenuecat',
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
create policy "own entitlement: read" on public.entitlements for select using (auth.uid() = user_id);

create or replace function public.is_pro(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_pro and (expires_at is null or expires_at > now() or in_grace)
                   from entitlements where user_id = p_user), false);
$$;
revoke all on function public.is_pro(uuid) from public, anon;
grant execute on function public.is_pro(uuid) to authenticated;

-- ---------------------------------------------------------------- referrals
create table public.referral_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{6}$')
);
alter table public.referral_codes enable row level security;
create policy "own code: read" on public.referral_codes for select using (auth.uid() = user_id);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users (id) on delete cascade,
  referee_id uuid not null unique references auth.users (id) on delete cascade,
  status text not null default 'installed' check (status in ('installed', 'activated', 'rewarded')),
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  check (referrer_id <> referee_id)
);
alter table public.referrals enable row level security;
create policy "parties read own referrals" on public.referrals for select using (auth.uid() in (referrer_id, referee_id));

-- ---------------------------------------------------------------- encrypted backups (D-02)
create table public.backups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  wrapped_key text not null,
  key_version smallint not null default 1,
  schema_version smallint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.backups enable row level security;
-- No client policies at all: only the backup Edge Function (service role) reads/writes, after
-- verifying the caller's JWT and that the account is linked.

-- ---------------------------------------------------------------- Discover + config
create table public.discover_items (
  id uuid primary key default gen_random_uuid(),
  routine_cache_id uuid not null references public.routine_cache (id) on delete cascade,
  rail text not null check (rail in ('trending', 'occasion', 'quick', 'translated', 'starter')),
  rank int not null default 0,
  published boolean not null default false,
  hidden boolean not null default false
);
alter table public.discover_items enable row level security;
create policy "everyone reads published" on public.discover_items for select using (published and not hidden);

create table public.app_config (
  key text primary key,
  value jsonb not null
);
alter table public.app_config enable row level security;
create policy "everyone reads config" on public.app_config for select using (true);

insert into public.app_config (key, value) values
  ('adapters', '{"youtube": true, "tiktok": true, "instagram": true, "upload": true}'),
  ('limits', '{"free_per_month": 5, "pro_fair_use": 150, "max_video_minutes": 15, "max_upload_mb": 500, "imports_per_hour": 10}'),
  ('ai', '{"daily_spend_cap_usd": 25}');

-- ---------------------------------------------------------------- queue + housekeeping
select pgmq.create('import_jobs');

create table public.upload_objects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  storage_path text not null,
  expires_at timestamptz not null default now() + interval '24 hours',
  unique (user_id, sha256)
);
alter table public.upload_objects enable row level security;
create policy "own uploads: read" on public.upload_objects for select using (auth.uid() = user_id);

-- Private bucket for temporary uploads (deleted ≤ 24 h by the purge function).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', false, 524288000, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;
create policy "own upload folder: insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
