"use client";

// The Estimated Nutrition panel.

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { AnimatedNumber, fmtCount, fmtPercent } from "@/components/animated-number";
import { NutritionRings } from "@/components/nutrition-rings";
import { dailyValues, type Nutrients, type RecipeNutrition } from "@/lib/nutrition";
import { nutritionRings } from "@/lib/nutrition-rings";
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
  // Rings always show one serving against the daily value.
  const rings = nutritionRings(nutrition.known.perServing, nutrition.known.counted, nutrition.items.length);

  return (
    <section className="surface-paper flex min-h-0 flex-1 flex-col overflow-hidden rounded-panel">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
        <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.015em]">
          Estimated Nutrition
        </h2>
        {isSample && (
          <p className="mt-2 w-fit rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-muted-foreground">
            Sample data: add ingredients to see yours
          </p>
        )}

        <div
          role="radiogroup"
          aria-label="Show nutrition for"
          className="mt-4 grid grid-cols-2 rounded-[10px] bg-secondary p-0.5 text-[13px]"
        >
          {(["serving", "recipe"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={scope === v}
              onClick={() => setScope(v)}
              className={cn(
                "rounded-lg py-1.5 transition-[background-color,box-shadow,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                scope === v
                  ? "bg-card font-semibold text-foreground shadow-[0_1px_3px_rgb(0_0_0/0.12)] dark:bg-[hsl(240_2%_30%)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "serving" ? "Per serving" : "Whole recipe"}
            </button>
          ))}
        </div>

        <p className="mt-3 text-[13px] text-muted-foreground">
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
          <p className="mt-6 rounded-card bg-secondary p-5 text-[15px] text-muted-foreground">
            {hasIngredients
              ? nutrition.skipped
                  .map((item) => item.name + ": " + item.issue)
                  .join(" · ")
              : "Add ingredients with amounts to see estimated nutrition."}
          </p>
        ) : (
          <>
            {/* Rings + calories */}
            <div className="mt-6 flex items-center gap-5">
              <NutritionRings rings={rings} size={112} stroke={11} gap={3} showLegend={false} testId="rings-panel" />
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-muted-foreground">
                  {partialCalories ? "Known calories" : "Calories"}
                </p>
                {calories === null && hasIngredients ? (
                  <p className="mt-1 text-[15px] text-muted-foreground">Unavailable</p>
                ) : (
                  <p className="mt-0.5 flex items-baseline gap-1.5">
                    <span data-testid="calories-value" className="font-rounded text-5xl font-bold leading-none tracking-[-0.02em] tabular-nums">
                      <AnimatedNumber value={calories ?? 0} format={fmtCount} />
                    </span>
                    <span className="text-[15px] font-medium text-muted-foreground">kcal</span>
                  </p>
                )}
              </div>
            </div>
            {partialCalories && (
              <p className="mt-3 text-[13px] text-muted-foreground">
                Calorie subtotal for {calorieCount} of {nutrition.items.length} ingredients.
              </p>
            )}

            {/* Macro split: share of calories */}
            {hasMacroSplit && macroSum > 0 && (
              <ul className="mt-4 flex gap-4 text-[13px]">
                {split.map((m) => (
                  <li key={m.key} className="flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-full", m.color)} />
                    {m.label}{" "}
                    <span className="font-rounded tabular-nums text-muted-foreground">
                      <AnimatedNumber value={(m.kcal / macroSum) * 100} format={fmtPercent} />
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Label rows */}
            <dl className="mt-6 text-[15px]">
              <div className="flex justify-end border-b border-border pb-1.5 text-[12px] font-medium text-muted-foreground">
                % Daily Value*
              </div>
              {factRows.map((row) => {
                const value = n[row.key];
                const dv = dailyValues[row.key];
                return (
                  <div
                    key={row.key}
                    className={cn(
                      "flex items-baseline justify-between gap-2 border-b border-border/70 py-2.5",
                      row.sub && "pl-4 text-muted-foreground",
                    )}
                  >
                    <dt>
                      <span className={cn(!row.sub && "font-semibold")}>
                        {row.label}
                      </span>{" "}
                      <span className="font-rounded tabular-nums">
                        <AnimatedNumber
                          value={value ?? 0}
                          format={(v) => fmtNutrient(v, row.unit)}
                        />
                        {partial(row.key) && <sup>†</sup>}
                      </span>
                    </dt>
                    <dd className="font-rounded font-semibold tabular-nums">
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
              <div className="mt-5 rounded-card bg-nutrient-carbs/10 p-4 text-[13px]">
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
            <details className="group mt-5 text-[15px]">
              <summary className="cursor-pointer list-none font-medium marker:hidden">
                <span className="text-primary hover:underline hover:underline-offset-4">
                  Breakdown by ingredient
                </span>
              </summary>
              <ul className="mt-2 flex flex-col">
                {nutrition.items.map((i, idx) => (
                  <li
                    key={`${i.name}-${idx}`}
                    className="flex items-baseline justify-between gap-2 border-b border-border/70 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{i.name}</span>
                      <span className="block text-[12px] text-muted-foreground">
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
                    <span className="shrink-0 font-rounded tabular-nums">
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

        <p className="mt-auto pt-6 text-[12px] leading-snug text-muted-foreground">
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
