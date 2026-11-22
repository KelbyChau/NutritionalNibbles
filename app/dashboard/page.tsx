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
  // No login required, but recipes are private to their owner (RLS):
  // signed-out visitors see none, signed-in users see their own.
  //
  // The first page is queried here on the server. If there are more recipes,
  // the dashboard queries the rest from the browser (useAllRecipes).
  const firstPage = await listRecipes(supabase, userId, {
    scope: "all",
    limit: MAX_PAGE_SIZE,
    cursor: null,
  });

  return (
    <RecipeDashboard
      initialRecipes={firstPage.recipes}
      nextCursor={firstPage.next}
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
