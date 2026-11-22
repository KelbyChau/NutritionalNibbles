"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Dumbbell,
  Flame,
  LayoutGrid,
  Minus,
  Plus,
  UtensilsCrossed,
  WandSparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/save-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { parseIngredient } from "@/lib/ingredients";
import { calculateNutrition } from "@/lib/nutrition";
import { saveMyRecipe } from "@/lib/my-recipes";
import { createClient } from "@/lib/supabase/client";
import { exactFood, type FoundationFood } from "@/lib/foundation-foods";
import { cn } from "@/lib/utils";
import {
  BUTTER,
  Combobox,
  IngredientArt,
  NutritionPanel,
  Stat,
  AnimatedNumber,
  fmtCount,
  fmtNutrient,
  formatCalories,
  alreadyAddedMessage,
  ingredientOptions,
  ingredientWithFood,
  clearDraft,
  loadDraft,
  makeIngredient,
  saveDraft,
  useUsdaFoods,
  type Ingredient,
} from "./shared";
import { RecipeImport, type ImportedRecipe } from "./recipe-import";

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
    food: FoundationFood,
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
    if (recipe.title) {
      setTitle(recipe.title);
      setNameMissing(false);
    }
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
      <header className="flex flex-wrap items-center gap-3 px-4 pb-2 pt-5 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="NutritionalNibbles home"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-display text-3xl leading-none text-primary-foreground"
        >
          N
        </Link>
        <h1 className="mr-auto font-display text-3xl leading-none tracking-tight sm:text-4xl">
          {recipeId ? "Edit Recipe" : "New Recipe"}
        </h1>
        <SaveButton
          onSave={save}
          disabled={!ingredients.length}
        />
        <Link
          href="/dashboard"
          aria-label="Saved recipes"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm transition-colors hover:border-foreground/40"
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
        <div className="flex h-11 items-center rounded-full border border-border bg-card px-1">
          <ThemeSwitcher />
        </div>
        <Button
          onClick={optimize}
          disabled={!ingredients.length}
          title={ingredients.length ? undefined : "Add ingredients first"}
          className="h-11 rounded-full px-5 shadow-none disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
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

          <div className="surface-paper rounded-3xl bg-card p-4 shadow-[0_24px_48px_-32px_hsl(230_60%_15%/0.45)] sm:px-6">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                icon={Flame}
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
                    <AnimatedNumber value={servings} format={fmtCount} />
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

// ---- Stage -------------------------------------------------------------------

function Stage({
  title,
  onTitle,
  ingredients,
  nameMissing,
  inputRef,
}: {
  title: string;
  onTitle: (t: string) => void;
  ingredients: Ingredient[];
  nameMissing: boolean;
  inputRef: React.Ref<HTMLInputElement>;
}) {
  const shown = ingredients.slice(0, spots.length);
  return (
    <div className="relative mb-4 min-h-[20rem] flex-1">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder="Name your dish"
        aria-label="Dish name"
        aria-required
        aria-invalid={nameMissing || undefined}
        aria-describedby={nameMissing ? "dish-name-error" : undefined}
        className={cn(
          "relative z-10 w-full max-w-[70%] border-b-2 border-transparent bg-transparent font-display text-4xl leading-tight tracking-tight outline-none placeholder:text-muted-foreground/60 sm:text-5xl",
          nameMissing && "border-destructive placeholder:text-destructive/70",
        )}
      />
      {nameMissing && (
        <p
          id="dish-name-error"
          role="alert"
          className="relative z-10 mt-1 text-sm font-medium text-destructive"
        >
          Add a name for your recipe first.
        </p>
      )}
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
          {/* New ingredients pop onto the plate, removed ones shrink away, and
              the rest glide to their new spot (CSS transition on left/top).
              Centering uses motion's x/y so it composes with the scale. */}
          <AnimatePresence initial={false}>
            {shown.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center text-[hsl(230_50%_16%)]"
              >
                <span
                  aria-hidden
                  className="flex size-20 items-center justify-center rounded-full bg-card shadow-[0_12px_24px_-16px_hsl(230_60%_15%/0.5)]"
                >
                  <UtensilsCrossed className="size-9 text-primary" />
                </span>
                <p className="mt-3 max-w-[18ch] font-display text-2xl leading-tight">
                  Add ingredients and they show up here
                </p>
              </motion.div>
            ) : (
              shown.map((ing, idx) => {
                const spot = spots[idx];
                return (
                  <motion.div
                    key={ing.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: 0.9,
                      transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
                    }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className="absolute transition-[left,top] duration-300 ease-out motion-reduce:transition-none"
                    style={{
                      left: `${spot.left}%`,
                      top: `${spot.top}%`,
                      x: "-50%",
                      y: "-50%",
                    }}
                    title={ing.name}
                  >
                    <IngredientArt
                      ingredient={ing}
                      sizeRem={spot.size}
                      className="drop-shadow-[0_12px_14px_hsl(230_60%_15%/0.3)]"
                    />
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
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
  ingredients,
  onAdd,
}: {
  foods: FoundationFood[];
  ingredients: Ingredient[];
  onAdd: (
    food: FoundationFood,
    parsed: { amount: string; unit: string },
  ) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  // Foods already in the recipe aren't suggested.
  const options = ingredientOptions(value, foods, ingredients);
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
    const existing = ingredientWithFood(ingredients, food);
    if (existing) {
      setError(alreadyAddedMessage(existing));
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
      placeholder="Add ingredient, e.g. 200g rice"
      label="Add an ingredient"
      leading={<Plus className="size-4 text-primary" />}
      error={error}
      listPosition="below"
    />
  );
}
