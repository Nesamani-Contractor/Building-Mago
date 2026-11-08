-- RLS proof: users can only read/write their own rows. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Two users.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local');
insert into public.profiles (user_id) values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');
insert into public.usage_counters (user_id, month, conversions) values ('11111111-1111-1111-1111-111111111111', '2026-11', 2), ('22222222-2222-2222-2222-222222222222', '2026-11', 4);
insert into public.entitlements (user_id, is_pro) values ('22222222-2222-2222-2222-222222222222', true);
insert into public.import_jobs (user_id, adapter) values ('22222222-2222-2222-2222-222222222222', 'youtube');
insert into public.backups (user_id, ciphertext, iv, wrapped_key) values ('22222222-2222-2222-2222-222222222222', 'x', 'y', 'z');
insert into public.routine_cache (canonical_key, platform, video_id, routine, model_version, hidden) values
  ('youtube:dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ', '{}', 't', false),
  ('youtube:hiddenvid01', 'youtube', 'hiddenvid01', '{}', 't', true);

-- Act as user A.
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is((select count(*)::int from public.profiles), 1, 'A sees only her profile');
select is((select count(*)::int from public.usage_counters), 1, 'A sees only her usage');
select is((select conversions from public.usage_counters), 2, 'A sees her own count');
select is((select count(*)::int from public.entitlements), 0, 'A cannot see B entitlement');
select is((select count(*)::int from public.import_jobs), 0, 'A cannot see B jobs');
select is((select count(*)::int from public.backups), 0, 'Backups are never readable by clients');
select is((select count(*)::int from public.routine_cache), 1, 'Hidden cache rows are invisible');

select throws_ok($$ insert into public.entitlements (user_id, is_pro) values ('11111111-1111-1111-1111-111111111111', true) $$, '42501', null, 'A cannot grant herself Pro');
select throws_ok($$ insert into public.usage_counters (user_id, month) values ('11111111-1111-1111-1111-111111111111', '2026-12') $$, '42501', null, 'A cannot write usage');
select throws_ok($$ insert into public.routine_cache (canonical_key, platform, video_id, routine, model_version) values ('youtube:abcdefghijk', 'youtube', 'abcdefghijk', '{}', 'x') $$, '42501', null, 'A cannot write the shared cache');
select throws_ok($$ insert into public.profiles (user_id) values ('22222222-2222-2222-2222-222222222222') $$, '42501', null, 'A cannot create B profile');

update public.profiles set country = 'UK' where user_id = '22222222-2222-2222-2222-222222222222';
reset role;
select is((select country from public.profiles where user_id = '22222222-2222-2222-2222-222222222222'), null, 'A update of B profile changed nothing');
set local role authenticated;

select throws_ok($$ select public.claim_conversion('11111111-1111-1111-1111-111111111111', 5) $$, '42501', null, 'Clients cannot call quota functions');
select is(public.is_pro('22222222-2222-2222-2222-222222222222'), true, 'is_pro reports server truth');

-- Anonymous (logged-out) callers see nothing private.
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select is((select count(*)::int from public.routine_cache), 0, 'anon cannot read cache');
select is((select count(*)::int from public.profiles), 0, 'anon sees no profiles');

select * from finish();
rollback;
