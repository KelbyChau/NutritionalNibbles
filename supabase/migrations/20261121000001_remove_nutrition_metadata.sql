-- Keep numeric macro estimates, but remove nutrition verification metadata.
drop policy "Create own recipes" on public.recipes;
drop policy "Update own private recipes" on public.recipes;

alter table public.recipes
  drop constraint verified_requires_source,
  drop column nutrition_status,
  drop column nutrition_source;

create policy "Create own recipes" on public.recipes for insert
to authenticated with check (owner_id = (select auth.uid()) and not is_public);

create policy "Update own private recipes" on public.recipes for update
to authenticated using (owner_id = (select auth.uid()) and not is_public)
with check (owner_id = (select auth.uid()) and not is_public);
