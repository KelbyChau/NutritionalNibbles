"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Dumbbell, Flame, LayoutGrid, Minus, Plus, UtensilsCrossed, WandSparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/save-button";
import { ThemeSwitcher } from "@/components/theme-switcher";

import { calculateNutrition } from "@/lib/nutrition";
import { saveMyRecipe } from "@/lib/my-recipes";
import { createClient } from "@/lib/supabase/client";
import { type UsdaFood } from "@/lib/foundation-foods";

import { Stat, AnimatedNumber, fmtCount, type Ingredient } from "./shared";

import { NutritionPanel, fmtNutrient, formatCalories } from "./nutrition-panel";
import { ingredientWithFood, makeIngredient, useUsdaFoods } from "./ingredients";
import { clearDraft, loadDraft, saveDraft } from "./draft";
import { RecipeImport, type ImportedRecipe } from "./recipe-import";
import { Stage } from "./builder/stage";
import { AddIngredient, IngredientCard } from "./builder/ingredient-list";


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

// Next keeps visited pages alive (cacheComponents + <Activity>), so without
// this a fresh visit would show the last recipe. Keying on bfcacheId starts a
// new page on every link/push, while the Back button still restores it.
export function RecipeBuilder() {
  const { bfcacheId } = useRouter();
  return <RecipeBuilderPage key={bfcacheId} />;
}

function RecipeBuilderPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [servings, setServings] = useState(2);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const nextId = useRef(1);
  const { foods, status: catalogStatus, retry } = useUsdaFoods();

  // Opened from the dashboard (/optimize?recipe=<id>): load that recipe once
  // the USDA catalog is ready, since ingredients are stored by fdc_id.
  // undefined until the URL has been read on the client.
  const [recipeId, setRecipeId] = useState<string | null | undefined>();
  const [recipeStatus, setRecipeStatus] = useState("");
  // Id of this recipe in the user's saved recipes, once it has been saved.
  const [savedId, setSavedId] = useState<string | null>(null);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("recipe");
    setRecipeId(id);
    if (id) setRecipeStatus("Loading recipe…");
  }, []);
  useEffect(() => {
    if (!recipeId || !foods.length) return;
    let current = true;
    async function load() {
      const supabase = createClient();
      const [{ data, error }, { data: session }] = await Promise.all([
        supabase
          .from("recipes")
          .select("title, servings, ingredients, owner_id")
          .eq("id", recipeId!)
          .maybeSingle(),
        supabase.auth.getSession(),
      ]);
      if (!current) return;
      if (error || !data) {
        setRecipeStatus("Couldn’t load that recipe.");
        return;
      }
      const byId = new Map(foods.map((f) => [f.fdc_id, f]));
      const items = Array.isArray(data.ingredients) ? data.ingredients : [];
      const list: Ingredient[] = [];
      let id = 1;
      for (const item of items as {
        fdc_id?: number;
        amount?: number | string;
        unit?: string;
      }[]) {
        const food = item.fdc_id ? byId.get(Number(item.fdc_id)) : undefined;
        if (!food) continue;
        list.push(
          makeIngredient(
            food,
            {
              // Saved recipes keep amounts as typed ("1/2"); the database stores grams.
              amount: item.amount == null ? "" : String(item.amount),
              unit: item.unit ?? "g",
            },
            id++,
          ),
        );
      }
      setTitle(data.title ?? "");
      setServings(Math.max(1, Number(data.servings) || 1));
      setIngredients(list);
      nextId.current = id;
      setRecipeStatus("");
      // The user's own recipe: saving again replaces it instead of adding a copy.
      const userId = session.session?.user.id;
      if (userId && data.owner_id === userId) setSavedId(recipeId!);
    }
    void load();
    return () => {
      current = false;
    };
  }, [recipeId, foods]);

  // A new recipe (plain /optimize, e.g. "Create Recipe") always starts empty.
  // Only coming back from the optimize page (/optimize?draft=1) picks up the
  // recipe where it was left.
  useEffect(() => {
    if (recipeId !== null) return;
    if (!new URLSearchParams(window.location.search).has("draft")) {
      clearDraft();
      return;
    }
    const draft = loadDraft();
    if (!draft) return;
    setTitle(draft.title);
    setServings(draft.servings);
    setIngredients(draft.current);
    setSavedId(draft.savedId ?? null);
    nextId.current = Math.max(0, ...draft.current.map((i) => i.id)) + 1;
  }, [recipeId]);

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
    food: UsdaFood,
    parsed: { amount: string; unit: string },
  ) {
    setIngredients((list) =>
      // Each food appears once; AddIngredient explains why it wasn't added.
      ingredientWithFood(list, food)
        ? list
        : [...list, makeIngredient(food, parsed, nextId.current++)],
    );
  }

  // From the Import dialog, after the user reviewed it: replace the recipe.
  function importRecipe(recipe: ImportedRecipe) {
    let id = 1;
    const list = recipe.ingredients.map((i) => ({
      ...makeIngredient(i.food, i, id++),
      // Keep exactly what was reviewed (makeIngredient would turn a blank amount into 100 g).
      amount: i.amount,
      unit: i.unit,
    }));
    nextId.current = id;
    // An import is a new recipe. Forget any saved recipe that was open, so
    // Save adds the import instead of replacing that recipe, and a refresh
    // doesn't reopen it. A page with no title leaves the name blank to fill in.
    window.history.replaceState(null, "", "/optimize");
    setRecipeId(null);
    setSavedId(null);
    setTitle(recipe.title);
    setNameMissing(false);
    setServings(recipe.servings);
    setIngredients(list);
    setRecipeStatus("");
  }

  function removeIngredient(id: number) {
    setIngredients((list) => list.filter((i) => i.id !== id));
  }

  // Every recipe needs a name: Save and Optimize stop and point at the
  // dish-name field until there is one.
  const [nameMissing, setNameMissing] = useState(false);
  const titleInput = useRef<HTMLInputElement>(null);
  function requireName() {
    if (title.trim()) return true;
    setNameMissing(true);
    titleInput.current?.focus();
    return false;
  }

  function optimize() {
    if (!ingredients.length || !requireName()) return;
    saveDraft({
      title,
      servings,
      original: ingredients,
      current: ingredients,
      savedId,
    });
    // So the browser's Back button returns to this recipe, not a blank one.
    window.history.replaceState(null, "", "/optimize?draft=1");
    router.push("/optimize/chat");
  }

  async function save() {
    if (!requireName()) return false;
    const id = await saveMyRecipe({
      replaceId: savedId,
      title,
      servings,
      ingredients,
    });
    setSavedId(id);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background xl:h-dvh xl:overflow-hidden">
      {/* Top bar */}
      <header className="surface-glass sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3 sm:gap-3 sm:px-6 lg:px-8 xl:static xl:border-0 xl:bg-transparent xl:pt-5 xl:backdrop-blur-none">
        <Link
          href="/"
          aria-label="NutritionalNibbles home"
          className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-primary text-[20px] font-semibold leading-none text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          N
        </Link>
        <h1 className="mr-auto text-[22px] font-semibold tracking-[-0.01em] sm:text-[28px]">
          {recipeId ? "Edit Recipe" : "New Recipe"}
        </h1>
        <SaveButton
          onSave={save}
          disabled={!ingredients.length}
        />
        <Link
          href="/dashboard"
          aria-label="Saved recipes"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[15px] transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <LayoutGrid className="size-4" aria-hidden />
          <span className="hidden sm:inline">Saved recipes</span>
        </Link>
        <RecipeImport
          foods={foods}
          catalogStatus={catalogStatus}
          replacing={ingredients.length}
          onImport={importRecipe}
        />
        <ThemeSwitcher />
        <Button
          onClick={optimize}
          disabled={!ingredients.length}
          title={ingredients.length ? undefined : "Add ingredients first"}
          className="h-11 px-5 disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-100"
        >
          <WandSparkles />
          Optimize
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 px-4 pb-5 pt-4 sm:px-6 lg:px-8 xl:flex-row xl:gap-6">
        {/* Stage + stats */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Stage
            title={title}
            onTitle={(t) => {
              setTitle(t);
              if (t.trim()) setNameMissing(false);
            }}
            ingredients={ingredients}
            nameMissing={nameMissing}
            inputRef={titleInput}
          />

          <div className="surface-paper rounded-panel p-4 sm:px-6">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                icon={Flame}
                tone="text-nutrient-calories bg-nutrient-calories/10"
                label={nutrition.knownCalories.counted > 0 &&
                  nutrition.knownCalories.counted < nutrition.items.length
                  ? "Known calories / serving"
                  : "Calories / serving"}
                number={{
                  value: !ingredients.length ? 0 : nutrition.knownCalories.perServing,
                  format: (n) => (n === null ? "Unavailable" : formatCalories(n)),
                }}
              />
              <Stat
                icon={Dumbbell}
                tone="text-nutrient-protein bg-nutrient-protein/10"
                label={nutrition.known.counted.protein > 0 &&
                  nutrition.known.counted.protein < nutrition.items.length
                  ? "Known protein / serving"
                  : "Protein / serving"}
                number={{
                  value: !ingredients.length
                    ? 0
                    : nutrition.counted
                      ? nutrition.known.perServing.protein
                      : null,
                  format: (n) => (n === null && !nutrition.counted ? "–" : fmtNutrient(n, "g")),
                }}
              />
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <Users className="size-4" />
                </span>
                <div className="flex flex-col-reverse">
                  <dt className="text-[12px] text-muted-foreground">Servings</dt>
                  <dd className="flex w-fit items-center gap-1 rounded-full bg-secondary p-0.5 font-rounded text-[17px] font-semibold tabular-nums">
                    <button
                      type="button"
                      aria-label="Fewer servings"
                      onClick={() => setServings((s) => Math.max(1, s - 1))}
                      className="flex size-7 items-center justify-center rounded-full bg-card shadow-[0_1px_2px_rgb(0_0_0/0.08)] transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="min-w-[1.5ch] text-center"><AnimatedNumber value={servings} format={fmtCount} /></span>
                    <button
                      type="button"
                      aria-label="More servings"
                      onClick={() => setServings((s) => Math.min(24, s + 1))}
                      className="flex size-7 items-center justify-center rounded-full bg-card shadow-[0_1px_2px_rgb(0_0_0/0.08)] transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Plus className="size-3" />
                    </button>
                  </dd>
                </div>
              </div>
              <Stat
                icon={UtensilsCrossed}
                label="Ingredients"
                number={{ value: ingredients.length, format: fmtCount }}
              />
            </dl>
          </div>
        </section>

        {/* Ingredient list */}
        <aside
          aria-label="Ingredients"
          className="flex min-h-0 shrink-0 flex-col xl:w-[20rem] 2xl:w-[23rem]"
        >
          <AddIngredient foods={foods} ingredients={ingredients} onAdd={addFood} />
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
          {recipeStatus && (
            <p role="status" className="mt-2 text-sm">
              {recipeStatus}
            </p>
          )}
          <p className="mb-3 mt-4 text-sm text-muted-foreground">
            {ingredients.length ? (
              <>
                <AnimatedNumber value={ingredients.length} format={fmtCount} />{" "}
                {ingredients.length === 1 ? "ingredient" : "ingredients"}
              </>
            ) : (
              "No ingredients yet"
            )}
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
