"use client";

// Recipe cards on the dashboard: the featured recipe, the grid cards and the empty state.

import Link from "next/link";
import type { Variants } from "motion/react";
import { ArrowRight, Clock, Dumbbell, Flame, Trash2, Users, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedNumber, fmtCount } from "@/components/animated-number";
import { BUTTER } from "@/components/optimize/shared";
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

export function EmptyState({
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

export function fmt(value: number | null, unit: string) {
  return value === null ? "–" : `${Math.round(value)}${unit}`;
}
