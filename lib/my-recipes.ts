// Recipes the user saves from the builder or the optimize page.
//
// There's no login right now, so they're kept in this browser's
// localStorage (not the database). Each one has the same fields the
// dashboard uses for database recipes, plus the ingredient list so the
// builder can reopen it. Ids start with "local-" so they never clash with
// database ids.

import type { FoundationFood } from "@/lib/foundation-foods";
import { calculateNutrition } from "@/lib/nutrition";
import type { RecipeListItem } from "@/lib/recipes/queries";

export type SavedIngredient = { fdc_id: number; amount: string; unit: string };
export type MyRecipe = RecipeListItem & { ingredients: SavedIngredient[] };

const KEY = "nutritionalnibbles:my-recipes";

export const isMyRecipe = (id: string) => id.startsWith("local-");

export function loadMyRecipes(): MyRecipe[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function getMyRecipe(id: string) {
  return loadMyRecipes().find((r) => r.id === id) ?? null;
}

/** Saves (or, with an existing id, updates) a recipe. Throws if storage is blocked. */
export function saveMyRecipe(input: {
  id?: string | null;
  title: string;
  servings: number;
  ingredients: {
    name: string;
    amount: string;
    unit: string;
    food: FoundationFood;
  }[];
}): MyRecipe {
  const list = loadMyRecipes();
  const existing = input.id ? list.find((r) => r.id === input.id) : undefined;
  const n = calculateNutrition(input.ingredients, input.servings).perServing;
  const round = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);

  const recipe: MyRecipe = {
    id: existing?.id ?? `local-${crypto.randomUUID()}`,
    owner_id: null,
    title: input.title.trim() || "Untitled recipe",
    description: "Saved from the recipe builder.",
    image_url: null,
    cuisine: null,
    dietary_tags: [],
    prep_minutes: 0,
    cook_minutes: 0,
    servings: input.servings,
    ingredient_count: input.ingredients.length,
    calories_per_serving: round(n.kcal),
    protein_g_per_serving: round(n.protein),
    carbohydrates_g_per_serving: round(n.carbs),
    fat_g_per_serving: round(n.fat),
    created_at: existing?.created_at ?? new Date().toISOString(),
    ingredients: input.ingredients.map((i) => ({
      fdc_id: i.food.fdc_id,
      amount: i.amount,
      unit: i.unit,
    })),
  };

  const next = existing
    ? list.map((r) => (r.id === recipe.id ? recipe : r))
    : [recipe, ...list];
  localStorage.setItem(KEY, JSON.stringify(next));
  return recipe;
}

/** Removes a saved recipe and returns the ones left. */
export function deleteMyRecipe(id: string): MyRecipe[] {
  const next = loadMyRecipes().filter((r) => r.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
