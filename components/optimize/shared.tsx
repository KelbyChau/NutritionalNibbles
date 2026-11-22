"use client";

// Pieces shared by the recipe builder (/optimize) and the optimize chat
// (/optimize/chat): ingredient type, goals, art, combobox, nutrition panel,
// the USDA catalog loader, and the draft handed between the two pages.

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import {
  AnimatedNumber,
  fmtCount,
  fmtPercent,
} from "@/components/animated-number";
import {
  ArrowUp,
  Droplet,
  Dumbbell,
  Flame,
  TriangleAlert,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import {
  ingredientImage,
  lookupIngredient,
  parseIngredient,
  type IngredientInfo,
} from "@/lib/ingredients";
import {
  dailyValues,
  type Nutrients,
  type RecipeNutrition,
} from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/client";
import {
  foodLabel,
  foodSuggestions,
  type FoundationFood,
} from "@/lib/foundation-foods";
import { cn } from "@/lib/utils";

export type GoalKey = "protein" | "calories" | "carbs" | "fat";

export const goals: {
  key: GoalKey;
  label: string;
  phrase: string;
  icon: LucideIcon;
  color: string;
  words: RegExp;
}[] = [
  {
    key: "protein",
    label: "Higher protein",
    phrase: "higher protein",
    icon: Dumbbell,
    color: "text-macro-protein",
    words: /protein/i,
  },
  {
    key: "calories",
    label: "Lower calorie",
    phrase: "lower calorie",
    icon: Flame,
    color: "text-macro-fat",
    words: /calori|kcal|lighter/i,
  },
  {
    key: "carbs",
    label: "Lower carb",
    phrase: "lower carb",
    icon: Wheat,
    color: "text-macro-carbs",
    words: /carb|keto/i,
  },
  {
    key: "fat",
    label: "Lower fat",
    phrase: "lower fat",
    icon: Droplet,
    color: "text-macro-fat",
    words: /\bfat\b/i,
  },
];

export type Ingredient = IngredientInfo & {
  food: FoundationFood;
  id: number;
  amount: string;
  unit: string;
};

// The landing page's butter yellow, fixed so it reads the same in both themes.
export const BUTTER = "bg-[hsl(45_84%_72%)]";
export const SHADOW = "shadow-[0_24px_48px_-24px_hsl(230_60%_15%/0.45)]";

// ---- USDA catalog ------------------------------------------------------------

const PAGE = 1000; // Supabase returns at most 1,000 rows per request

// Every USDA food the app can use, from both catalogs: Foundation Foods
// (newer data, listed first so it wins ties in search) and SR Legacy
// (~7,800 more, including brand-name foods). One list, one search field.
export function useUsdaFoods() {
  const [foods, setFoods] = useState<FoundationFood[]>([]);
  const [status, setStatus] = useState("Loading USDA ingredients…");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    async function load() {
      try {
        const supabase = createClient();
        const [foundation, legacyCount] = await Promise.all([
          supabase.from("foundation_foods").select().order("fdc_id"),
          supabase.from("sr_legacy_foods").select("fdc_id", { count: "exact", head: true }),
        ]);
        if (foundation.error || !foundation.data?.length || legacyCount.error)
          throw new Error("Catalog unavailable");
        const pages = await Promise.all(
          Array.from({ length: Math.ceil((legacyCount.count ?? 0) / PAGE) }, (_, i) =>
            supabase
              .from("sr_legacy_foods")
              .select()
              .order("fdc_id")
              .range(i * PAGE, (i + 1) * PAGE - 1),
          ),
        );
        if (pages.some((page) => page.error)) throw new Error("Catalog unavailable");
        if (current) {
          setFoods([
            ...foundation.data.map((f) => ({ ...f, source: "foundation" as const })),
            ...pages.flatMap((page) => page.data ?? []).map((f) => ({ ...f, source: "sr_legacy" as const })),
          ]);
          setStatus("");
        }
      } catch {
        if (current) setStatus("Couldn’t load USDA ingredients.");
      }
    }
    void load();
    return () => {
      current = false;
    };
  }, [attempt]);
  const retry = () => {
    setStatus("Loading USDA ingredients…");
    setAttempt((n) => n + 1);
  };
  return { foods, status, retry };
}

export function makeIngredient(
  food: FoundationFood,
  parsed: { amount: string; unit: string },
  id: number,
): Ingredient {
  return {
    ...lookupIngredient(foodLabel(food.description)),
    name: foodLabel(food.description),
    food,
    id,
    amount: parsed.amount || (parsed.unit ? "" : "100"),
    unit: parsed.amount || parsed.unit ? parsed.unit : "g",
  };
}

// ---- Draft handed from the builder to the chat page -------------------------
// Kept in sessionStorage (this tab only). `original` is the recipe as it was
// when Optimize was pressed; `current` is the latest edited version.

export type OptimizeDraft = {
  title: string;
  servings: number;
  original: Ingredient[];
  current: Ingredient[];
  /** Set once the recipe is saved, so saving again updates it. */
  savedId?: string | null;
};

