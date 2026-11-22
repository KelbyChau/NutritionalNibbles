"use client";

// "Import" button in the recipe builder header: paste a recipe link, we read
// the recipe from that page (/api/recipe-import), match each ingredient line
// to a USDA food, and show a review step where the user can fix anything
// before the title, servings and ingredients are filled into the builder.

import { useRef, useState, type FormEvent } from "react";
import {
  Check,
  ExternalLink,
  Import,
  Link2,
  LoaderCircle,
  Minus,
  Plus,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { foodLabel, foodSuggestions, type UsdaFood } from "@/lib/foundation-foods";
import { lookupIngredient } from "@/lib/ingredients";
import { calculateNutrition } from "@/lib/nutrition";
import { combineDuplicates, matchFood, parseLine, type FoodMatch } from "@/lib/recipe-url/ingredient-lines";
import type { ScrapedRecipe } from "@/lib/recipe-url/extract";
import { cn } from "@/lib/utils";
import { formatCalories } from "./nutrition-panel";
import { IngredientArt } from "./shared";

export type ImportedRecipe = {
  title: string;
  servings: number;
  ingredients: { food: UsdaFood; amount: string; unit: string }[];
};

type Row = {
  key: number;
  raw: string;
  include: boolean;
  food: UsdaFood | null;
  confidence: FoodMatch["confidence"] | "picked";
  matchNote?: string;
  amount: string;
  unit: string;
  note?: string;
};

const MAX_SERVINGS = 24; // same cap as the builder's servings stepper
const UNITS = ["g", "kg", "oz", "lb", "ml", "l", "cup", "tbsp", "tsp", "pinch", "clove", "slice", "can", ""];
const field =
  "h-9 rounded-lg bg-secondary px-3 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

function buildRows(recipe: ScrapedRecipe, foods: UsdaFood[]): Row[] {
  return recipe.ingredients.map((raw, key) => {
    const line = parseLine(raw);
    const match = matchFood(line.name, foods);
    const notes = [line.note];
    if (!line.amount) notes.push("No amount given, so it’s left out unless you add one");
    return {
      key,
      raw,
      food: match.food,
      confidence: match.confidence,
      matchNote: match.note,
      amount: line.amount,
      unit: line.unit,
      include: !!match.food && !!line.amount,
      note: notes.filter(Boolean).join(" · ") || undefined,
    };
  });
}

export function RecipeImport({
  foods,
  catalogStatus,
  replacing,
  onImport,
}: {
  foods: UsdaFood[];
  catalogStatus: string; // "" once the USDA catalog has loaded
  replacing: number; // ingredients already in the builder
  onImport: (recipe: ImportedRecipe) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recipe, setRecipe] = useState<ScrapedRecipe | null>(null);
  const [title, setTitle] = useState("");
  const [servings, setServings] = useState(4);
  const [rows, setRows] = useState<Row[]>([]);

  function open() {
    setError("");
    dialog.current?.showModal();
  }

  function close() {
    request.current?.abort();
    setLoading(false);
    dialog.current?.close();
  }

  function startOver() {
    setRecipe(null);
    setRows([]);
    setError("");
  }

  async function find(e: FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;
    if (!foods.length) {
      setError(catalogStatus || "USDA ingredients are still loading. Try again in a moment.");
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/recipe-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => ({}))) as { recipe?: ScrapedRecipe; error?: string };
      if (!res.ok || !data.recipe) throw new Error(data.error || "Couldn’t import that recipe.");
      setRecipe(data.recipe);
      setTitle(data.recipe.title);
      setServings(Math.min(MAX_SERVINGS, Math.max(1, data.recipe.servings ?? 4)));
      setRows(buildRows(data.recipe, foods));
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Couldn’t import that recipe.");
    } finally {
      if (request.current === controller) setLoading(false);
    }
  }

  function updateRow(key: number, change: Partial<Row>) {
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...change } : r)));
  }

  const included = rows.filter((r) => r.include && r.food);
  const { ingredients: toAdd, combined } = combineDuplicates(included, (line) =>
    calculateNutrition([{ name: line.food.description, ...line }], 1).items[0].grams);
  const nutrition = calculateNutrition(
    toAdd.map((i) => ({ name: foodLabel(i.food.description), ...i })),
    servings,
  );
  const unmatched = rows.filter((r) => !r.food).length;
  const toCheck = rows.filter((r) => r.include && r.confidence === "check").length;

  function confirm() {
    onImport({
      title: title.trim(),
      servings,
      ingredients: toAdd,
    });
    close();
    startOver();
    setUrl("");
  }

  return (
    <>
      <button
        type="button"
        aria-label="Import a recipe"
        onClick={open}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[15px] transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Import className="size-4" aria-hidden />
        <span className="hidden sm:inline">Import</span>
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="recipe-import-title"
        onClose={() => request.current?.abort()}
        className="m-auto w-[min(48rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-panel border-0 bg-card p-0 text-foreground shadow-lift backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <div className="flex max-h-[min(90dvh,52rem)] flex-col">
          <header className="flex items-start gap-3 border-b border-border/70 px-6 pb-4 pt-6 sm:px-7">
            <div className="mr-auto min-w-0">
              <h2 id="recipe-import-title" className="text-[28px] font-semibold leading-tight tracking-[-0.015em]">
                {recipe ? "Review import" : "Import a recipe"}
              </h2>
              <p className="mt-1 text-[15px] text-muted-foreground">
                {recipe
                  ? "Check the matches and amounts. Only ticked ingredients are added."
                  : "Paste a link to a recipe page. We’ll read its ingredients and servings."}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </button>
          </header>

          {!recipe ? (
            <form onSubmit={find} className="flex flex-col gap-3 px-6 py-6 sm:px-7">
              <label className="text-[15px] font-medium" htmlFor="recipe-import-url">
                Recipe link
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full bg-secondary pl-4 pr-2 focus-within:ring-2 focus-within:ring-ring">
                  <Link2 className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    id="recipe-import-url"
                    // Plain text, not type="url": the browser would refuse links without
                    // "https://", which /api/recipe-import accepts.
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    autoFocus
                    required
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setError("");
                    }}
                    placeholder="https://www.example.com/creamy-chicken-pasta"
                    aria-invalid={!!error}
                    aria-describedby="recipe-import-help"
                    className="h-full min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <Button type="submit" size="lg" disabled={loading || !url.trim()}>
                  {loading ? <LoaderCircle className="animate-spin" /> : <Search />}
                  {loading ? "Reading page…" : "Find recipe"}
                </Button>
              </div>
              <p id="recipe-import-help" role={error ? "alert" : "status"} className={cn("text-[13px]", error ? "text-destructive" : "text-muted-foreground")}>
                {error ||
                  "Works with most recipe sites (they publish recipe data for search engines). Some sites block imports."}
              </p>
            </form>
          ) : (
            <>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5 sm:px-7">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">
                    Title
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={cn(field, "h-11 text-[19px] font-semibold")}
                      placeholder="Name your dish"
                    />
                  </label>
                  <div className="flex flex-col gap-1 text-[12px] text-muted-foreground">
                    <span id="recipe-import-servings">Servings</span>
                    <div
                      role="group"
                      aria-labelledby="recipe-import-servings"
                      className="flex h-11 items-center gap-2 rounded-full bg-secondary px-1 font-rounded text-[17px] font-semibold tabular-nums text-foreground"
                    >
                      <button
                        type="button"
                        aria-label="Fewer servings"
                        onClick={() => setServings((s) => Math.max(1, s - 1))}
                        className="flex size-8 items-center justify-center rounded-full bg-card shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-6 text-center">{servings}</span>
                      <button
                        type="button"
                        aria-label="More servings"
                        onClick={() => setServings((s) => Math.min(MAX_SERVINGS, s + 1))}
                        className="flex size-8 items-center justify-center rounded-full bg-card shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-primary hover:underline hover:underline-offset-4"
                  >
                    {new URL(recipe.sourceUrl).hostname.replace(/^www\./, "")}
                    <ExternalLink className="size-3" />
                  </a>
                  {recipe.servings === null && <span>The page doesn’t list servings, so check this.</span>}
                  {recipe.servings !== null && recipe.servings > MAX_SERVINGS && (
                    <span>The page says {recipe.servings} servings; the builder goes up to {MAX_SERVINGS}.</span>
                  )}
                </p>

                <ul className="mt-4 flex flex-col gap-2.5">
                  {rows.map((row) => (
                    <ReviewRow key={row.key} row={row} foods={foods} servings={servings} onChange={(c) => updateRow(row.key, c)} />
                  ))}
                </ul>
              </div>

              <footer className="surface-glass flex flex-col gap-3 border-t border-border/70 px-6 py-4 sm:flex-row sm:items-center sm:px-7">
                <div className="mr-auto text-[15px]">
                  <p className="font-medium">
                    {toAdd.length} {toAdd.length === 1 ? "ingredient" : "ingredients"} will be added
                    {included.length > 0 && (
                      <span className="font-normal text-muted-foreground">
                        {" · "}
                        {nutrition.knownCalories.perServing === null
                          ? "Calories unavailable"
                          : `≈ ${formatCalories(nutrition.knownCalories.perServing)} per serving`}
                        {nutrition.knownCalories.counted > 0 && nutrition.knownCalories.counted < toAdd.length &&
                          ` (subtotal for ${nutrition.knownCalories.counted} of ${toAdd.length} ingredients)`}
                      </span>
                    )}
                  </p>
                  {combined > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {combined === 1
                        ? "2 lines are the same food, so they’re combined into one ingredient."
                        : `${combined} repeated lines are combined with the same food.`}
                    </p>
                  )}
                  {replacing > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Replaces the {replacing} {replacing === 1 ? "ingredient" : "ingredients"} already in the builder.
                    </p>
                  )}
                  {(unmatched > 0 || toCheck > 0) && (
                    <p className="text-xs text-muted-foreground">
                      {[
                        toCheck && `${toCheck} ${toCheck === 1 ? "match" : "matches"} to check`,
                        unmatched && `${unmatched} without a USDA match`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={startOver} className="h-11">
                    Different link
                  </Button>
                  <Button type="button" onClick={confirm} disabled={!included.length} className="h-11">
                    <Check />
                    {replacing ? "Replace recipe" : "Add to recipe"}
                  </Button>
                </div>
              </footer>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

function ReviewRow({
  row,
  foods,
  servings,
  onChange,
}: {
  row: Row;
  foods: UsdaFood[];
  servings: number;
  onChange: (change: Partial<Row>) => void;
}) {
  const [search, setSearch] = useState<string | null>(null);
  const results = search === null ? [] : foodSuggestions(foods, search);
  const line = row.food
    ? calculateNutrition([{ name: row.raw, food: row.food, amount: row.amount, unit: row.unit }], servings).items[0]
    : null;
  const units = UNITS.includes(row.unit) ? UNITS : [row.unit, ...UNITS];
  const foodName = row.food ? foodLabel(row.food.description) : null;

  return (
    <li
      className={cn(
        "rounded-card p-4 transition-opacity",
        row.include ? "bg-secondary/70" : "bg-transparent opacity-60 ring-1 ring-border",
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={row.include}
          disabled={!row.food}
          onChange={(e) => onChange({ include: e.target.checked })}
          aria-label={`Include “${row.raw}”`}
          className="mt-1 size-4 shrink-0 accent-[hsl(var(--primary))]"
        />
        <div className="min-w-0 flex-1">
          <p className="break-words text-[15px] font-medium">{row.raw}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {foodName && (
              <span aria-hidden>
                <IngredientArt ingredient={lookupIngredient(foodName)} sizeRem={1.5} />
              </span>
            )}
            <span className={cn("min-w-0 truncate text-[15px]", !row.food && "text-muted-foreground")}>
              {foodName ?? "No USDA match"}
            </span>
            <MatchBadge confidence={row.confidence} />
            {foods.length > 0 && (
              <button
                type="button"
                aria-expanded={search !== null}
                onClick={() => setSearch(search === null ? parseLine(row.raw).name : null)}
                className="text-[13px] font-medium text-primary hover:underline hover:underline-offset-4"
              >
                {search === null ? (row.food ? "Change" : "Find a match") : "Cancel"}
              </button>
            )}
          </div>

          {search !== null && (
            <div className="mt-2 rounded-card bg-card p-2 shadow-panel">
              <label className="flex items-center gap-2 px-1">
                <Search className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="sr-only">Search USDA foods</span>
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault(); // close the search, not the dialog
                      setSearch(null);
                    }
                  }}
                  placeholder="Search USDA foods, e.g. cheddar"
                  className="h-8 min-w-0 flex-1 bg-transparent text-[15px] outline-none"
                />
              </label>
              <ul className="mt-1">
                {results.map((food) => (
                  <li key={food.fdc_id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange({ food, confidence: "picked", include: true });
                        setSearch(null);
                      }}
                      className="w-full rounded-xl px-2 py-1.5 text-left text-[15px] hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
                    >
                      {foodLabel(food.description)}
                    </button>
                  </li>
                ))}
              </ul>
              {!results.length && (
                <p className="px-2 py-1 text-xs text-muted-foreground">No foods match. Try one word, like “cheese”.</p>
              )}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <input
              value={row.amount}
              onChange={(e) => onChange({ amount: e.target.value })}
              aria-label={`Amount for “${row.raw}”`}
              placeholder="Amount"
              className={cn(field, "w-20")}
            />
            <select
              value={row.unit}
              onChange={(e) => onChange({ unit: e.target.value })}
              aria-label={`Unit for “${row.raw}”`}
              className={cn(field, "pr-2")}
            >
              {units.map((u) => (
                <option key={u} value={u}>
                  {u || "pieces"}
                </option>
              ))}
            </select>
            {line && row.include && (
              <span className={cn(line.issue ? "text-destructive" : "text-muted-foreground")}>
                {line.issue ?? `≈ ${Math.round(line.grams ?? 0)} g · ${formatCalories(line.nutrients?.kcal ?? null)}`}
              </span>
            )}
          </div>
          {row.note && <p className="mt-1.5 text-xs text-muted-foreground">{row.note}</p>}
          {row.confidence === "check" && row.matchNote && (
            <p className="mt-1.5 text-xs text-muted-foreground">{row.matchNote}</p>
          )}
        </div>
      </div>
    </li>
  );
}

function MatchBadge({ confidence }: { confidence: Row["confidence"] }) {
  if (confidence === "none") return null;
  const check = confidence === "check";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium",
        check
          ? "bg-nutrient-carbs/15 text-foreground"
          : confidence === "picked"
            ? "bg-primary/10 text-primary"
            : "bg-card text-muted-foreground",
      )}
    >
      {check ? <TriangleAlert className="size-3" /> : <Check className="size-3" />}
      {check ? "Check match" : confidence === "picked" ? "Your pick" : "Matched"}
    </span>
  );
}
