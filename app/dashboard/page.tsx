import { Suspense } from "react";
import { RecipeDashboard } from "@/components/dashboard/recipe-dashboard";
import { listRecipes, MAX_PAGE_SIZE } from "@/lib/recipes/queries";
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
  // The first page is queried here on the server. If there are more recipes,
  // the dashboard queries the rest from the browser (useAllRecipes).
  const [firstPage, savedRes] = await Promise.all([
    listRecipes(supabase, userId, {
      scope: "all",
      limit: MAX_PAGE_SIZE,
      cursor: null,
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
