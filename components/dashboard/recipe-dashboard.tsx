"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChefHat, ChevronDown, ListFilter, Search, UtensilsCrossed, Plus, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatedNumber, fmtCount } from "@/components/animated-number";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useAllRecipes } from "@/components/dashboard/use-all-recipes";
import type { RecipeCursor, RecipeListItem } from "@/lib/recipes/queries";
import { deleteMyRecipe } from "@/lib/my-recipes";
import { cn } from "@/lib/utils";
import { BUTTER } from "@/components/optimize/shared";
import { cardExit, EmptyState, FeaturedRecipe, RecipeCard, totalMinutes } from "./recipe-cards";

// Same shape listRecipes() returns for each recipe.
export type DashboardRecipe = RecipeListItem;

type Category = "all" | "mine";
type Sort = "newest" | "quickest" | "protein" | "calories";

const categories: { key: Category; label: string; icon: LucideIcon }[] = [
  { key: "all", label: "Recipes", icon: UtensilsCrossed },
  { key: "mine", label: "Yours", icon: ChefHat },
];

const sorts: { key: Sort; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "quickest", label: "Quickest" },
  { key: "protein", label: "Most protein" },
  { key: "calories", label: "Fewest calories" },
];



// Lists the signed-in (or anonymous) user's own recipes. Recipes are private
// to their owner (RLS), e.g. the seeded ones belong to demo@example.com.
export function RecipeDashboard({
  initialRecipes,
  nextCursor,
  userId,
  userEmail,
}: {
  /** First page, rendered on the server. */
  initialRecipes: DashboardRecipe[];
  /** Where the remaining pages start, or null if the first page is everything. */
  nextCursor: RecipeCursor | null;
  userId: string | null;
  userEmail: string | null;
  loadError: string | null;
}) {
  const { recipes: allRecipes } = useAllRecipes(initialRecipes, nextCursor);
  // Deleted here but still in the server's list until the next load.
  const [deleted, setDeleted] = useState<Set<string>>(() => new Set());
  const recipes = useMemo(
    () =>
      allRecipes.filter(
        (r) => userId !== null && r.owner_id === userId && !deleted.has(r.id),
      ),
    [allRecipes, userId, deleted],
  );

  // True for a moment after a delete, so only deletes animate the list
  // (searching and filtering still update instantly).
  const [animateList, setAnimateList] = useState(false);
  const animateTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(animateTimer.current), []);

  async function removeRecipe(id: string) {
    setAnimateList(true);
    clearTimeout(animateTimer.current);
    animateTimer.current = setTimeout(() => setAnimateList(false), 400);
    setDeleted((d) => new Set(d).add(id));
    try {
      await deleteMyRecipe(id);
    } catch {
      // Put it back if the database refused.
      setDeleted((d) => {
        const next = new Set(d);
        next.delete(id);
        return next;
      });
    }
  }
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [sort, setSort] = useState<Sort>("newest");
  // Nothing is selected until a card is clicked; the big view falls back to
  // the first recipe but no card is outlined.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();


  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = recipes.filter((r) => {
      if (q) {
        const haystack = [r.title, r.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      switch (category) {
        case "mine":
          return r.owner_id !== null && r.owner_id === userId;
        default:
          return true;
      }
    });
    const byNullsLast = (v: number | null, dir: 1 | -1) =>
      v === null ? Infinity : v * dir;
    return [...list].sort((a, b) => {
      switch (sort) {
        case "quickest":
          return totalMinutes(a) - totalMinutes(b);
        case "protein":
          return (
            byNullsLast(a.protein_g_per_serving, -1) -
            byNullsLast(b.protein_g_per_serving, -1)
          );
        case "calories":
          return (
            byNullsLast(a.calories_per_serving, 1) -
            byNullsLast(b.calories_per_serving, 1)
          );
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });
  }, [recipes, query, category, sort, userId]);

  const featured =
    visible.find((r) => r.id === selectedId) ?? visible[0] ?? null;

  const canSave = userId !== null;

  return (
    <div className="flex min-h-screen flex-col bg-background lg:h-screen lg:overflow-hidden">
      {/* Top bar */}
      <header className="flex flex-wrap items-center gap-4 px-4 pb-2 pt-5 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="NutritionalNibbles home"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-display text-3xl leading-none text-primary-foreground"
        >
          N
        </Link>
        <h1 className="mr-auto font-display text-3xl leading-none tracking-tight sm:text-4xl">
          Recipe Dashboard
        </h1>
        <label className="relative order-last w-full sm:order-none sm:w-72">
          <span className="sr-only">Search recipes</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes"
            className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <div className="flex h-11 items-center rounded-full border border-border bg-card px-1">
          <ThemeSwitcher />
        </div>
        <Button asChild className="h-11 rounded-full px-5 shadow-none">
          <Link href="/optimize">
            <Plus />
            Create a recipe
          </Link>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 px-4 pb-6 pt-4 sm:px-6 lg:flex-row lg:gap-8 lg:px-8">
        {/* Category rail */}
        <nav
          aria-label="Recipe categories"
          className="flex shrink-0 gap-2 overflow-x-auto lg:w-20 lg:flex-col lg:items-center lg:gap-5 lg:overflow-visible lg:pt-20"
        >
          {categories
            // "Yours" only makes sense when signed in.
            .filter(({ key }) => canSave || key !== "mine")
            .map(({ key, label, icon: Icon }) => {
              const active = category === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  aria-pressed={active}
                  className="group flex shrink-0 flex-col items-center gap-1.5 text-xs"
                >
                  <span
                    className={cn(
                      "flex size-12 items-center justify-center rounded-full border transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card group-hover:border-foreground/40",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span
                    className={cn(
                      active ? "font-semibold" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          {canSave && (
            <div className="mt-auto hidden lg:block">
              <span
                title={userEmail ?? undefined}
                className={cn(
                  "flex size-12 items-center justify-center rounded-full font-display text-2xl uppercase text-foreground",
                  BUTTER,
                )}
              >
                {userEmail?.[0] ?? "?"}
              </span>
            </div>
          )}
        </nav>

        {/* Featured recipe */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 rounded-full">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={chipClass}>
                  <ListFilter className="size-4" />
                  {sorts.find((s) => s.key === sort)?.label}
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuRadioGroup
                  value={sort}
                  onValueChange={(v) => setSort(v as Sort)}
                >
                  {sorts.map((s) => (
                    <DropdownMenuRadioItem key={s.key} value={s.key}>
                      {s.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {featured ? (
            <FeaturedRecipe recipe={featured} />
          ) : (
            <EmptyState loadError={null} hasRecipes={recipes.length > 0} />
          )}
        </section>

        {/* Recipe list */}
        <aside
          aria-label="All recipes"
          className="flex min-h-0 shrink-0 flex-col lg:w-[22rem] xl:w-[24rem]"
        >
          <p className="mb-3 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
            <span>
              <AnimatedNumber value={visible.length} format={fmtCount} />{" "}
              {visible.length === 1 ? "recipe" : "recipes"}
            </span>
          </p>
          <ul className="flex min-h-0 flex-1 flex-col gap-4 lg:overflow-y-auto lg:pb-2 lg:pr-1">
            {/* A deleted card fades and collapses; the cards below slide up
                to close the gap. */}
            <AnimatePresence initial={false} custom={deleted}>
              {visible.map((recipe) => (
                <motion.li
                  key={recipe.id}
                  layout={animateList ? "position" : false}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  variants={cardExit(recipe.id)}
                  custom={deleted}
                  exit="exit"
                >
                  <RecipeCard
                    recipe={recipe}
                    active={recipe.id === selectedId}
                    onSelect={() => {
                      setSelectedId(recipe.id);
                      // Open it in the recipe builder with its ingredients.
                      router.push(`/optimize?recipe=${recipe.id}`);
                    }}
                    onDelete={
                      recipe.owner_id === userId
                        ? () => void removeRecipe(recipe.id)
                        : undefined
                    }
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </aside>
      </div>
    </div>
  );
}


const chipClass =
  "inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm transition-colors hover:border-foreground/40 data-[state=open]:border-foreground/40";
