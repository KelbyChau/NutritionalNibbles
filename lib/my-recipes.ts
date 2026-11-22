// Saving and deleting the user's recipes in Supabase (public.recipes).
//
// There's no login screen, so the first save signs this browser in as an
// anonymous Supabase user. That gives the recipe an owner, which the
// table's row-level security requires; the recipe is private to that user.
// Anonymous sign-ins must be enabled in Supabase (Authentication → Sign In /
// Providers, or enable_anonymous_sign_ins in supabase/config.toml).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FoundationFood } from "@/lib/foundation-foods";
import { calculateNutrition } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/client";

async function ensureSignedIn(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error("Couldn't sign in to save: " + error.message);
}

/**
 * Saves a recipe with save_foundation_recipe(), which stores each ingredient
 * by fdc_id and weight in grams and calculates the macros in the database.
 * With `replaceId`, the new version replaces that recipe (saved first, then
 * the old one is deleted). Returns the new recipe id.
 */
export async function saveMyRecipe(input: {
  replaceId?: string | null;
  title: string;
  servings: number;
  ingredients: {
    name: string;
    amount: string;
    unit: string;
    food: FoundationFood;
  }[];
}): Promise<string> {
  const { items } = calculateNutrition(input.ingredients, input.servings);
  const unweighable = items.find((i) => i.grams === null || i.grams <= 0);
  if (unweighable)
    throw new Error(
      `Enter ${unweighable.name.split(" (")[0]} as a weight (g, kg, oz or lb).`,
    );

  const supabase = createClient();
  await ensureSignedIn(supabase);

  const { data: id, error } = await supabase.rpc("save_foundation_recipe", {
    recipe_title: input.title.trim(),
    serving_count: input.servings,
    items: input.ingredients.map((ing, i) => ({
      fdc_id: ing.food.fdc_id,
      amount: Math.round(items[i].grams! * 10) / 10,
    })),
  });
  if (error || !id) throw new Error(error?.message || "Couldn't save the recipe.");

  if (input.replaceId && input.replaceId !== id) {
    // Only deletes the user's own recipes (RLS); otherwise a no-op.
    await supabase.from("recipes").delete().eq("id", input.replaceId);
  }
  return id as string;
}

export async function deleteMyRecipe(id: string) {
  const { error } = await createClient().from("recipes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
