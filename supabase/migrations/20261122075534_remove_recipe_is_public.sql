-- Remove recipes.is_public. There are no public catalogue recipes any more:
-- every recipe belongs to its owner, who is the only one who can see, change
-- or delete it. (The demo recipes in supabase/seed.sql belong to
-- demo@example.com.)

-- Policies and indexes that read is_public have to go before the column.
drop policy "Read public or owned recipes" on public.recipes;
drop policy "Create own recipes" on public.recipes;
drop policy "Update own private recipes" on public.recipes;
drop policy "Delete own private recipes" on public.recipes;
drop index public.recipes_public_recent_idx;
drop index public.recipes_public_cuisine_idx;

-- The saves table is saved_recipes locally and saved_recipes_history on the
-- shared project; replace its insert policy on whichever exists.
do $$
declare
  saves text := coalesce(
    to_regclass('public.saved_recipes')::text,
    to_regclass('public.saved_recipes_history')::text
  );
begin
  if saves is not null then
    execute format('drop policy if exists "Save visible recipes" on %s', saves);
    execute format($p$
      create policy "Save own recipes" on %1$s for insert
      to authenticated with check (
        user_id = (select auth.uid()) and exists (
          select 1 from public.recipes r
          where r.id = recipe_id and r.owner_id = (select auth.uid())
        )
      )$p$, saves);
  end if;
end;
$$;

alter table public.recipes drop column is_public;

create policy "Read own recipes" on public.recipes for select
to authenticated using (owner_id = (select auth.uid()));

create policy "Create own recipes" on public.recipes for insert
to authenticated with check (owner_id = (select auth.uid()));

create policy "Update own recipes" on public.recipes for update
to authenticated using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "Delete own recipes" on public.recipes for delete
to authenticated using (owner_id = (select auth.uid()));
