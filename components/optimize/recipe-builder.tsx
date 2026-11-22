"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dumbbell,
  Flame,
  Import,
  LayoutGrid,
  Minus,
  Plus,
  UtensilsCrossed,
  WandSparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { parseIngredient } from "@/lib/ingredients";
import { calculateNutrition } from "@/lib/nutrition";
import { exactFood, type FoundationFood } from "@/lib/foundation-foods";
import { cn } from "@/lib/utils";
import {
  BUTTER,
  Combobox,
  IngredientArt,
  NutritionPanel,
  Stat,
  fmtNutrient,
  formatCalories,
  ingredientOptions,
  loadDraft,
  makeIngredient,
  saveDraft,
  useFoundationFoods,
  type Ingredient,
} from "./shared";

// Where ingredient art sits on the stage, in % of the stage box. The first
// ingredient takes the big center spot; the rest scatter around it.
const spots = [
  { left: 50, top: 50, size: 11 },
  { left: 24, top: 30, size: 6.5 },
  { left: 76, top: 28, size: 6.5 },
  { left: 22, top: 72, size: 6 },
  { left: 78, top: 72, size: 6 },
  { left: 50, top: 16, size: 5 },
  { left: 50, top: 86, size: 5 },
  { left: 10, top: 50, size: 4.5 },
  { left: 90, top: 50, size: 4.5 },
];

// Dummy recipe shown in the nutrition panel while the ingredient list is
// empty. Set SHOW_SAMPLE_NUTRITION to false to turn it off.
const SHOW_SAMPLE_NUTRITION = false;
const sampleIngredients = [
  { name: "Chicken breast", amount: "400", unit: "g" },
  { name: "Pasta", amount: "200", unit: "g" },
  { name: "Heavy cream", amount: "1/2", unit: "cup" },
  { name: "Parmesan", amount: "1/2", unit: "cup" },
  { name: "Butter", amount: "1", unit: "tbsp" },
  { name: "Garlic", amount: "3", unit: "clove" },
  { name: "Broccoli", amount: "2", unit: "cup" },
  { name: "Salt", amount: "", unit: "" },
];

