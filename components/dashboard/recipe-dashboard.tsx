"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import {
  ArrowRight,
  ChefHat,
  ChevronDown,
  Clock,
  Dumbbell,
  Flame,
  ListFilter,
  Search,
  Trash2,
  Users,
  UtensilsCrossed,
  Plus,
  type LucideIcon,
} from "lucide-react";
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

// The landing page's butter-yellow blob color, fixed so it reads the same in
// both themes (the theme's --accent turns navy in dark mode).
const BUTTER = "bg-[hsl(45_84%_72%)]";

const totalMinutes = (r: DashboardRecipe) => r.prep_minutes + r.cook_minutes;

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
                  "flex size-12 items-center justify-center rounded-full font-display text-2xl uppercase text-[hsl(230_50%_16%)]",
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

// Exit for a recipe card. AnimatePresence hands the current `deleted` set to
// cards as they leave: a deleted card fades and collapses (taking the list's
// 16px gap with it) so the ones below slide up; a card that only left because
// of a search or filter disappears instantly.
const cardExit = (id: string): Variants => ({
  exit: (deleted: Set<string>) =>
    deleted.has(id)
      ? {
          opacity: 0,
          scale: 0.96,
          height: 0,
          marginTop: -16,
          overflow: "hidden",
          transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] },
        }
      : { opacity: 0, transition: { duration: 0 } },
});

const chipClass =
  "inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm transition-colors hover:border-foreground/40 data-[state=open]:border-foreground/40";

