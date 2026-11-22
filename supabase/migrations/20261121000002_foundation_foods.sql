-- USDA FoodData Central Foundation Foods names for ingredient selection.
create table public.foundation_foods (
  fdc_id bigint primary key,
  description text not null check (length(trim(description)) > 0),
  release_date date not null
);

create index foundation_foods_description_idx
  on public.foundation_foods (lower(description));

alter table public.foundation_foods enable row level security;
grant select on public.foundation_foods to anon, authenticated;

create policy "Anyone can read Foundation Foods" on public.foundation_foods
  for select to anon, authenticated using (true);

-- Literal substring search; no wildcard handling is needed for user input.
create function public.search_foundation_foods(search_text text)
returns table (fdc_id bigint, description text)
language sql stable set search_path = '' as $$
  select f.fdc_id, f.description
  from public.foundation_foods f
  where length(trim(search_text)) >= 2
    and position(lower(trim(search_text)) in lower(f.description)) > 0
  order by
    (lower(f.description) like lower(trim(search_text)) || '%') desc,
    f.description,
    f.fdc_id
  limit 10;
$$;

revoke all on function public.search_foundation_foods(text) from public;
grant execute on function public.search_foundation_foods(text) to anon, authenticated;
