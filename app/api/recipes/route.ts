import { NextResponse, type NextRequest } from "next/server";
import { getUserId, jsonError, readJson } from "@/lib/http";
import { createRecipe, listRecipes } from "@/lib/recipes/queries";
import { parseListOptions, parseNewRecipe } from "@/lib/recipes/validation";

/**
 * GET /api/recipes?scope=all|mine|public&limit=1..100&before=<ISO timestamp>
 * Recipe options: public recipes plus the signed-in user's own.
 */
export async function GET(request: NextRequest) {
  const options = parseListOptions(request.nextUrl.searchParams);
  if (!options.ok) return jsonError(options.error, 400);

  const { supabase, userId } = await getUserId();
  if (options.value.scope === "mine" && !userId) {
    return jsonError("Sign in to see your recipes", 401);
  }

  const { data, error } = await listRecipes(supabase, userId, options.value);
  if (error) {
    console.error("GET /api/recipes", error);
    return jsonError("Could not load recipes", 500);
  }
  return NextResponse.json({ recipes: data });
}

/**
 * POST /api/recipes — add a private recipe for the signed-in user.
 * Body: { title, servings, ingredients[], instructions?[], description?,
 *         cuisine?, dietary_tags?[], prep_minutes?, cook_minutes? }
 */
export async function POST(request: NextRequest) {
  const { supabase, userId } = await getUserId();
  if (!userId) return jsonError("Sign in to add a recipe", 401);

  const body = await readJson(request);
  if (body === undefined) return jsonError("Body must be valid JSON", 400);

  const recipe = parseNewRecipe(body);
  if (!recipe.ok) return jsonError("Invalid recipe", 400, recipe.errors);

  const { data, error } = await createRecipe(supabase, userId, recipe.value);
  if (error) {
    console.error("POST /api/recipes", error);
    return jsonError("Could not save recipe", 500);
  }
  return NextResponse.json({ recipe: data }, { status: 201 });
}