function FeaturedRecipe({ recipe }: { recipe: DashboardRecipe }) {
  // Each stat rolls to the new value when a different recipe is shown.
  const stats: {
    icon: LucideIcon;
    value: number | null;
    unit: string;
    label: string;
  }[] = [
    {
      icon: Flame,
      value: recipe.calories_per_serving,
      unit: " kcal",
      label: "Calories",
    },
    {
      icon: Dumbbell,
      value: recipe.protein_g_per_serving,
      unit: "g",
      label: "Protein",
    },
    {
      icon: UtensilsCrossed,
      value: recipe.ingredient_count,
      unit: "",
      label: "Ingredients",
    },
    // Recipes saved from the builder have no cooking time: show "–", not 0.
    {
      icon: Clock,
      value: totalMinutes(recipe) || null,
      unit: " min",
      label: "Time",
    },
  ];

  // Plate grows with the recipe: a 3-ingredient dish gets a small plate,
  // a 12+ ingredient one is full size.
  const count = Math.max(0, recipe.ingredient_count);
  const blobScale = Math.min(1, 0.55 + count * 0.04);

  // Long names get a smaller font so they wrap instead of running off.
  const len = recipe.title.length;
  const titleSize =
    len > 48
      ? "text-2xl sm:text-3xl"
      : len > 28
        ? "text-3xl sm:text-4xl"
        : "text-4xl sm:text-5xl";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-4 pt-4 sm:pt-6">
        <div className="min-w-0">
          <h2
            className={cn(
              "font-display leading-[0.95] tracking-tight [overflow-wrap:anywhere] [text-wrap:balance]",
              titleSize,
            )}
          >
            {recipe.title}
          </h2>
        </div>
      </div>

      <div className="relative flex min-h-[16rem] flex-1 items-center justify-center py-6">
        {recipe.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- recipe images can come from any host
          <img
            src={recipe.image_url}
            alt={recipe.title}
            style={{ maxWidth: `${blobScale * 60}%` }}
            className="relative aspect-square max-h-[min(24rem,80%)] w-auto rounded-full object-cover shadow-[0_24px_48px_-24px_hsl(230_60%_15%/0.45)]"
          />
        ) : (
          <div
            style={{ width: `clamp(8rem, ${blobScale * 34}%, 16rem)` }}
            className="relative flex aspect-square items-center justify-center rounded-full bg-card shadow-[0_24px_48px_-24px_hsl(230_60%_15%/0.45)]"
          >
            <UtensilsCrossed className="size-1/4 text-primary" />
          </div>
        )}
      </div>

      <div className="surface-paper rounded-3xl bg-card p-4 shadow-[0_24px_48px_-32px_hsl(230_60%_15%/0.45)] sm:p-5">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(({ icon: Icon, value, unit, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className="size-4" />
              </span>
              <div className="flex flex-col-reverse">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-semibold tabular-nums">
                  <AnimatedNumber value={value} format={(n) => fmt(n, unit)} />
                </dd>
              </div>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            Per serving,{" "}
            <AnimatedNumber value={recipe.servings} format={fmtCount} />{" "}
            servings. Estimated macros.
          </p>
          <Button asChild size="sm" className="rounded-full px-4 shadow-none">
            <Link href={`/optimize?recipe=${recipe.id}`}>
              Optimize this recipe
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecipeCard({
  recipe,
  active,
  onSelect,
  onDelete,
}: {
  recipe: DashboardRecipe;
  active: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  return (
    // The whole card is the control: click, Enter or Space selects it.
    <article
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={`Open ${recipe.title} in the recipe builder`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "relative flex h-48 cursor-pointer overflow-hidden rounded-3xl border bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        active
          ? "border-primary ring-1 ring-primary"
          : "border-border hover:border-primary hover:ring-1 hover:ring-primary",
      )}
    >
      <div className="relative z-10 flex min-w-0 flex-1 flex-col p-5">
        <h3 className="line-clamp-2 font-display text-[1.75rem] leading-[1.02] tracking-tight">
          {recipe.title}
        </h3>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          {/* Saved recipes have no cooking time; skip it rather than "0 minutes". */}
          {totalMinutes(recipe) > 0 && (
            <>
              <Clock className="size-3.5" aria-hidden />
              <span className="whitespace-nowrap">
                {totalMinutes(recipe)} minutes
              </span>
            </>
          )}
          {recipe.protein_g_per_serving !== null && (
            <>
              {totalMinutes(recipe) > 0 && <span aria-hidden>·</span>}
              <span className="whitespace-nowrap">
                {Math.round(recipe.protein_g_per_serving)}g protein
              </span>
            </>
          )}
        </p>
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label={`Delete ${recipe.title} from saved recipes`}
            title="Delete recipe"
            className="mt-auto flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      <div className="relative w-[42%] shrink-0">
        {recipe.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- recipe images can come from any host
          <img
            src={recipe.image_url}
            alt=""
            className="absolute -right-6 top-1/2 size-44 -translate-y-1/2 rounded-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "absolute -right-6 top-1/2 flex size-44 -translate-y-1/2 items-center justify-center rounded-full",
              BUTTER,
            )}
          >
            <UtensilsCrossed className="size-10 text-[hsl(229_73%_48%)]" />
          </div>
        )}
      </div>
    </article>
  );
}

function EmptyState({
  loadError,
  hasRecipes,
}: {
  loadError: string | null;
  hasRecipes: boolean;
}) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center py-16 text-center">
      <div
        aria-hidden
        className={cn(
          "absolute size-72 rounded-[58%_42%_47%_53%/45%_52%_48%_55%] opacity-60",
          BUTTER,
        )}
      />
      <div className="relative max-w-sm">
        <h2 className="font-display text-4xl leading-tight">
          {loadError
            ? "Couldn't load recipes"
            : hasRecipes
              ? "Nothing matches"
              : "No recipes yet"}
        </h2>
        <p className="mt-3 text-muted-foreground">
          {loadError
            ? loadError
            : hasRecipes
              ? "Try a different search or category."
              : "Create your first recipe and it will show up here."}
        </p>
        {!hasRecipes && !loadError && (
          <Button asChild className="mt-6 rounded-full px-6 shadow-none">
            <Link href="/optimize">
              Create a recipe
              <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function fmt(value: number | null, unit: string) {
  return value === null ? "–" : `${Math.round(value)}${unit}`;
}
