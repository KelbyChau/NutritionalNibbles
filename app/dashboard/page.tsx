import { Suspense } from "react";
import { RecipeDashboard } from "@/components/dashboard/recipe-dashboard";
import { listRecipes } from "@/lib/recipes/queries";
import { MAX_PAGE_SIZE } from "@/lib/recipes/validation";
import { createClient } from "@/lib/supabase/server";

// Reads the session cookie, so it has to stream in behind <Suspense>
// (cacheComponents is on in next.config.ts).
async function DashboardData() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = (auth?.claims?.sub as string | undefined) ?? null;
  const email = auth?.claims?.email as string | undefined;
  // No login required. Signed-out visitors see public recipes; signed-in
  // users also see their own private ones (RLS) and can save recipes.
  //
  // The first page comes from listRecipes(), the same query behind
  // GET /api/recipes: Next.js recommends Server Components read data directly
  // instead of calling their own API routes. If there are more recipes, the
  // dashboard fetches the rest from GET /api/recipes in the browser.
  const [firstPage, savedRes] = await Promise.all([
    listRecipes(supabase, userId, {
      scope: "all",
      limit: MAX_PAGE_SIZE,
      before: null,
      beforeId: null,
    }),
    userId
      ? supabase.from("saved_recipes").select("recipe_id").eq("user_id", userId)
      : Promise.resolve({ data: [] as { recipe_id: string }[] }),
  ]);

  return (
    <RecipeDashboard
      initialRecipes={firstPage.recipes}
      nextCursor={firstPage.next}
      savedIds={(savedRes.data ?? []).map((s) => s.recipe_id)}
      userId={userId}
      userEmail={email ?? null}
      loadError={firstPage.error?.message ?? null}
    />
  );
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