const DRAFT_KEY = "nutritionalnibbles:optimize-draft";

export function saveDraft(draft: OptimizeDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage blocked (private window etc.): the chat page shows its empty state.
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage blocked: nothing to clear.
  }
}

export function loadDraft(): OptimizeDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as OptimizeDraft;
    return Array.isArray(d.current) && Array.isArray(d.original) ? d : null;
  } catch {
    return null;
  }
}

// ---- Small UI pieces ---------------------------------------------------------

export { AnimatedNumber, fmtCount, fmtPercent };

export function IngredientArt({
  ingredient,
  sizeRem,
  className,
}: {
  ingredient: IngredientInfo;
  sizeRem: number;
  className?: string;
}) {
  return (
    <Image
      src={ingredient.image ?? ingredientImage(ingredient.name)}
      alt={ingredient.name}
      width={224}
      height={224}
      unoptimized
      style={{ width: `${sizeRem}rem`, height: `${sizeRem}rem` }}
      // Grows/shrinks smoothly when it moves to a bigger or smaller plate spot.
      className={cn(
        "object-contain transition-[width,height] duration-300 ease-out motion-reduce:transition-none",
        className,
      )}
    />
  );
}

export function Stat({
  icon: Icon,
  label,
  value,
  number,
  muted,
}: {
  icon: LucideIcon;
  label: string;
  /** Shown as-is; ignored when `number` is given. */
  value?: string;
  /** Rolls to each new value (see AnimatedNumber). */
  number?: { value: number | null; format: (n: number | null) => string };
  muted?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-col-reverse">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd
          className={cn(
            "truncate font-semibold tabular-nums",
            muted && "font-normal text-muted-foreground",
          )}
        >
          {number ? <AnimatedNumber {...number} /> : value}
        </dd>
      </div>
    </div>
  );
}

export function ingredientOptions(text: string, foods: FoundationFood[]) {
  const parsed = parseIngredient(text);
  if (!parsed) return [];
  return foodSuggestions(foods, parsed.name).map((food) => ({
    food,
    text: [parsed.amount, parsed.unit, foodLabel(food.description)]
      .filter(Boolean)
      .join(" "),
    emoji: lookupIngredient(foodLabel(food.description)).emoji,
  }));
}

// ---- Combobox (input + suggestion popup) -------------------------------------

export function Combobox<
  T extends { text: string; icon?: LucideIcon; food?: FoundationFood },
>({
  value,
  onChange,
  onSubmit,
  options,
  renderIcon,
  placeholder,
  label,
  leading,
  sendButton,
  error,
  listPosition,
  size = "md",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (text: string, option?: T) => void;
  options: T[];
  renderIcon: (o: T) => React.ReactNode;
  placeholder: string;
  label: string;
  leading: React.ReactNode;
  sendButton?: boolean;
  error?: string;
  listPosition: "above" | "below";
  size?: "md" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const show = open && options.length > 0;

  useEffect(() => setActive(-1), [value]);

  function pick(text: string, option?: T) {
    onSubmit(text, option);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (show && e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (show && e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (show && e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      onChange(options[Math.max(0, active)].text);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (show && active >= 0) pick(options[active].text, options[active]);
      else if (value.trim()) pick(value);
    }
  }

  return (
    <div className="relative">
      {show && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          className={cn(
            "surface-paper absolute inset-x-0 z-30 overflow-hidden rounded-3xl border border-border bg-card p-1.5",
            SHADOW,
            listPosition === "above" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          {options.map((o, i) => (
            <li
              key={o.text + i}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus in the input
                pick(o.text, o);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm",
                i === active && "bg-muted",
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background">
                {renderIcon(o)}
              </span>
              <span className="truncate">{o.text}</span>
            </li>
          ))}
          <li
            aria-hidden
            className="px-3 pb-1 pt-1.5 text-[11px] text-muted-foreground"
          >
            ↑↓ to move · Enter to pick · Tab to fill in · Esc to close
          </li>
        </ul>
      )}
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border bg-card pl-4 pr-1.5 focus-within:border-primary",
          size === "lg" ? "h-14" : "h-12",
          error ? "border-destructive" : "border-border",
          sendButton && "shadow-[0_16px_40px_-28px_hsl(230_60%_15%/0.5)]",
        )}
      >
        {leading}
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={label}
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            show && active >= 0 ? `${listId}-${active}` : undefined
          }
          aria-invalid={!!error}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground",
            size === "lg" ? "text-base" : "text-sm",
          )}
        />
        {sendButton ? (
          <button
            type="button"
            disabled={!value.trim()}
            onClick={() => pick(value)}
            aria-label="Send"
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors disabled:bg-muted disabled:text-muted-foreground",
              size === "lg" ? "size-11" : "size-9",
            )}
          >
            <ArrowUp className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!value.trim()}
            onClick={() => pick(value)}
            className="h-9 shrink-0 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors disabled:bg-muted disabled:text-muted-foreground"
          >
            Add
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 pl-4 text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ---- Nutrition panel -----------------------------------------------------------

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
