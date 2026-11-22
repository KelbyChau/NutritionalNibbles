begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(5);

-- Three arguments: with two plain strings pgTAP picks has_table(table, description).
select has_table('public', 'foundation_foods', 'foundation_foods table exists');
select is((select count(*) from public.foundation_foods), 424::bigint, 'all October 2026 Foundation Foods imported');
select is((select relrowsecurity from pg_class where oid = 'public.foundation_foods'::regclass), true, 'RLS enabled');

set local role anon;
select is((select count(*) from public.search_foundation_foods('tomato')), 9::bigint, 'anonymous autocomplete searches names');
select throws_ok($$insert into public.foundation_foods (fdc_id, description, release_date) values (1, 'Test', current_date)$$, '42501');
reset role;

select * from finish();
rollback;
