begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(7);

select has_table('public', 'sr_legacy_foods', 'sr_legacy_foods table exists');
select is((select count(*) from public.sr_legacy_foods), 7793::bigint, 'all SR Legacy foods imported');
select is((select count(*) from public.sr_legacy_foods
           where kcal_per_100g is null or protein_per_100g is null
              or carbs_per_100g is null or fat_per_100g is null), 0::bigint, 'every food has all four macros');
select is((select relrowsecurity from pg_class where oid = 'public.sr_legacy_foods'::regclass), true, 'RLS enabled');
select is((select count(*) from public.sr_legacy_foods s join public.foundation_foods f using (fdc_id)), 0::bigint,
  'no fdc_id is shared with Foundation Foods');

set local role anon;
select is((select kcal_per_100g from public.sr_legacy_foods where fdc_id = 173410), 717::numeric,
  'anonymous users can read it (salted butter has calories)');
select throws_ok($$insert into public.sr_legacy_foods (fdc_id, description, release_date) values (1, 'Test', current_date)$$, '42501');
reset role;

select * from finish();
rollback;
