begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(9);

select has_table('public', 'profiles', 'profiles table exists');
select is((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), true, 'profiles RLS enabled');

-- A normal email sign-up gets a profile.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('33333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profile-test-a@example.invalid', '', now(), now());
select is((select email from public.profiles where id = '33333333-3333-4333-8333-333333333333'), 'profile-test-a@example.invalid', 'sign-up creates a profile');

-- A guest (anonymous user) does not, until they add an email.
insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
values ('44444444-4444-4444-8444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());
select is((select count(*) from public.profiles where id = '44444444-4444-4444-8444-444444444444'), 0::bigint, 'guest has no profile');

update auth.users set email = 'profile-test-b@example.invalid', is_anonymous = false
where id = '44444444-4444-4444-8444-444444444444';
select is((select email from public.profiles where id = '44444444-4444-4444-8444-444444444444'), 'profile-test-b@example.invalid', 'guest who signs up gets a profile');

update auth.users set email = 'profile-test-a2@example.invalid'
where id = '33333333-3333-4333-8333-333333333333';
select is((select email from public.profiles where id = '33333333-3333-4333-8333-333333333333'), 'profile-test-a2@example.invalid', 'email change updates the profile');

-- Users only see, and can't edit, their own profile.
set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select is((select count(*) from public.profiles where id in ('33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444')), 1::bigint, 'user sees only own profile');
select throws_ok($$update public.profiles set email = 'x@example.invalid' where id = '33333333-3333-4333-8333-333333333333'$$, '42501');
reset role;

set local role anon;
select throws_ok($$select * from public.profiles$$, '42501');
reset role;

select * from finish();
rollback;
