// Database access for recipes. Plain functions that take a Supabase client,
// so server-rendered pages and browser components can both use them.
// Row-level security on public.recipes is the real access control; these
// filters only narrow results further.
import type { SupabaseClient } from "@supabase/supabase-js";

/** One recipe in a list, as the dashboard uses it. */
export type RecipeListItem = {
  id: string;
  owner_id: string | null;
  title: string;
  description: string | null;
  image_url: string | null;
  servings: number;
  ingredient_count: number;
  calories_per_serving: number | null;
  protein_g_per_serving: number | null;
  carbohydrates_g_per_serving: number | null;
  fat_g_per_serving: number | null;
  created_at: string;
};

/** Where the next page starts: the last listed recipe's created_at and id. */
export type RecipeCursor = { before: string; before_id: string };

export type RecipePage = {
  recipes: RecipeListItem[];
  /** null on the last page. */
  next: RecipeCursor | null;
};

/** Page size for recipe lists. The dashboard loads pages of this size. */
export const MAX_PAGE_SIZE = 100;

export type ListOptions = {
  scope: "all" | "mine";
  limit: number;
  /** Start after this recipe (from a previous page's `next`), or null for the first page. */
  cursor: RecipeCursor | null;
  signal?: AbortSignal;
};

/**
 * Columns for recipe lists. `ingredients` is selected only to count it; lists
 * return `ingredient_count` instead of the full ingredient array.
 */
const RECIPE_LIST_COLUMNS =
  "id, owner_id, title, description, image_url, servings, ingredients, calories_per_serving, protein_g_per_serving, carbohydrates_g_per_serving, fat_g_per_serving, created_at";

// Cursor values go inside a PostgREST filter string, so only accept the shapes
// Postgres produces: an ISO timestamp and a UUID.
const ISO_TIMESTAMP_RE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One page of recipes the user can see (public plus their own), newest first.
 * Pass the returned `next` back as `cursor` to get the following page.
 */
export async function listRecipes(
  supabase: SupabaseClient,
  userId: string | null,
  { scope, limit, cursor, signal }: ListOptions,
): Promise<RecipePage & { error: { message: string } | null }> {
  if (scope === "mine" && !userId) return { recipes: [], next: null, error: null };
  if (cursor && (!ISO_TIMESTAMP_RE.test(cursor.before) || !UUID_RE.test(cursor.before_id))) {
    return { recipes: [], next: null, error: { message: "Invalid page cursor" } };
  }

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
  if (cursor) {
    // Rows after the cursor in (created_at desc, id desc) order.
    query = query.or(
      `created_at.lt."${cursor.before}",and(created_at.eq."${cursor.before}",id.lt.${cursor.before_id})`,
    );
  }
  if (signal) query = query.abortSignal(signal);

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

/**
 * Deletes one of the user's private recipes. Returns the deleted id, or null
 * when nothing matched (missing, someone else's, or public). Row-level security
 * only lets owners delete their own private recipes, whichever client calls this.
 */
export async function deleteRecipe(supabase: SupabaseClient, userId: string, id: string) {
  const { data, error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id)
    .eq("owner_id", userId)
    .select("id");

  return { deletedId: (data?.[0]?.id as string | undefined) ?? null, error };
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
