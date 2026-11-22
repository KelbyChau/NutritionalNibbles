"use client";

// Recipe cards on the dashboard: the featured recipe, the grid cards and the empty state.

import Link from "next/link";
import type { Variants } from "motion/react";
import { Clock, Dumbbell, Flame, Trash2, Users, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedNumber, fmtCount } from "@/components/animated-number";
import { NutritionRings } from "@/components/nutrition-rings";
import { nutritionRings } from "@/lib/nutrition-rings";
import { cn } from "@/lib/utils";
import type { DashboardRecipe } from "./recipe-dashboard";

export const totalMinutes = (r: DashboardRecipe) => r.prep_minutes + r.cook_minutes;

// Exit for a recipe card. AnimatePresence hands the current `deleted` set to
// cards as they leave: a deleted card fades and collapses (taking the list's
// 16px gap with it) so the ones below slide up; a card that only left because
// of a search or filter disappears instantly.
export const cardExit = (id: string): Variants => ({
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

export function FeaturedRecipe({ recipe }: { recipe: DashboardRecipe }) {
  // Each stat rolls to the new value when a different recipe is shown.
  const stats: {
    icon: LucideIcon;
    value: number | null;
    unit: string;
    label: string;
    tone: string;
  }[] = [
    {
      icon: Flame,
      value: recipe.calories_per_serving,
      unit: " kcal",
      label: "Calories",
      tone: "bg-nutrient-calories/10 text-nutrient-calories",
    },
    {
      icon: Dumbbell,
      value: recipe.protein_g_per_serving,
      unit: "g",
      label: "Protein",
      tone: "bg-nutrient-protein/10 text-nutrient-protein",
    },
    {
      icon: UtensilsCrossed,
      value: recipe.ingredient_count,
      unit: "",
      label: "Ingredients",
      tone: "bg-secondary",
    },
    // Recipes saved from the builder have no cooking time: show "–", not 0.
    {
      icon: Clock,
      value: totalMinutes(recipe) || null,
      unit: " min",
      label: "Time",
      tone: "bg-secondary",
    },
  ];

  const rings = recipeRings(recipe);

  // Long names get a smaller font so they wrap instead of running off.
  const len = recipe.title.length;
  const titleSize =
    len > 48 ? "text-[28px] sm:text-[32px]" : len > 28 ? "text-[32px] sm:text-[40px]" : "text-[36px] sm:text-[48px]";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
      {/* Featured, App Store "Today" style: the recipe and its rings. */}
      <article className="surface-paper flex flex-1 flex-col overflow-hidden rounded-panel md:flex-row">
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-8 p-7 sm:p-9">
          <div className="min-w-0">
            <h2
              className={cn(
                "font-semibold leading-[1.05] tracking-[-0.02em] [overflow-wrap:anywhere] [text-wrap:balance]",
                titleSize,
              )}
            >
              {recipe.title}
            </h2>
            <p className="mt-3 flex items-center gap-1.5 text-[15px] text-muted-foreground">
              <Users className="size-4" />
              <AnimatedNumber value={recipe.servings} format={fmtCount} />{" "}
              {recipe.servings === 1 ? "serving" : "servings"}. Estimated, per serving.
            </p>
          </div>
          <div>
            <Button asChild size="lg">
              <Link href={`/optimize?recipe=${recipe.id}`}>Optimize this recipe</Link>
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center bg-secondary/60 p-8 md:w-[44%]">
          {recipe.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- recipe images can come from any host
            <img src={recipe.image_url} alt={recipe.title} className="aspect-square w-full max-w-72 rounded-full object-cover shadow-panel" />
          ) : (
            <NutritionRings rings={rings} size={220} stroke={20} gap={4} showLegend={false} testId="rings-featured" />
          )}
        </div>
      </article>

      <div className="surface-paper rounded-panel p-4 sm:p-5">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(({ icon: Icon, value, unit, label, tone }) => (
            <div key={label} className="flex items-center gap-3">
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", tone)}>
                <Icon className="size-4" />
              </span>
              <div className="flex flex-col-reverse">
                <dt className="text-[12px] text-muted-foreground">{label}</dt>
                <dd className="font-rounded text-[19px] font-semibold tabular-nums">
                  <AnimatedNumber value={value} format={(n) => fmt(n, unit)} />
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function RecipeCard({
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
        "relative flex cursor-pointer items-center gap-4 rounded-card bg-card p-3 pr-4 shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-[box-shadow,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:shadow-none",
        active ? "ring-2 ring-primary" : "hover:bg-secondary/60",
      )}
    >
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-secondary">
        {recipe.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- recipe images can come from any host
          <img src={recipe.image_url} alt="" className="size-full object-cover" />
        ) : (
          <UtensilsCrossed className="size-6 text-primary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-[17px] font-semibold leading-snug tracking-[-0.01em]">{recipe.title}</h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] font-medium">
          {/* Saved recipes have no cooking time; skip it rather than "0 minutes". */}
          {totalMinutes(recipe) > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
              <Clock className="size-3" aria-hidden />
              {totalMinutes(recipe)} min
            </span>
          )}
          {recipe.protein_g_per_serving !== null && (
            <span className="rounded-full bg-nutrient-protein/15 px-2 py-0.5 text-foreground">
              {Math.round(recipe.protein_g_per_serving)}g protein
            </span>
          )}
          {recipe.calories_per_serving !== null && (
            <span className="rounded-full bg-nutrient-calories/15 px-2 py-0.5 text-foreground">
              {Math.round(recipe.calories_per_serving)} kcal
            </span>
          )}
        </p>
      </div>
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
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </article>
  );
}

export function EmptyState({
  loadError,
  hasRecipes,
}: {
  loadError: string | null;
  hasRecipes: boolean;
}) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center py-16 text-center">
      <div className="relative max-w-sm">
        <span aria-hidden className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <UtensilsCrossed className="size-7 text-primary" />
        </span>
        <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.015em]">
          {loadError
            ? "Couldn't load recipes"
            : hasRecipes
              ? "Nothing matches"
              : "No recipes yet"}
        </h2>
        <p className="mt-2 text-[17px] text-muted-foreground">
          {loadError
            ? loadError
            : hasRecipes
              ? "Try a different search or category."
              : "Create your first recipe and it will show up here."}
        </p>
        {!hasRecipes && !loadError && (
          <Button asChild size="lg" className="mt-6">
            <Link href="/optimize">Create a recipe</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// Rings for a saved recipe, from its per-serving numbers.
function recipeRings(recipe: DashboardRecipe) {
  const perServing = {
    kcal: recipe.calories_per_serving,
    protein: recipe.protein_g_per_serving,
    carbs: recipe.carbohydrates_g_per_serving,
    fat: recipe.fat_g_per_serving,
    satFat: null, fiber: null, sugar: null, sodium: null, cholesterol: null,
  };
  const counted = Object.fromEntries(Object.keys(perServing).map((k) => [k, 1])) as Record<keyof typeof perServing, number>;
  return nutritionRings(perServing, counted, 1);
}

export function fmt(value: number | null, unit: string) {
  return value === null ? "–" : `${Math.round(value)}${unit}`;
}
