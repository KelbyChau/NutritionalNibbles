import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  RecipeDashboard,
  type DashboardRecipe,
} from "@/components/dashboard/recipe-dashboard";

const recipeColumns =
  "id, title, description, image_url, cuisine, dietary_tags, prep_minutes, cook_minutes, servings, ingredients, calories_per_serving, protein_g_per_serving, carbohydrates_g_per_serving, fat_g_per_serving, created_at";

// Reads the session cookie, so it has to stream in behind <Suspense>
// (cacheComponents is on in next.config.ts).
async function DashboardData() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub as string | undefined;
  const email = auth?.claims?.email as string | undefined;
  // No login required. Signed-out visitors see public recipes; signed-in
  // users also see their own private ones (RLS) and can save recipes.
  const [recipesRes, savedRes] = await Promise.all([
    supabase
      .from("recipes")
      .select(recipeColumns)
      .order("created_at", { ascending: false }),
    userId
      ? supabase.from("saved_recipes").select("recipe_id").eq("user_id", userId)
      : Promise.resolve({ data: [] as { recipe_id: string }[] }),
  ]);

  const recipes: DashboardRecipe[] = (recipesRes.data ?? []).map((r) => ({
    ...r,
    ingredient_count: Array.isArray(r.ingredients) ? r.ingredients.length : 0,
    calories_per_serving: toNumber(r.calories_per_serving),
    protein_g_per_serving: toNumber(r.protein_g_per_serving),
    carbohydrates_g_per_serving: toNumber(r.carbohydrates_g_per_serving),
    fat_g_per_serving: toNumber(r.fat_g_per_serving),
  }));

  return (
    <RecipeDashboard
      recipes={recipes}
      savedIds={(savedRes.data ?? []).map((s) => s.recipe_id)}
      userId={userId ?? null}
      userEmail={email ?? null}
      loadError={recipesRes.error?.message ?? null}
    />
  );
}

// Postgres numeric comes back as a string from PostgREST.
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-display text-3xl text-muted-foreground">
          Loading recipes…
        </div>
      }
    >
      <DashboardData />
    </Suspense>
  );
}
