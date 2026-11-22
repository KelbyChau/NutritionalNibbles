"use client";

// The Before → Now table beside the chat.

import type { Nutrients, RecipeNutrition } from "@/lib/nutrition";
import { cn } from "@/lib/utils";
import { AnimatedNumber, type GoalKey } from "../shared";
import { formatAmount } from "./swap-text";

export function perServingComparison(nutrition: RecipeNutrition, key: keyof Nutrients, servings: number) {
  let total = 0;
  let counted = 0;
  for (const item of nutrition.items) {
    const value = item.nutrients?.[key];
    if (value == null) continue;
    total += value;
    counted++;
  }
  return {
    value: counted || !nutrition.items.length ? total / servings : null,
    partial: counted > 0 && counted < nutrition.items.length,
  };
}

export function Comparison({
  before,
  now,
  servings,
  goal,
}: {
  before: RecipeNutrition;
  now: RecipeNutrition;
  servings: number;
  goal: GoalKey | null;
}) {
  const rows: {
    key: keyof Nutrients;
    label: string;
    unit: string;
    goal?: GoalKey;
    better: "up" | "down";
  }[] = [
    {
      key: "kcal",
      label: "Calories",
      unit: " kcal",
      goal: "calories",
      better: "down",
    },
    {
      key: "protein",
      label: "Protein",
      unit: " g",
      goal: "protein",
      better: "up",
    },
    { key: "carbs", label: "Carbs", unit: " g", goal: "carbs", better: "down" },
    { key: "fat", label: "Fat", unit: " g", goal: "fat", better: "down" },
    { key: "sugar", label: "Total sugars", unit: " g", better: "down" },
    { key: "sodium", label: "Sodium", unit: " mg", better: "down" },
  ];
  const comparison = rows.map((row) => ({
    ...row,
    before: perServingComparison(before, row.key, servings),
    now: perServingComparison(now, row.key, servings),
  }));
  return (
    <section className="surface-paper rounded-3xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl leading-none">Before → Now</h2>
        <span className="text-[11px] text-muted-foreground">per serving</span>
      </div>
      <dl className="mt-3 flex flex-col">
        {comparison.map((r) => {
          const a = r.before.value;
          const b = r.now.value;
          const wholeNumber = r.key === "kcal" || r.key === "sodium";
          const display = (value: number) => formatAmount.format(wholeNumber ? Math.round(value) : value);
          const d = a === null || b === null || r.before.partial || r.now.partial ? null : b - a;
          const threshold = wholeNumber ? 0.5 : 0.005;
          const good =
            d !== null &&
            Math.abs(d) >= threshold &&
            (r.better === "up" ? d > 0 : d < 0);
          const bad = d !== null && Math.abs(d) >= threshold && !good;
          return (
            <div
              key={r.key}
              className={cn(
                "grid grid-cols-[1fr_auto_auto] items-baseline gap-3 border-b border-border py-1.5 text-sm last:border-0",
                goal === r.goal && "font-semibold",
              )}
            >
              <dt className="flex items-center gap-1.5">
                {r.label}
                {goal === r.goal && (
                  <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium">
                    goal
                  </span>
                )}
              </dt>
              <dd className="tabular-nums text-muted-foreground">
                <AnimatedNumber value={a} format={(v) => (v === null ? "—" : display(v))} />
                {r.before.partial && <sup>†</sup>} →{" "}
                <span className="text-foreground">
                  <AnimatedNumber value={b} format={(v) => (v === null ? "—" : display(v))} />
                  {r.now.partial && <sup>†</sup>}
                  {r.unit}
                </span>
              </dd>
              <dd
                className={cn(
                  "w-14 text-right text-xs tabular-nums",
                  good && "text-macro-protein",
                  bad && "text-macro-fat",
                  !good && !bad && "text-muted-foreground",
                )}
              >
                {d === null ? (
                  ""
                ) : Math.abs(d) < threshold ? (
                  "same"
                ) : (
                  <AnimatedNumber
                    value={d}
                    format={(v) => (v === null ? "" : `${v > 0 ? "+" : "−"}${display(Math.abs(v))}`)}
                  />
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      {comparison.some((row) => row.before.partial || row.now.partial) && (
        <p className="mt-2 text-xs text-muted-foreground">
          † Subtotal. Some ingredients lack data for that nutrient.
        </p>
      )}
    </section>
  );
}
