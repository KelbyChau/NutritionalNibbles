import { Suspense } from "react";
import { SiteNav } from "@/components/landing/site-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { RecipeForm } from "@/components/optimize/recipe-form";
import { isGoal } from "@/lib/optimize";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// The landing page's recipe box links here as ?recipe=...&goal=..., so the
// form starts pre-filled. Reading searchParams is request-time data, so it
// stays inside <Suspense> (cacheComponents is on).
async function PrefilledRecipeForm({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { recipe, goal } = await searchParams;
  return (
    <RecipeForm
      initialIngredients={typeof recipe === "string" ? recipe : ""}
      initialGoal={isGoal(goal) ? goal : undefined}
    />
  );
}

export default function OptimizePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="surface-cobalt">
        <SiteNav />
        <section className="mx-auto max-w-6xl px-4 pb-36 pt-8 sm:px-6 md:pb-40 md:pt-12">
          <h1 className="font-display text-[clamp(2.75rem,6vw,4.5rem)] leading-[0.92] tracking-[-0.02em]">
            Optimize a recipe
          </h1>
          <p className="mt-4 max-w-[46ch] font-display text-2xl leading-snug text-muted-foreground">
            Add your ingredients and pick a goal. We&apos;ll suggest swaps
            that get you there.
          </p>
        </section>
      </div>
      <main className="flex-1 pb-20">
        <Suspense fallback={<RecipeForm />}>
          <PrefilledRecipeForm searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
