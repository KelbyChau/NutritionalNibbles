"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Clock,
  Dumbbell,
  Flame,
  Globe,
  Heart,
  Leaf,
  ListFilter,
  Salad,
  Search,
  Timer,
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
import { ThemeSwitcher } from "@/components/theme-switcher";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type DashboardRecipe = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  cuisine: string | null;
  dietary_tags: string[];
  prep_minutes: number;
  cook_minutes: number;
  servings: number;
  ingredient_count: number;
  calories_per_serving: number | null;
  protein_g_per_serving: number | null;
  carbohydrates_g_per_serving: number | null;
  fat_g_per_serving: number | null;
  created_at: string;
};

type Category = "all" | "saved" | "quick" | "protein" | "light";
type Sort = "newest" | "quickest" | "protein" | "calories";

const categories: { key: Category; label: string; icon: LucideIcon }[] = [
  { key: "all", label: "Recipes", icon: UtensilsCrossed },
  { key: "saved", label: "Saved", icon: Heart },
  { key: "quick", label: "Quick", icon: Timer },
  { key: "protein", label: "Protein", icon: Dumbbell },
  { key: "light", label: "Light", icon: Leaf },
];

const sorts: { key: Sort; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "quickest", label: "Quickest" },
  { key: "protein", label: "Most protein" },
  { key: "calories", label: "Fewest calories" },
];

const ANY = "__any__";
// The landing page's butter-yellow blob color, fixed so it reads the same in
// both themes (the theme's --accent turns navy in dark mode).
const BUTTER = "bg-[hsl(45_84%_72%)]";

const totalMinutes = (r: DashboardRecipe) => r.prep_minutes + r.cook_minutes;

