-- Remove the cuisine and diet filters' data: recipes.cuisine and
-- recipes.dietary_tags. The dashboard no longer filters or shows them.
drop index if exists public.recipes_dietary_tags_idx;

alter table public.recipes
  drop column cuisine,
  drop column dietary_tags;