export function RecipeBuilder() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [servings, setServings] = useState(2);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const nextId = useRef(1);
  const { foods, status: catalogStatus, retry } = useFoundationFoods();

  // Coming back from the chat page: pick up the recipe where it was left.
  useEffect(() => {
    const draft = loadDraft();
    if (!draft) return;
    setTitle(draft.title);
    setServings(draft.servings);
    setIngredients(draft.current);
    nextId.current = Math.max(0, ...draft.current.map((i) => i.id)) + 1;
  }, []);

  const realNutrition = useMemo(
    () => calculateNutrition(ingredients, servings),
    [ingredients, servings],
  );
  // Until the user adds something, show sample numbers so the layout is visible.
  const isSample = SHOW_SAMPLE_NUTRITION && ingredients.length === 0;
  const sampleNutrition = useMemo(
    () => calculateNutrition(sampleIngredients, servings),
    [servings],
  );
  const nutrition = isSample ? sampleNutrition : realNutrition;

  function addFood(
    food: FoundationFood,
    parsed: { amount: string; unit: string },
  ) {
    setIngredients((list) => [
      ...list,
      makeIngredient(food, parsed, nextId.current++),
    ]);
  }

  function removeIngredient(id: number) {
    setIngredients((list) => list.filter((i) => i.id !== id));
  }

  function optimize() {
    if (!ingredients.length) return;
    saveDraft({
      title,
      servings,
      original: ingredients,
      current: ingredients,
    });
    router.push("/optimize/chat");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background xl:h-dvh xl:overflow-hidden">
      {/* Top bar */}
      <header className="flex flex-wrap items-center gap-3 px-4 pb-2 pt-5 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="NutritionalNibbles home"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-display text-3xl leading-none text-primary-foreground"
        >
          N
        </Link>
        <h1 className="mr-auto font-display text-3xl leading-none tracking-tight sm:text-4xl">
          New Recipe
        </h1>
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm transition-colors hover:border-foreground/40"
        >
          <LayoutGrid className="size-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
        {/* UI only for now: no import behavior yet. */}
        <button
          type="button"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm transition-colors hover:border-foreground/40"
        >
          <Import className="size-4" />
          <span className="hidden sm:inline">Import</span>
        </button>
        <div className="flex h-11 items-center rounded-full border border-border bg-card px-1">
          <ThemeSwitcher />
        </div>
        <Button
          onClick={optimize}
          disabled={!ingredients.length}
          title={ingredients.length ? undefined : "Add ingredients first"}
          className="h-11 rounded-full px-5 shadow-none"
        >
          <WandSparkles />
          Optimize
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 px-4 pb-5 pt-4 sm:px-6 lg:px-8 xl:flex-row xl:gap-6">
        {/* Stage + stats */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Stage title={title} onTitle={setTitle} ingredients={ingredients} />

          <div className="surface-paper rounded-3xl bg-card p-4 shadow-[0_24px_48px_-32px_hsl(230_60%_15%/0.45)] sm:px-6">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                icon={Flame}
                label="Calories / serving"
                value={
                  !ingredients.length
                    ? "0 kcal"
                    : nutrition.counted
                      ? formatCalories(nutrition.perServing.kcal)
                      : "–"
                }
              />
              <Stat
                icon={Dumbbell}
                label="Protein / serving"
                value={
                  !ingredients.length
                    ? "0 g"
                    : nutrition.counted
                      ? fmtNutrient(nutrition.perServing.protein, "g")
                      : "–"
                }
              />
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Users className="size-4" />
                </span>
                <div className="flex flex-col-reverse">
                  <dt className="text-xs text-muted-foreground">Servings</dt>
                  <dd className="flex items-center gap-1.5 font-semibold tabular-nums">
                    <button
                      type="button"
                      aria-label="Fewer servings"
                      onClick={() => setServings((s) => Math.max(1, s - 1))}
                      className="flex size-5 items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-primary-foreground"
                    >
                      <Minus className="size-3" />
                    </button>
                    {servings}
                    <button
                      type="button"
                      aria-label="More servings"
                      onClick={() => setServings((s) => Math.min(24, s + 1))}
                      className="flex size-5 items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-primary-foreground"
                    >
                      <Plus className="size-3" />
                    </button>
                  </dd>
                </div>
              </div>
              <Stat
                icon={UtensilsCrossed}
                label="Ingredients"
                value={`${ingredients.length}`}
              />
            </dl>
          </div>
        </section>

        {/* Ingredient list */}
        <aside
          aria-label="Ingredients"
          className="flex min-h-0 shrink-0 flex-col xl:w-[20rem] 2xl:w-[23rem]"
        >
          <AddIngredient foods={foods} onAdd={addFood} />
          {catalogStatus && (
            <p role="status" className="mt-2 text-sm">
              {catalogStatus}{" "}
              {catalogStatus.startsWith("Couldn’t") && (
                <button type="button" className="underline" onClick={retry}>
                  Retry
                </button>
              )}
            </p>
          )}
          <p className="mb-3 mt-4 text-sm text-muted-foreground">
            {ingredients.length
              ? `${ingredients.length} ${ingredients.length === 1 ? "ingredient" : "ingredients"}`
              : "No ingredients yet"}
          </p>
          <ul className="flex min-h-0 flex-1 flex-col gap-3 xl:overflow-y-auto xl:pb-2 xl:pr-1">
            {ingredients.map((i) => (
              <li key={i.id}>
                <IngredientCard
                  ingredient={i}
                  onAmountChange={(amount) =>
                    setIngredients((list) =>
                      list.map((item) =>
                        item.id === i.id ? { ...item, amount } : item,
                      ),
                    )
                  }
                  onRemove={() => removeIngredient(i.id)}
                />
              </li>
            ))}
          </ul>
        </aside>

        {/* Nutrition facts */}
        <aside
          aria-label="Estimated nutrition"
          className="flex min-h-0 shrink-0 flex-col xl:w-[19rem] 2xl:w-[21rem]"
        >
          <NutritionPanel
            nutrition={nutrition}
            servings={servings}
            hasIngredients={isSample || ingredients.length > 0}
            showZeros
            isSample={isSample}
          />
        </aside>
      </div>
    </div>
  );
}

// ---- Stage -------------------------------------------------------------------

