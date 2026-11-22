"use client";

// The Estimated Nutrition panel.

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { AnimatedNumber, fmtCount, fmtPercent } from "@/components/animated-number";
import { dailyValues, type Nutrients, type RecipeNutrition } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

const factRows: {
  key: keyof Nutrients;
  label: string;
  unit: "g" | "mg";
  sub?: boolean;
}[] = [
  { key: "fat", label: "Total Fat", unit: "g" },
  { key: "satFat", label: "Saturated Fat", unit: "g", sub: true },
  { key: "cholesterol", label: "Cholesterol", unit: "mg" },
  { key: "sodium", label: "Sodium", unit: "mg" },
  { key: "carbs", label: "Total Carbohydrate", unit: "g" },
  { key: "fiber", label: "Dietary Fiber", unit: "g", sub: true },
  { key: "sugar", label: "Total Sugars", unit: "g", sub: true },
  { key: "protein", label: "Protein", unit: "g" },
];

export function NutritionPanel({
  nutrition,
  servings,
  hasIngredients,
  isSample,
  showZeros,
}: {
  nutrition: RecipeNutrition;
  servings: number;
  hasIngredients: boolean;
  isSample?: boolean;
  // With no ingredients, show the full label filled with zeros instead of
  // the "add ingredients" message.
  showZeros?: boolean;
}) {
  const [scope, setScope] = useState<"serving" | "recipe">("serving");
  // Subtotals over the ingredients that have data, marked † when some don't.
  const n = scope === "serving" ? nutrition.known.perServing : nutrition.known.total;
  const partial = (key: keyof Nutrients) =>
    n[key] === null || nutrition.known.counted[key] < nutrition.counted;
  const calories = scope === "serving" ? nutrition.knownCalories.perServing : nutrition.knownCalories.total;
  const calorieCount = nutrition.knownCalories.counted;
  const partialCalories = calorieCount > 0 && calorieCount < nutrition.items.length;

  // Share of calories from each macro (4/4/9 kcal per gram).
  const hasMacroSplit =
    n.protein !== null && n.carbs !== null && n.fat !== null;
  const macroKcal = {
    protein: (n.protein ?? 0) * 4,
    carbs: (n.carbs ?? 0) * 4,
    fat: (n.fat ?? 0) * 9,
  };
  const macroSum = macroKcal.protein + macroKcal.carbs + macroKcal.fat;
  const split = [
    {
      key: "protein",
      label: "Protein",
      color: "bg-macro-protein",
      kcal: macroKcal.protein,
    },
    {
      key: "carbs",
      label: "Carbs",
      color: "bg-macro-carbs",
      kcal: macroKcal.carbs,
    },
    { key: "fat", label: "Fat", color: "bg-macro-fat", kcal: macroKcal.fat },
  ];

  return (
    <section className="surface-paper flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
        <h2 className="font-display text-4xl leading-none tracking-tight">
          Estimated Nutrition
        </h2>
        {isSample && (
          <p className="mt-2 w-fit rounded-full bg-[hsl(45_84%_72%)] px-3 py-1 text-[11px] font-medium text-[hsl(230_50%_16%)]">
            Sample data: add ingredients to see yours
          </p>
        )}

        <div
          role="radiogroup"
          aria-label="Show nutrition for"
          className="mt-4 grid grid-cols-2 rounded-full bg-muted p-1 text-xs"
        >
          {(["serving", "recipe"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={scope === v}
              onClick={() => setScope(v)}
              className={cn(
                "rounded-full py-1.5 transition-colors",
                scope === v
                  ? "bg-primary font-medium text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "serving" ? "Per serving" : "Whole recipe"}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          <AnimatedNumber value={servings} format={fmtCount} />{" "}
          {servings === 1 ? "serving" : "servings"} per recipe
          {hasIngredients && (
            <>
              {" · "}
              <AnimatedNumber value={nutrition.counted} format={fmtCount} /> of{" "}
              <AnimatedNumber
                value={nutrition.items.length}
                format={fmtCount}
              />{" "}
              ingredients counted
            </>
          )}
        </p>

        {(hasIngredients ? nutrition.counted === 0 : !showZeros) ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            {hasIngredients
              ? nutrition.skipped
                  .map((item) => item.name + ": " + item.issue)
                  .join(" · ")
              : "Add ingredients with amounts to see estimated nutrition."}
          </p>
        ) : (
          <>
            {/* Calories */}
            <div className="mt-3 flex items-end justify-between border-y-[6px] border-foreground py-2">
              <span className="text-lg font-bold">{partialCalories ? "Known calories" : "Calories"}</span>
              {calories === null && hasIngredients ? (
                <span className="text-sm text-muted-foreground">Unavailable</span>
              ) : (
                <span className="font-display text-5xl leading-none tabular-nums">
                  <AnimatedNumber value={calories ?? 0} format={fmtCount} />
                </span>
              )}
            </div>
            {partialCalories && (
              <p className="mt-2 text-xs text-muted-foreground">
                Calorie subtotal for {calorieCount} of {nutrition.items.length} ingredients.
              </p>
            )}

            {/* Macro split */}
            {hasMacroSplit && macroSum > 0 && (
              <div className="mt-3">
                <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                  {split.map((m) => (
                    <div
                      key={m.key}
                      className={cn(
                        m.color,
                        "transition-[width] duration-300 ease-out motion-reduce:transition-none",
                      )}
                      style={{ width: `${(m.kcal / macroSum) * 100}%` }}
                    />
                  ))}
                </div>
                <ul className="mt-2 flex justify-between text-xs">
                  {split.map((m) => (
                    <li key={m.key} className="flex items-center gap-1.5">
                      <span className={cn("size-2 rounded-full", m.color)} />
                      {m.label}{" "}
                      <span className="tabular-nums text-muted-foreground">
                        <AnimatedNumber
                          value={(m.kcal / macroSum) * 100}
                          format={fmtPercent}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Label rows */}
            <dl className="mt-3 text-sm">
              <div className="flex justify-end border-b border-foreground/60 pb-1 text-[11px] font-semibold">
                % Daily Value*
              </div>
              {factRows.map((row) => {
                const value = n[row.key];
                const dv = dailyValues[row.key];
                return (
                  <div
                    key={row.key}
                    className={cn(
                      "flex items-baseline justify-between gap-2 border-b border-border py-1.5",
                      row.sub && "pl-4",
                    )}
                  >
                    <dt>
                      <span className={cn(!row.sub && "font-semibold")}>
                        {row.label}
                      </span>{" "}
                      <span className="tabular-nums">
                        <AnimatedNumber
                          value={value ?? 0}
                          format={(v) => fmtNutrient(v, row.unit)}
                        />
                        {partial(row.key) && <sup>†</sup>}
                      </span>
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {dv && value !== null ? (
                        <AnimatedNumber
                          value={(value / dv) * 100}
                          format={fmtPercent}
                        />
                      ) : (
                        ""
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>

            {/* Anything we couldn't count */}
            {nutrition.skipped.length > 0 && (
              <div className="mt-4 rounded-2xl bg-[hsl(45_84%_72%/0.35)] p-3 text-xs">
                <p className="flex items-center gap-1.5 font-semibold">
                  <TriangleAlert className="size-3.5" />
                  Not counted in the totals
                </p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {nutrition.skipped.map((i, idx) => (
                    <li key={`${i.name}-${idx}`}>
                      <span className="font-medium">{i.name}</span>: {i.issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Per-ingredient breakdown */}
            <details className="group mt-4 text-sm">
              <summary className="cursor-pointer list-none font-medium marker:hidden">
                <span className="underline decoration-foreground/30 underline-offset-4 group-open:decoration-foreground">
                  Breakdown by ingredient
                </span>
              </summary>
              <ul className="mt-2 flex flex-col">
                {nutrition.items.map((i, idx) => (
                  <li
                    key={`${i.name}-${idx}`}
                    className="flex items-baseline justify-between gap-2 border-b border-border py-1.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{i.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {i.grams !== null ? (
                          <AnimatedNumber
                            value={i.grams}
                            format={(g) => `${fmtCount(g)} g`}
                          />
                        ) : (
                          "not counted"
                        )}
                        {i.note && ` · ${i.note}`}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      <AnimatedNumber
                        value={i.nutrients?.kcal ?? 0}
                        format={formatCalories}
                      />
                      {i.nutrients?.kcal == null && <sup>†</sup>}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}

        <p className="mt-auto pt-4 text-[11px] leading-snug text-muted-foreground">
          * % Daily Value is based on a 2,000-calorie diet. † Some ingredients
          have no USDA data for this nutrient, so it counts only the ones that
          do (0 when none do).
        </p>
      </div>
    </section>
  );
}

export function formatCalories(value: number | null) {
  return value === null ? "—" : `${Math.round(value)} kcal`;
}

export function fmtNutrient(value: number | null, unit: "g" | "mg") {
  if (value === null) return "—";
  if (unit === "mg") return `${Math.round(value)} mg`;
  return `${Number(value.toFixed(2))} g`;
}
