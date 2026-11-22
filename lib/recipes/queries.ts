// Database access for recipes. Plain functions: no requests or responses, so
// route handlers and server-rendered pages can both use them.
// Row-level security on public.recipes is the real access control; these
// filters only narrow results further.
import type { Supabase } from "@/lib/http";
import type { ListOptions, NewRecipe } from "./validation";

/** Columns for the recipe options (list) page. */
export const RECIPE_LIST_COLUMNS =
  "id, owner_id, title, description, image_url, cuisine, dietary_tags, prep_minutes, cook_minutes, servings, is_public, created_at";

/** Every column a full recipe view needs. */
export const RECIPE_FULL_COLUMNS =
  "id, owner_id, title, description, image_url, cuisine, dietary_tags, prep_minutes, cook_minutes, servings, ingredients, instructions, calories_per_serving, protein_g_per_serving, carbohydrates_g_per_serving, fat_g_per_serving, parent_recipe_id, is_public, created_at, updated_at";

/**
 * Public recipes plus the user's own, newest first.
 * For the next page, pass the last item's created_at as `before`.
 */
export async function listRecipes(
  supabase: Supabase,
  userId: string | null,
  { scope, limit, before }: ListOptions,
) {
  let query = supabase
    .from("recipes")
    .select(RECIPE_LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (scope === "mine" && userId) query = query.eq("owner_id", userId);
  if (scope === "public") query = query.eq("is_public", true);
  if (before) query = query.lt("created_at", before);

  return query;
}

/** Inserts a private recipe owned by `userId` and returns the saved row. */
export async function createRecipe(supabase: Supabase, userId: string, recipe: NewRecipe) {
  return supabase
    .from("recipes")
    .insert({ ...recipe, owner_id: userId, is_public: false })
    .select(RECIPE_FULL_COLUMNS)
    .single();
}

/**
 * Deletes one of the user's private recipes. Returns the deleted id, or null
 * when nothing matched (missing, someone else's, or public).
 */
export async function deleteRecipe(supabase: Supabase, userId: string, id: string) {
  const { data, error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id)
    .eq("owner_id", userId)
    .select("id");

  return { deletedId: data?.[0]?.id ?? null, error };
}
