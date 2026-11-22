-- Demo data for LOCAL testing only. Loaded automatically by `npm run local`
-- (first start) and `npm run local:reset`. Never run this against the shared
-- Supabase project.
--
-- Demo accounts (password for both: demo-password):
--   demo@example.com   3 private recipes, 2 saved recipes
--   demo2@example.com  1 private recipe, which demo@example.com must not see
--
-- Recipes are created with public.save_foundation_recipe(), the same function
-- the app saves with: ingredients reference USDA Foundation Foods by fdc_id,
-- amounts are grams, and the database calculates per-serving macros. A macro
-- stays empty when any ingredient has no value for it in Foundation Foods.
-- Butter and most cooking oils have no calorie data, so "Garlic Butter
-- Shrimp" shows that case on purpose.
--
-- To add a recipe, copy an entry below and look up ingredients with:
--   select fdc_id, description, kcal_per_100g from foundation_foods
--   where description ilike '%tomato%';
-- "food" is only a label for people reading this file; the stored ingredient
-- name comes from foundation_foods.

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change)
values
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'demo@example.com',
   extensions.crypt('demo-password', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'demo2@example.com',
   extensions.crypt('demo-password', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into auth.identities (user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values
  ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'email',
   '{"sub":"d0000000-0000-4000-8000-000000000001","email":"demo@example.com","email_verified":true}',
   now(), now(), now()),
  ('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'email',
   '{"sub":"d0000000-0000-4000-8000-000000000002","email":"demo2@example.com","email_verified":true}',
   now(), now(), now());

do $$
declare
  demo  constant uuid := 'd0000000-0000-4000-8000-000000000001';
  demo2 constant uuid := 'd0000000-0000-4000-8000-000000000002';
  recipe jsonb;
  owner uuid;
  new_id uuid;
  ids jsonb := '{}';
begin
  for recipe in select value from jsonb_array_elements($recipes$
[
  {"key": "alfredo", "title": "Creamy Chicken Alfredo", "owner": null, "hours_ago": 30,
   "servings": 4, "prep": 10, "cook": 25, "cuisine": "Italian", "tags": [],
   "description": "Classic weeknight spaghetti in a rich parmesan cream sauce.",
   "items": [
     {"fdc_id": 2758998, "amount": 340, "food": "Pasta, dry, enriched, spaghetti"},
     {"fdc_id": 2646170, "amount": 454, "food": "Chicken, breast, boneless, skinless, raw"},
     {"fdc_id": 2346386, "amount": 238, "food": "Cream, heavy"},
     {"fdc_id": 325036,  "amount": 100, "food": "Cheese, parmesan, grated"},
     {"fdc_id": 1104647, "amount": 9,   "food": "Garlic, raw"}],
   "steps": ["Cook the spaghetti until al dente.", "Sear the chicken until cooked through, then slice.", "Warm the cream with the garlic for 3 minutes.", "Stir in the parmesan and toss with the pasta and chicken."]},

  {"key": "alfredo-light", "title": "Lighter Chicken Alfredo", "owner": null, "hours_ago": 29,
   "servings": 4, "prep": 10, "cook": 25, "cuisine": "Italian", "tags": ["High-protein"],
   "description": "The alfredo with Greek yogurt in place of most of the cream: more protein, much less fat.",
   "items": [
     {"fdc_id": 2758998, "amount": 340, "food": "Pasta, dry, enriched, spaghetti"},
     {"fdc_id": 2646170, "amount": 680, "food": "Chicken, breast, boneless, skinless, raw"},
     {"fdc_id": 330137,  "amount": 245, "food": "Yogurt, Greek, plain, nonfat"},
     {"fdc_id": 2346386, "amount": 60,  "food": "Cream, heavy"},
     {"fdc_id": 325036,  "amount": 75,  "food": "Cheese, parmesan, grated"},
     {"fdc_id": 1104647, "amount": 9,   "food": "Garlic, raw"}],
   "steps": ["Cook the spaghetti, keeping a cup of the cooking water.", "Sear the chicken until cooked through, then slice.", "Off the heat, whisk the yogurt, cream and parmesan with a splash of pasta water.", "Toss everything together; don't boil the sauce or the yogurt will split."]},

  {"key": "taco-bowls", "title": "Turkey Taco Bowls", "owner": null, "hours_ago": 50,
   "servings": 4, "prep": 10, "cook": 20, "cuisine": "Mexican", "tags": ["Gluten-free", "High-protein"],
   "description": "Lean turkey, rice and black beans with fresh tomato, corn and avocado.",
   "items": [
     {"fdc_id": 2514747, "amount": 454, "food": "Turkey, ground, 93% lean/ 7% fat, raw"},
     {"fdc_id": 2512381, "amount": 185, "food": "Rice, white, long grain, unenriched, raw"},
     {"fdc_id": 2644285, "amount": 255, "food": "Beans, black, canned, drained and rinsed"},
     {"fdc_id": 2710826, "amount": 145, "food": "Corn, sweet, fresh, raw"},
     {"fdc_id": 1999634, "amount": 250, "food": "Tomato, roma"},
     {"fdc_id": 2710824, "amount": 150, "food": "Avocado, Hass, peeled, raw"},
     {"fdc_id": 2747661, "amount": 14,  "food": "Peppers, jalapeno, seeded, raw"}],
   "steps": ["Cook the rice.", "Brown the turkey with the chopped jalapeno.", "Warm the beans and corn.", "Build bowls and top with diced tomato and avocado."]},

  {"key": "salmon-bowl", "title": "Salmon Rice Bowl", "owner": null, "hours_ago": 75,
   "servings": 2, "prep": 10, "cook": 15, "cuisine": "Japanese", "tags": ["Dairy-free", "High-protein"],
   "description": "Roasted sockeye salmon over rice with avocado and shredded carrot.",
   "items": [
     {"fdc_id": 2684440, "amount": 340, "food": "Fish, salmon, sockeye, wild caught, raw"},
     {"fdc_id": 2512381, "amount": 185, "food": "Rice, white, long grain, unenriched, raw"},
     {"fdc_id": 2710824, "amount": 150, "food": "Avocado, Hass, peeled, raw"},
     {"fdc_id": 2258586, "amount": 60,  "food": "Carrots, mature, raw"}],
   "steps": ["Cook the rice.", "Roast the salmon at 400°F for 12 minutes.", "Slice the avocado, shred the carrot and assemble the bowls."]},

  {"key": "chickpea-curry", "title": "Chickpea Spinach Curry", "owner": null, "hours_ago": 100,
   "servings": 4, "prep": 10, "cook": 25, "cuisine": "Indian", "tags": ["Vegan", "Gluten-free"],
   "description": "Chickpeas simmered with tomato, onion and garlic, finished with spinach.",
   "items": [
     {"fdc_id": 2644288, "amount": 510, "food": "Chickpeas, canned, drained"},
     {"fdc_id": 1999633, "amount": 120, "food": "Spinach, mature"},
     {"fdc_id": 333281,  "amount": 411, "food": "Tomatoes, canned, red, ripe, diced"},
     {"fdc_id": 790646,  "amount": 110, "food": "Onions, yellow, raw"},
     {"fdc_id": 1104647, "amount": 12,  "food": "Garlic, raw"},
     {"fdc_id": 330458,  "amount": 14,  "food": "Oil, coconut"},
     {"fdc_id": 2512381, "amount": 185, "food": "Rice, white, long grain, unenriched, raw"}],
   "steps": ["Soften the onion and garlic in the coconut oil.", "Add the tomatoes and simmer until saucy.", "Stir in the chickpeas for 10 minutes, then wilt in the spinach.", "Serve over rice."]},

  {"key": "steak", "title": "Steak with Sweet Potatoes", "owner": null, "hours_ago": 125,
   "servings": 2, "prep": 10, "cook": 35, "cuisine": "American", "tags": ["Gluten-free", "Dairy-free", "High-protein"],
   "description": "Seared top sirloin with roasted sweet potatoes and broccoli.",
   "items": [
     {"fdc_id": 2727574, "amount": 225, "food": "Beef, top sirloin steak, raw"},
     {"fdc_id": 2346404, "amount": 260, "food": "Sweet potatoes, orange flesh, raw"},
     {"fdc_id": 747447,  "amount": 180, "food": "Broccoli, raw"}],
   "steps": ["Roast the cubed sweet potatoes on a lined tray at 425°F for 30 minutes.", "Add the broccoli for the last 10 minutes.", "Sear the steak in a hot dry pan for 4 minutes a side, rest, then slice."]},

  {"key": "shrimp-marinara", "title": "Shrimp Marinara Pasta", "owner": null, "hours_ago": 150,
   "servings": 4, "prep": 10, "cook": 15, "cuisine": "Italian", "tags": ["High-protein"],
   "description": "Spaghetti and shrimp in garlicky marinara with a little parmesan.",
   "items": [
     {"fdc_id": 2758998, "amount": 227, "food": "Pasta, dry, enriched, spaghetti"},
     {"fdc_id": 2684443, "amount": 454, "food": "Crustaceans, shrimp, farm raised, raw"},
     {"fdc_id": 332282,  "amount": 680, "food": "Sauce, pasta, spaghetti/marinara, ready-to-serve"},
     {"fdc_id": 1104647, "amount": 9,   "food": "Garlic, raw"},
     {"fdc_id": 325036,  "amount": 25,  "food": "Cheese, parmesan, grated"}],
   "steps": ["Cook the spaghetti.", "Simmer the marinara with the garlic for 5 minutes.", "Add the shrimp and cook until pink.", "Toss with the pasta and top with parmesan."]},

  {"key": "overnight-oats", "title": "Overnight Oats with Blueberries", "owner": null, "hours_ago": 175,
   "servings": 2, "prep": 5, "cook": 0, "cuisine": "American", "tags": ["Vegetarian"],
   "description": "No-cook oats with milk, Greek yogurt, blueberries and almonds.",
   "items": [
     {"fdc_id": 2346396, "amount": 80,  "food": "Oats, whole grain, rolled, old fashioned"},
     {"fdc_id": 746778,  "amount": 244, "food": "Milk, reduced fat, 2% milkfat"},
     {"fdc_id": 330137,  "amount": 120, "food": "Yogurt, Greek, plain, nonfat"},
     {"fdc_id": 2346411, "amount": 148, "food": "Blueberries, raw"},
     {"fdc_id": 2346393, "amount": 18,  "food": "Nuts, almonds, whole, raw"}],
   "steps": ["Stir the oats, milk and yogurt together.", "Refrigerate overnight.", "Top with blueberries and chopped almonds."]},

  {"key": "egg-scramble", "title": "Veggie Egg Scramble", "owner": null, "hours_ago": 200,
   "servings": 2, "prep": 5, "cook": 10, "cuisine": "American", "tags": ["Vegetarian", "Gluten-free"],
   "description": "Eggs and egg whites with spinach, mushrooms and a little cheddar.",
   "items": [
     {"fdc_id": 748967,  "amount": 200, "food": "Eggs, Grade A, Large, egg whole"},
     {"fdc_id": 747997,  "amount": 120, "food": "Eggs, Grade A, Large, egg white"},
     {"fdc_id": 1999632, "amount": 60,  "food": "Spinach, baby"},
     {"fdc_id": 1999629, "amount": 70,  "food": "Mushrooms, white button"},
     {"fdc_id": 328637,  "amount": 28,  "food": "Cheese, cheddar"}],
   "steps": ["Cook the sliced mushrooms in a non-stick pan, then wilt the spinach.", "Add the whisked eggs and whites, stirring gently.", "Fold in the cheddar off the heat."]},

  {"key": "lentil-soup", "title": "Hearty Lentil Soup", "owner": null, "hours_ago": 225,
   "servings": 4, "prep": 15, "cook": 35, "cuisine": "Mediterranean", "tags": ["Vegan", "Gluten-free"],
   "description": "Lentils, carrot and tomato in a thick soup with spinach stirred through.",
   "items": [
     {"fdc_id": 2644283, "amount": 200, "food": "Lentils, dry"},
     {"fdc_id": 2258586, "amount": 120, "food": "Carrots, mature, raw"},
     {"fdc_id": 790646,  "amount": 110, "food": "Onions, yellow, raw"},
     {"fdc_id": 1104647, "amount": 9,   "food": "Garlic, raw"},
     {"fdc_id": 333281,  "amount": 411, "food": "Tomatoes, canned, red, ripe, diced"},
     {"fdc_id": 1999633, "amount": 60,  "food": "Spinach, mature"}],
   "steps": ["Simmer everything except the spinach in 1.5 litres of water for 30 minutes.", "Stir in the spinach until wilted."]},

  {"key": "quesadillas", "title": "Black Bean Quesadillas", "owner": null, "hours_ago": 250,
   "servings": 4, "prep": 10, "cook": 10, "cuisine": "Mexican", "tags": ["Vegetarian"],
   "description": "Crisp flour tortillas filled with black beans, peppers and mozzarella.",
   "items": [
     {"fdc_id": 2758996, "amount": 180, "food": "Tortilla, wheat flour, shelf stable"},
     {"fdc_id": 2644285, "amount": 255, "food": "Beans, black, canned, drained and rinsed"},
     {"fdc_id": 329370,  "amount": 112, "food": "Cheese, mozzarella, low moisture, part-skim"},
     {"fdc_id": 2258590, "amount": 120, "food": "Peppers, bell, red, raw"},
     {"fdc_id": 790577,  "amount": 55,  "food": "Onions, red, raw"}],
   "steps": ["Lightly mash the beans with the diced pepper and onion.", "Fill the tortillas with the beans and cheese.", "Toast in a dry pan until crisp on both sides."]},

  {"key": "butter-shrimp", "title": "Garlic Butter Shrimp", "owner": null, "hours_ago": 275,
   "servings": 2, "prep": 5, "cook": 10, "cuisine": "American", "tags": ["Gluten-free"],
   "description": "Shrimp and broccoli in garlic butter. Butter has no calorie, protein or carb data in USDA Foundation Foods, so only fat is calculated for this recipe.",
   "items": [
     {"fdc_id": 2684443, "amount": 340, "food": "Crustaceans, shrimp, farm raised, raw"},
     {"fdc_id": 790508,  "amount": 28,  "food": "Butter, stick, salted"},
     {"fdc_id": 1104647, "amount": 12,  "food": "Garlic, raw"},
     {"fdc_id": 747447,  "amount": 180, "food": "Broccoli, raw"}],
   "steps": ["Steam the broccoli.", "Melt the butter with the garlic.", "Cook the shrimp in the garlic butter until pink and toss with the broccoli."]},

  {"key": "pancakes", "title": "My Protein Pancakes", "owner": "demo", "hours_ago": 1,
   "servings": 2, "prep": 5, "cook": 10, "cuisine": "American", "tags": ["Vegetarian"],
   "description": "Blender pancakes with oats, eggs, banana and cottage cheese.",
   "items": [
     {"fdc_id": 2346396, "amount": 80,  "food": "Oats, whole grain, rolled, old fashioned"},
     {"fdc_id": 748967,  "amount": 100, "food": "Eggs, Grade A, Large, egg whole"},
     {"fdc_id": 1105314, "amount": 118, "food": "Bananas, ripe and slightly ripe, raw"},
     {"fdc_id": 328841,  "amount": 113, "food": "Cheese, cottage, lowfat, 2% milkfat"}],
   "steps": ["Blend everything until smooth.", "Cook small pancakes in a non-stick pan for 2 minutes a side."]},

  {"key": "baked-spaghetti", "title": "Three-Cheese Baked Spaghetti", "owner": "demo", "hours_ago": 6,
   "servings": 6, "prep": 10, "cook": 30, "cuisine": "Italian", "tags": ["Vegetarian"],
   "description": "Spaghetti baked with marinara, ricotta, mozzarella and cheddar.",
   "items": [
     {"fdc_id": 2758998, "amount": 340, "food": "Pasta, dry, enriched, spaghetti"},
     {"fdc_id": 332282,  "amount": 450, "food": "Sauce, pasta, spaghetti/marinara, ready-to-serve"},
     {"fdc_id": 746766,  "amount": 250, "food": "Cheese, ricotta, whole milk"},
     {"fdc_id": 329370,  "amount": 112, "food": "Cheese, mozzarella, low moisture, part-skim"},
     {"fdc_id": 328637,  "amount": 113, "food": "Cheese, cheddar"}],
   "steps": ["Cook the spaghetti and mix it with the marinara and ricotta.", "Spread in a baking dish and top with the mozzarella and cheddar.", "Bake at 375°F for 20 minutes until bubbling."]},

  {"key": "fried-rice", "title": "Weeknight Chicken Fried Rice", "owner": "demo", "hours_ago": 20,
   "servings": 4, "prep": 10, "cook": 15, "cuisine": "Chinese", "tags": ["Dairy-free"],
   "description": "Day-old rice fried with chicken, egg and vegetables.",
   "items": [
     {"fdc_id": 2512381, "amount": 280, "food": "Rice, white, long grain, unenriched, raw"},
     {"fdc_id": 2646170, "amount": 300, "food": "Chicken, breast, boneless, skinless, raw"},
     {"fdc_id": 748967,  "amount": 100, "food": "Eggs, Grade A, Large, egg whole"},
     {"fdc_id": 2258586, "amount": 120, "food": "Carrots, mature, raw"},
     {"fdc_id": 2710826, "amount": 75,  "food": "Corn, sweet, fresh, raw"},
     {"fdc_id": 2258588, "amount": 120, "food": "Peppers, bell, green, raw"},
     {"fdc_id": 330458,  "amount": 14,  "food": "Oil, coconut"}],
   "steps": ["Cook the rice a day ahead and chill it.", "Fry the diced chicken in the oil, then set aside.", "Scramble the eggs, add the vegetables, then the rice.", "Fry until hot and return the chicken."]},

  {"key": "chili", "title": "Sam's Secret Chili", "owner": "demo2", "hours_ago": 3,
   "servings": 6, "prep": 15, "cook": 60, "cuisine": "American", "tags": ["Gluten-free", "Dairy-free"],
   "description": "Another user's private recipe, for checking that private recipes stay private.",
   "items": [
     {"fdc_id": 2514743, "amount": 454, "food": "Beef, ground, 90% lean / 10% fat, raw"},
     {"fdc_id": 2644289, "amount": 255, "food": "Beans, kidney, dark red, canned, drained"},
     {"fdc_id": 2685581, "amount": 794, "food": "Tomatoes, crushed, canned"},
     {"fdc_id": 790646,  "amount": 110, "food": "Onions, yellow, raw"},
     {"fdc_id": 2747661, "amount": 28,  "food": "Peppers, jalapeno, seeded, raw"}],
   "steps": ["Brown the beef with the onion and jalapeno.", "Add the tomatoes and beans and simmer for an hour."]}
]
$recipes$::jsonb)
  loop
    owner := case recipe->>'owner' when 'demo' then demo when 'demo2' then demo2 end;

    -- save_foundation_recipe() saves as the signed-in user, so act as one.
    perform set_config('request.jwt.claims',
      json_build_object('sub', coalesce(owner, demo), 'role', 'authenticated')::text, true);
    new_id := public.save_foundation_recipe(recipe->>'title', (recipe->>'servings')::int, recipe->'items');

    -- Fill in what the save function doesn't take. Recipes without an owner
    -- become public catalogue recipes.
    update public.recipes set
      description  = recipe->>'description',
      cuisine      = recipe->>'cuisine',
      dietary_tags = array(select jsonb_array_elements_text(recipe->'tags')),
      prep_minutes = (recipe->>'prep')::int,
      cook_minutes = (recipe->>'cook')::int,
      instructions = recipe->'steps',
      owner_id     = owner,
      is_public    = owner is null,
      created_at   = now() - (recipe->>'hours_ago')::numeric * interval '1 hour'
    where id = new_id;

    ids := ids || jsonb_build_object(recipe->>'key', new_id);
  end loop;

  perform set_config('request.jwt.claims', '', true);

  -- The lighter alfredo is an optimized version of the original.
  update public.recipes set parent_recipe_id = (ids->>'alfredo')::uuid
  where id = (ids->>'alfredo-light')::uuid;

  insert into public.saved_recipes (user_id, recipe_id) values
    (demo, (ids->>'taco-bowls')::uuid),
    (demo, (ids->>'overnight-oats')::uuid);
end $$;