export function RecipeDashboard({
  recipes,
  savedIds,
  userId,
  userEmail,
  loadError,
}: {
  recipes: DashboardRecipe[];
  savedIds: string[];
  userId: string | null;
  userEmail: string | null;
  loadError: string | null;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [cuisine, setCuisine] = useState(ANY);
  const [diet, setDiet] = useState(ANY);
  const [sort, setSort] = useState<Sort>("newest");
  const [saved, setSaved] = useState(() => new Set(savedIds));
  const [selectedId, setSelectedId] = useState<string | null>(
    recipes[0]?.id ?? null,
  );

  const cuisines = useMemo(
    () => unique(recipes.map((r) => r.cuisine)),
    [recipes],
  );
  const diets = useMemo(
    () => unique(recipes.flatMap((r) => r.dietary_tags)),
    [recipes],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = recipes.filter((r) => {
      if (q) {
        const haystack = [r.title, r.description, r.cuisine, ...r.dietary_tags]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (cuisine !== ANY && r.cuisine !== cuisine) return false;
      if (diet !== ANY && !r.dietary_tags.includes(diet)) return false;
      switch (category) {
        case "saved":
          return saved.has(r.id);
        case "quick":
          return totalMinutes(r) <= 30;
        case "protein":
          return (r.protein_g_per_serving ?? 0) >= 25;
        case "light":
          return (
            r.calories_per_serving !== null && r.calories_per_serving <= 450
          );
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
  }, [recipes, query, category, cuisine, diet, sort, saved]);

  const featured =
    visible.find((r) => r.id === selectedId) ?? visible[0] ?? null;

  const canSave = userId !== null;

  async function toggleSave(recipeId: string) {
    if (!userId) return;
    const wasSaved = saved.has(recipeId);
    const next = new Set(saved);
    if (wasSaved) next.delete(recipeId);
    else next.add(recipeId);
    setSaved(next);

    const supabase = createClient();
    const { error } = wasSaved
      ? await supabase
          .from("saved_recipes")
          .delete()
          .eq("user_id", userId)
          .eq("recipe_id", recipeId)
      : await supabase
          .from("saved_recipes")
          .insert({ user_id: userId, recipe_id: recipeId });

    if (error) {
      // Roll back the optimistic change.
      setSaved((current) => {
        const reverted = new Set(current);
        if (wasSaved) reverted.add(recipeId);
        else reverted.delete(recipeId);
        return reverted;
      });
    }
  }

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
            Create Recipe
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
            .filter(({ key }) => canSave || key !== "saved")
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
            <FilterMenu
              icon={Globe}
              label="Cuisine"
              value={cuisine}
              options={cuisines}
              onChange={setCuisine}
            />
            <FilterMenu
              icon={Salad}
              label="Diet"
              value={diet}
              options={diets}
              onChange={setDiet}
            />
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
            <FeaturedRecipe
              recipe={featured}
              saved={saved.has(featured.id)}
              onToggleSave={canSave ? () => toggleSave(featured.id) : undefined}
            />
          ) : (
            <EmptyState loadError={loadError} hasRecipes={recipes.length > 0} />
          )}
        </section>

        {/* Recipe list */}
        <aside
          aria-label="All recipes"
          className="flex min-h-0 shrink-0 flex-col lg:w-[22rem] xl:w-[24rem]"
        >
          <p className="mb-3 text-sm text-muted-foreground">
            {visible.length} {visible.length === 1 ? "recipe" : "recipes"}
          </p>
          <ul className="flex min-h-0 flex-1 flex-col gap-4 lg:overflow-y-auto lg:pb-2 lg:pr-1">
            {visible.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard
                  recipe={recipe}
                  active={recipe.id === featured?.id}
                  saved={saved.has(recipe.id)}
                  onSelect={() => {
                    setSelectedId(recipe.id);
                    if (window.innerWidth < 1024)
                      window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onToggleSave={
                    canSave ? () => toggleSave(recipe.id) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

const chipClass =
  "inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm transition-colors hover:border-foreground/40 data-[state=open]:border-foreground/40";

function FilterMenu({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(chipClass, value !== ANY && "border-primary")}
        >
          <Icon className="size-4" />
          {value === ANY ? label : value}
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          <DropdownMenuRadioItem value={ANY}>
            Any {label.toLowerCase()}
          </DropdownMenuRadioItem>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o} value={o}>
              {o}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FeaturedRecipe({
  recipe,
  saved,
  onToggleSave,
}: {
  recipe: DashboardRecipe;
  saved: boolean;
  onToggleSave?: () => void;
}) {
  const stats: {
    icon: LucideIcon;
    value: string;
    label: string;
  }[] = [
    {
      icon: Flame,
      value: fmt(recipe.calories_per_serving, " kcal"),
      label: "Calories",
    },
    {
      icon: Dumbbell,
      value: fmt(recipe.protein_g_per_serving, "g"),
      label: "Protein",
    },
    {
      icon: UtensilsCrossed,
      value: `${recipe.ingredient_count}`,
      label: "Ingredients",
    },
    { icon: Clock, value: `${totalMinutes(recipe)} min`, label: "Time" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative flex min-h-[18rem] flex-1 items-center justify-center py-8">
        {/* Butter blob, same shape as the landing hero */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-x-[8%] inset-y-[6%] rounded-[58%_42%_47%_53%/45%_52%_48%_55%]",
            BUTTER,
          )}
        />
        {recipe.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- recipe images can come from any host
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="relative aspect-square max-h-[min(26rem,100%)] w-auto max-w-[70%] rounded-full object-cover shadow-[0_24px_48px_-24px_hsl(230_60%_15%/0.45)]"
          />
        ) : (
          <div className="relative flex aspect-square w-48 items-center justify-center rounded-full bg-card shadow-[0_24px_48px_-24px_hsl(230_60%_15%/0.45)] sm:w-64">
            <UtensilsCrossed className="size-16 text-primary" />
          </div>
        )}

        <div className="absolute left-0 top-4 max-w-[60%] sm:top-6">
          {recipe.cuisine && (
            <p className="text-sm text-muted-foreground">{recipe.cuisine}</p>
          )}
          <h2 className="font-display text-4xl leading-[0.95] tracking-tight sm:text-5xl">
            {recipe.title}
          </h2>
        </div>
        {onToggleSave && (
          <button
            type="button"
            onClick={onToggleSave}
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved" : "Save recipe"}
            className="absolute right-0 top-4 flex size-11 items-center justify-center rounded-full border border-border bg-card transition-colors hover:border-foreground/40 sm:top-6"
          >
            <Heart
              className={cn("size-5", saved && "fill-macro-fat text-macro-fat")}
            />
          </button>
        )}
      </div>

      <div className="surface-paper rounded-3xl bg-card p-4 shadow-[0_24px_48px_-32px_hsl(230_60%_15%/0.45)] sm:p-5">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className="size-4" />
              </span>
              <div className="flex flex-col-reverse">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-semibold tabular-nums">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            Per serving, {recipe.servings} servings. Estimated macros.
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
  saved,
  onSelect,
  onToggleSave,
}: {
  recipe: DashboardRecipe;
  active: boolean;
  saved: boolean;
  onSelect: () => void;
  onToggleSave?: () => void;
}) {
  return (
    <article
      className={cn(
        "relative flex h-48 overflow-hidden rounded-3xl border bg-card transition-colors",
        active ? "border-primary ring-1 ring-primary" : "border-border",
      )}
    >
      <div className="relative z-10 flex min-w-0 flex-1 flex-col p-5">
        <h3 className="line-clamp-2 font-display text-[1.75rem] leading-[1.02] tracking-tight">
          {recipe.title}
        </h3>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-3.5" />
          {totalMinutes(recipe)} minutes
          {recipe.protein_g_per_serving !== null && (
            <>
              <span aria-hidden>·</span>
              {Math.round(recipe.protein_g_per_serving)}g protein
            </>
          )}
        </p>
        <button
          type="button"
          onClick={onSelect}
          className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-4 py-2 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          See recipe
          <ArrowRight className="size-3.5" />
        </button>
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

      {onToggleSave && (
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={saved}
          aria-label={
            saved ? `Remove ${recipe.title} from saved` : `Save ${recipe.title}`
          }
          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-card/90 backdrop-blur"
        >
          <Heart
            className={cn("size-4", saved && "fill-macro-fat text-macro-fat")}
          />
        </button>
      )}
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
              ? "Try a different search, category or filter."
              : "Create your first recipe and it will show up here."}
        </p>
        {!hasRecipes && !loadError && (
          <Button asChild className="mt-6 rounded-full px-6 shadow-none">
            <Link href="/optimize">
              Create Recipe
              <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function unique(values: (string | null | undefined)[]) {
  return Array.from(
    new Set(values.filter((v): v is string => !!v && v.trim() !== "")),
  ).sort((a, b) => a.localeCompare(b));
}

function fmt(value: number | null, unit: string) {
  return value === null ? "–" : `${Math.round(value)}${unit}`;
}