function Stage({
  title,
  onTitle,
  ingredients,
}: {
  title: string;
  onTitle: (t: string) => void;
  ingredients: Ingredient[];
}) {
  const shown = ingredients.slice(0, spots.length);
  return (
    <div className="relative mb-4 min-h-[20rem] flex-1">
      <input
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder="Name your dish"
        aria-label="Dish name"
        className="relative z-10 w-full max-w-[70%] bg-transparent font-display text-4xl leading-tight tracking-tight outline-none placeholder:text-muted-foreground/60 sm:text-5xl"
      />
      <div className="absolute inset-0 top-14 flex items-center justify-center">
        {/* the "plate": butter blob from the landing hero */}
        <div className="relative aspect-square h-full max-h-[30rem] max-w-full">
          <div
            aria-hidden
            className={cn(
              "absolute inset-[4%] rounded-[58%_42%_47%_53%/45%_52%_48%_55%]",
              BUTTER,
            )}
          />
          {shown.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-[hsl(230_50%_16%)]">
              <span className="text-7xl" aria-hidden>
                🍽️
              </span>
              <p className="mt-3 max-w-[18ch] font-display text-2xl leading-tight">
                Add ingredients and they show up here
              </p>
            </div>
          ) : (
            shown.map((ing, idx) => {
              const spot = spots[idx];
              return (
                <div
                  key={ing.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${spot.left}%`, top: `${spot.top}%` }}
                  title={ing.name}
                >
                  {/* animation on an inner element so it doesn't fight the centering transform */}
                  <div className="duration-300 animate-in fade-in zoom-in-50">
                    <IngredientArt
                      ingredient={ing}
                      sizeRem={spot.size}
                      className="drop-shadow-[0_12px_14px_hsl(230_60%_15%/0.3)]"
                    />
                  </div>
                </div>
              );
            })
          )}
          {ingredients.length > spots.length && (
            <span className="absolute bottom-2 right-2 rounded-full bg-card px-3 py-1 text-xs">
              +{ingredients.length - spots.length} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Ingredient list -----------------------------------------------------------

function IngredientCard({
  ingredient,
  onAmountChange,
  onRemove,
}: {
  ingredient: Ingredient;
  onAmountChange: (amount: string) => void;
  onRemove: () => void;
}) {
  // USDA names look like "Chicken Breast (breast, boneless, skinless, raw)":
  // show the main name large and the details small underneath.
  const match = ingredient.name.match(/^(.*?)\s*\((.*)\)$/);
  const heading = match ? match[1] : ingredient.name;
  const details = match ? match[2] : "";

  return (
    <article className="relative flex min-h-28 overflow-hidden rounded-3xl border border-border bg-card duration-300 animate-in fade-in slide-in-from-right-4">
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4 pr-3">
        <div className="min-w-0">
          <h3
            title={ingredient.name}
            className="break-words font-display text-2xl leading-tight tracking-tight"
          >
            {heading}
          </h3>
          {details && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
              {details}
            </p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            aria-label={`Amount of ${ingredient.name} in ${ingredient.unit || "pieces"}`}
            className="w-16 rounded border border-border bg-background px-2 py-1 text-foreground"
            value={ingredient.amount}
            onChange={(event) => onAmountChange(event.target.value)}
          />
          {ingredient.unit || "pieces"}
        </label>
      </div>
      {/* Picture column: the text never runs under it or the × button */}
      <div className="relative w-24 shrink-0">
        <div
          className={cn(
            "absolute -right-6 top-1/2 flex size-28 -translate-y-1/2 items-center justify-center rounded-full",
            BUTTER,
          )}
        >
          <IngredientArt
            ingredient={ingredient}
            sizeRem={3.5}
            className="-ml-4"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${ingredient.name}`}
        className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-card/90 backdrop-blur transition-colors hover:bg-destructive hover:text-destructive-foreground"
      >
        <X className="size-4" />
      </button>
    </article>
  );
}

function AddIngredient({
  foods,
  onAdd,
}: {
  foods: FoundationFood[];
  onAdd: (
    food: FoundationFood,
    parsed: { amount: string; unit: string },
  ) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const options = ingredientOptions(value, foods);
  function submit(text: string, option?: { food: FoundationFood }) {
    const parsed = parseIngredient(text);
    const food = option?.food ?? (parsed && exactFood(foods, parsed.name));
    if (!parsed || !food) {
      setError(
        options.length
          ? "Choose a USDA food from the suggestions."
          : "No matching USDA food. Try another ingredient.",
      );
      return;
    }
    onAdd(food, parsed);
    setValue("");
    setError("");
  }

  return (
    <Combobox
      value={value}
      onChange={(v) => {
        setValue(v);
        setError("");
      }}
      onSubmit={submit}
      options={options}
      renderIcon={(o) => (
        <span className="text-lg leading-none" aria-hidden>
          {o.emoji}
        </span>
      )}
      placeholder="Add an ingredient, e.g. 200g chicken"
      label="Add an ingredient"
      leading={<Plus className="size-4 text-primary" />}
      error={error}
      listPosition="below"
    />
  );
}
