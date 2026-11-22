begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(20);

-- Three arguments: with two plain strings pgTAP picks has_table(table, description)
-- and looks for a table named "public".
select has_table('public', 'recipes', 'recipes table exists');
select has_table('public', 'saved_recipes', 'saved_recipes table exists');
select is((select relrowsecurity from pg_class where oid = 'public.recipes'::regclass), true, 'recipes RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.saved_recipes'::regclass), true, 'saves RLS enabled');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recipe-test-a@example.invalid', '', now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recipe-test-b@example.invalid', '', now(), now());

insert into public.recipes (id, owner_id, title, prep_minutes, servings)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Recipe A1', 10, 2),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', 'Recipe A2', 10, 2),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '22222222-2222-4222-8222-222222222222', 'Recipe B', 10, 2);

-- Recipe counts only look at the fixture users' rows, so the demo data from
-- supabase/seed.sql doesn't change the results.
set local role anon;
select is((select count(*) from public.recipes where owner_id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')), 0::bigint, 'anonymous sees no recipes');
select is((select count(*) from public.saved_recipes), 0::bigint, 'anonymous sees no saves');
select throws_ok($$insert into public.recipes (title, prep_minutes, servings) values ('Anon', 1, 1)$$, '42501');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select is((select count(*) from public.recipes where owner_id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')), 2::bigint, 'A sees only own recipes');
with removed as (delete from public.recipes where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning id)
select is((select count(*) from removed), 1::bigint, 'A can delete own recipe');
select throws_ok($$insert into public.recipes (owner_id, title, prep_minutes, servings) values ('22222222-2222-4222-8222-222222222222', 'Other owner', 1, 1)$$, '42501');
select lives_ok($$insert into public.recipes (owner_id, title, prep_minutes, servings) values ('11111111-1111-4111-8111-111111111111', 'Own new', 1, 1)$$, 'user can create own recipe');
with changed as (update public.recipes set title = 'Changed' where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' returning id)
select is((select count(*) from changed), 0::bigint, 'cannot update another user recipe');
with removed as (delete from public.recipes where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' returning id)
select is((select count(*) from removed), 0::bigint, 'cannot delete another user recipe');
select lives_ok($$insert into public.saved_recipes (user_id, recipe_id) values ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$, 'A can save own recipe');
select throws_ok($$insert into public.saved_recipes (user_id, recipe_id) values ('11111111-1111-4111-8111-111111111111', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')$$, '42501');
select throws_ok($$insert into public.saved_recipes (user_id, recipe_id) values ('22222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$, '42501');
select is((select count(*) from public.saved_recipes), 1::bigint, 'A sees own save');

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select is((select count(*) from public.recipes where owner_id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')), 1::bigint, 'B sees only own recipe');
select is((select count(*) from public.saved_recipes), 0::bigint, 'B cannot see A save');
with removed as (delete from public.saved_recipes where recipe_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning recipe_id)
select is((select count(*) from removed), 0::bigint, 'B cannot delete A save');
reset role;

select * from finish();
rollback;
