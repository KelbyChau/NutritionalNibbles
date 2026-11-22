-- USDA FoodData Central SR Legacy foods: about 7,800 common foods, including
-- ones Foundation Foods lacks (butter and oil calories, salt, honey, tofu...).
-- Same shape and access rules as public.foundation_foods: a read-only catalog.
-- fdc_id values never overlap with Foundation Foods (FoodData Central ids are
-- unique across datasets).
create table public.sr_legacy_foods (
  fdc_id bigint primary key,
  description text not null check (length(trim(description)) > 0),
  release_date date not null,
  -- Per 100 g. Missing values stay null.
  kcal_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric
);

create index sr_legacy_foods_description_idx
  on public.sr_legacy_foods (lower(description));

alter table public.sr_legacy_foods enable row level security;
grant select on public.sr_legacy_foods to anon, authenticated;

create policy "Anyone can read SR Legacy foods" on public.sr_legacy_foods
  for select to anon, authenticated using (true);

-- Supabase's default public-table grants include writes; this catalog is read-only to clients.
revoke insert, update, delete, truncate, references, trigger
  on public.sr_legacy_foods from anon, authenticated;
