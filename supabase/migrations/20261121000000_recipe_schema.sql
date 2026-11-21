-- Nutritional Nibbles: public discovery, private recipes, and per-user saves.
create extension if not exists pgcrypto;

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  description text,
  image_url text,
  cuisine text,
  dietary_tags text[] not null default '{}',
  prep_minutes integer not null check (prep_minutes >= 0),
  cook_minutes integer not null default 0 check (cook_minutes >= 0),
  servings integer not null check (servings > 0),
  ingredients jsonb not null default '[]'::jsonb check (jsonb_typeof(ingredients) = 'array'),
  instructions jsonb not null default '[]'::jsonb check (jsonb_typeof(instructions) = 'array'),
  calories_per_serving numeric(8,1) check (calories_per_serving >= 0),
  protein_g_per_serving numeric(8,1) check (protein_g_per_serving >= 0),
  carbohydrates_g_per_serving numeric(8,1) check (carbohydrates_g_per_serving >= 0),
  fat_g_per_serving numeric(8,1) check (fat_g_per_serving >= 0),
  nutrition_status text not null default 'estimated' check (nutrition_status in ('estimated', 'verified')),
  nutrition_source text,
  generation_prompt text,
  parent_recipe_id uuid references public.recipes(id) on delete set null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verified_requires_source check (nutrition_status <> 'verified' or nullif(trim(nutrition_source), '') is not null)
);

create table public.saved_recipes (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create index recipes_public_recent_idx on public.recipes (created_at desc) where is_public;
create index recipes_owner_idx on public.recipes (owner_id, created_at desc);
create index recipes_public_cuisine_idx on public.recipes (cuisine) where is_public;
create index recipes_dietary_tags_idx on public.recipes using gin (dietary_tags);
create index saved_recipes_user_recent_idx on public.saved_recipes (user_id, saved_at desc);

create function public.set_recipe_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_recipe_updated_at before update on public.recipes
for each row execute function public.set_recipe_updated_at();

alter table public.recipes enable row level security;
alter table public.saved_recipes enable row level security;

create policy "Read public or owned recipes" on public.recipes for select
to anon, authenticated using (is_public or owner_id = (select auth.uid()));

create policy "Create own recipes" on public.recipes for insert
to authenticated with check (owner_id = (select auth.uid()) and not is_public and nutrition_status = 'estimated');

create policy "Update own private recipes" on public.recipes for update
to authenticated using (owner_id = (select auth.uid()) and not is_public)
with check (owner_id = (select auth.uid()) and not is_public and nutrition_status = 'estimated');

create policy "Delete own private recipes" on public.recipes for delete
to authenticated using (owner_id = (select auth.uid()) and not is_public);

create policy "Read own saves" on public.saved_recipes for select
to authenticated using (user_id = (select auth.uid()));

create policy "Save visible recipes" on public.saved_recipes for insert
to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.recipes r
    where r.id = recipe_id and (r.is_public or r.owner_id = (select auth.uid()))
  )
);

create policy "Remove own saves" on public.saved_recipes for delete
to authenticated using (user_id = (select auth.uid()));
