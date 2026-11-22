// Database access for recipes. Plain functions: no requests or responses, so
// route handlers and server-rendered pages can both use them.
// Row-level security on public.recipes is the real access control; these
// filters only narrow results further.
import type { PostgrestError } from "@supabase/supabase-js";
import type { Supabase } from "@/lib/http";
import type { ListOptions, NewRecipe } from "./validation";

/** One recipe in a list, as GET /api/recipes and the dashboard use it. */
export type RecipeListItem = {
  id: string;
  owner_id: string | null;
  title: string;
  description: string | null;
  image_url: string | null;
  cuisine: string | null;
  dietary_tags: string[];
  prep_minutes: number;
  cook_minutes: number;
  servings: number;
  ingredient_count: number;
  calories_per_serving: number | null;
  protein_g_per_serving: number | null;
  carbohydrates_g_per_serving: number | null;
  fat_g_per_serving: number | null;
  is_public: boolean;
  created_at: string;
};

/** Where the next page starts: the last listed recipe's created_at and id. */
export type RecipeCursor = { before: string; before_id: string };

export type RecipePage = {
  recipes: RecipeListItem[];
  /** null on the last page. */
  next: RecipeCursor | null;
};

/**
 * Columns for recipe lists. `ingredients` is selected only to count it; lists
 * return `ingredient_count` instead of the full ingredient array.
 */
export const RECIPE_LIST_COLUMNS =
  "id, owner_id, title, description, image_url, cuisine, dietary_tags, prep_minutes, cook_minutes, servings, ingredients, calories_per_serving, protein_g_per_serving, carbohydrates_g_per_serving, fat_g_per_serving, is_public, created_at";

/** Every column a full recipe view needs. */
export const RECIPE_FULL_COLUMNS =
  "id, owner_id, title, description, image_url, cuisine, dietary_tags, prep_minutes, cook_minutes, servings, ingredients, instructions, calories_per_serving, protein_g_per_serving, carbohydrates_g_per_serving, fat_g_per_serving, parent_recipe_id, is_public, created_at, updated_at";

/**
 * One page of recipes the user can see (public plus their own), newest first.
 * Pass the returned `next` back as before/beforeId to get the following page.
 */
export async function listRecipes(
  supabase: Supabase,
  userId: string | null,
  { scope, limit, before, beforeId }: ListOptions,
): Promise<RecipePage & { error: PostgrestError | null }> {
  if (scope === "mine" && !userId) return { recipes: [], next: null, error: null };

  let query = supabase
    .from("recipes")
    .select(RECIPE_LIST_COLUMNS)
    // id breaks ties so pages never overlap or skip recipes that share a
    // created_at (e.g. several recipes seeded in one statement).
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    // One extra row tells us whether another page exists.
    .limit(limit + 1);

  if (scope === "mine" && userId) query = query.eq("owner_id", userId);
  if (scope === "public") query = query.eq("is_public", true);

  if (before && beforeId) {
    // Rows after the cursor in (created_at desc, id desc) order. Both values
    // were validated (ISO timestamp, UUID) so they can't alter the filter.
    query = query.or(
      `created_at.lt."${before}",and(created_at.eq."${before}",id.lt.${beforeId})`,
    );
  } else if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  if (error) return { recipes: [], next: null, error };

  const rows = (data ?? []).map(toListItem);
  const recipes = rows.slice(0, limit);
  const last = recipes.at(-1);
  const next =
    rows.length > limit && last
      ? { before: last.created_at, before_id: last.id }
      : null;

  return { recipes, next, error: null };
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

function toListItem(row: Record<string, unknown>): RecipeListItem {
  const { ingredients, ...rest } = row;
  return {
    ...(rest as Omit<RecipeListItem, "ingredient_count">),
    ingredient_count: Array.isArray(ingredients) ? ingredients.length : 0,
    calories_per_serving: toNumber(row.calories_per_serving),
    protein_g_per_serving: toNumber(row.protein_g_per_serving),
    carbohydrates_g_per_serving: toNumber(row.carbohydrates_g_per_serving),
    fat_g_per_serving: toNumber(row.fat_g_per_serving),
  };
}

// numeric columns can arrive as strings; normalize to number | null.
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
