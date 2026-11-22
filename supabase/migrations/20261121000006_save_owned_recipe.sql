create or replace function public.save_foundation_recipe(recipe_title text, serving_count integer, items jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare
  recipe_id uuid;
  matched integer;
  parts jsonb;
  kcal numeric;
  protein numeric;
  carbs numeric;
  fat numeric;
begin
  if auth.uid() is null or nullif(trim(recipe_title),'') is null or serving_count is null
    or serving_count < 1 or jsonb_array_length(items) is null or jsonb_array_length(items) < 1 then
    raise exception 'Enter a title, servings and ingredients';
  end if;
  with ingredients as (
    select f.*, (item->>'amount')::numeric as grams, pos
    from jsonb_array_elements(items) with ordinality as i(item,pos)
    join public.foundation_foods f on f.fdc_id=(item->>'fdc_id')::bigint
    where jsonb_typeof(item->'amount')='number' and (item->>'amount')::numeric > 0
  )
  select count(*), jsonb_agg(jsonb_build_object('fdc_id',fdc_id,'name',description,
      'amount',grams,'unit','g') order by pos),
    case when count(kcal_per_100g)=count(*) then sum(kcal_per_100g*grams) end,
    case when count(protein_per_100g)=count(*) then sum(protein_per_100g*grams) end,
    case when count(carbs_per_100g)=count(*) then sum(carbs_per_100g*grams) end,
    case when count(fat_per_100g)=count(*) then sum(fat_per_100g*grams) end
  into matched, parts, kcal, protein, carbs, fat from ingredients;
  if matched <> jsonb_array_length(items) then raise exception 'Invalid ingredient or weight'; end if;
  insert into public.recipes(owner_id,title,servings,prep_minutes,ingredients,
    calories_per_serving,protein_g_per_serving,carbohydrates_g_per_serving,fat_g_per_serving)
  values(auth.uid(),trim(recipe_title),serving_count,0,parts,kcal/100/serving_count,
    protein/100/serving_count,carbs/100/serving_count,fat/100/serving_count) returning id into recipe_id;
  return recipe_id;
end;
$$;
