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
import { foodLabel, foodSuggestions, type FoundationFood } from "@/lib/foundation-foods";
import { lookupIngredient } from "@/lib/ingredients";
import { calculateNutrition } from "@/lib/nutrition";
import { matchFood, parseLine, type FoodMatch } from "@/lib/recipe-url/ingredient-lines";
import type { ScrapedRecipe } from "@/lib/recipe-url/extract";
import { cn } from "@/lib/utils";
import { formatCalories, IngredientArt } from "./shared";

export type ImportedRecipe = {
  title: string;
  servings: number;
  ingredients: { food: FoundationFood; amount: string; unit: string }[];
};

type Row = {
  key: number;
  raw: string;
  include: boolean;
  food: FoundationFood | null;
  confidence: FoodMatch["confidence"] | "picked";
  matchNote?: string;
  amount: string;
  unit: string;
  note?: string;
};

const MAX_SERVINGS = 24; // same cap as the builder's servings stepper
const UNITS = ["g", "kg", "oz", "lb", "ml", "l", "cup", "tbsp", "tsp", "pinch", "clove", "slice", "can", ""];
const field =
  "h-9 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary";

function buildRows(recipe: ScrapedRecipe, foods: FoundationFood[]): Row[] {
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
  foods: FoundationFood[];
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
  const nutrition = calculateNutrition(
    included.map((r) => ({ name: foodLabel(r.food!.description), food: r.food!, amount: r.amount, unit: r.unit })),
    servings,
  );
  const unmatched = rows.filter((r) => !r.food).length;
  const toCheck = rows.filter((r) => r.include && r.confidence === "check").length;

  function confirm() {
    onImport({
      title: title.trim(),
      servings,
      ingredients: included.map((r) => ({ food: r.food!, amount: r.amount, unit: r.unit })),
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
        className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm transition-colors hover:border-foreground/40"
      >
        <Import className="size-4" aria-hidden />
        <span className="hidden sm:inline">Import</span>
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="recipe-import-title"
        onClose={() => request.current?.abort()}
        className="surface-paper m-auto w-[min(48rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-3xl border border-border bg-card p-0 text-foreground shadow-[0_24px_48px_-24px_hsl(230_60%_15%/0.45)] backdrop:bg-[hsl(230_50%_10%/0.45)] backdrop:backdrop-blur-sm"
      >
        <div className="flex max-h-[min(90dvh,52rem)] flex-col">
          <header className="flex items-start gap-3 border-b border-border px-5 pb-4 pt-5 sm:px-6">
            <div className="mr-auto min-w-0">
              <h2 id="recipe-import-title" className="font-display text-3xl leading-none tracking-tight">
                {recipe ? "Review import" : "Import a recipe"}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {recipe
                  ? "Check the matches and amounts. Only ticked ingredients are added."
                  : "Paste a link to a recipe page. We’ll read its ingredients and servings."}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted transition-colors hover:bg-foreground hover:text-background"
            >
              <X className="size-4" />
            </button>
          </header>

          {!recipe ? (
            <form onSubmit={find} className="flex flex-col gap-3 px-5 py-5 sm:px-6">
              <label className="text-sm font-medium" htmlFor="recipe-import-url">
                Recipe link
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-background pl-4 pr-2 focus-within:border-primary">
                  <Link2 className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    id="recipe-import-url"
                    type="url"
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
                    className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <Button type="submit" disabled={loading || !url.trim()} className="h-12 rounded-full px-6 shadow-none">
                  {loading ? <LoaderCircle className="animate-spin" /> : <Search />}
                  {loading ? "Reading page…" : "Find recipe"}
                </Button>
              </div>
              <p id="recipe-import-help" role={error ? "alert" : "status"} className={cn("text-sm", error ? "text-destructive" : "text-muted-foreground")}>
                {error ||
                  "Works with most recipe sites (they publish recipe data for search engines). Some sites block imports."}
              </p>
            </form>
          ) : (
            <>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4 sm:px-6">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Title
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={cn(field, "h-11 font-display text-xl")}
                      placeholder="Name your dish"
                    />
                  </label>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span id="recipe-import-servings">Servings</span>
                    <div
                      role="group"
                      aria-labelledby="recipe-import-servings"
                      className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-2 text-base font-semibold tabular-nums text-foreground"
                    >
                      <button
                        type="button"
                        aria-label="Fewer servings"
                        onClick={() => setServings((s) => Math.max(1, s - 1))}
                        className="flex size-7 items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-primary-foreground"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-6 text-center">{servings}</span>
                      <button
                        type="button"
                        aria-label="More servings"
                        onClick={() => setServings((s) => Math.min(MAX_SERVINGS, s + 1))}
                        className="flex size-7 items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-primary-foreground"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
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

              <footer className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                <div className="mr-auto text-sm">
                  <p className="font-medium">
                    {included.length} of {rows.length} ingredients will be added
                    {included.length > 0 && (
                      <span className="font-normal text-muted-foreground">
                        {" · "}
                        {nutrition.knownCalories.perServing === null
                          ? "Calories unavailable"
                          : `≈ ${formatCalories(nutrition.knownCalories.perServing)} per serving`}
                        {nutrition.knownCalories.counted > 0 && nutrition.knownCalories.counted < included.length &&
                          ` (subtotal for ${nutrition.knownCalories.counted} of ${included.length} ingredients)`}
                      </span>
                    )}
                  </p>
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
                  <Button type="button" variant="outline" onClick={startOver} className="h-11 rounded-full px-5 shadow-none">
                    Different link
                  </Button>
                  <Button type="button" onClick={confirm} disabled={!included.length} className="h-11 rounded-full px-5 shadow-none">
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
  foods: FoundationFood[];
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
        "rounded-2xl border border-border p-3 transition-opacity",
        row.include ? "bg-background/60" : "bg-transparent opacity-70",
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
          <p className="break-words text-sm font-medium">{row.raw}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {foodName && (
              <span aria-hidden>
                <IngredientArt ingredient={lookupIngredient(foodName)} sizeRem={1.5} />
              </span>
            )}
            <span className={cn("min-w-0 truncate text-sm", !row.food && "text-muted-foreground")}>
              {foodName ?? "No USDA match"}
            </span>
            <MatchBadge confidence={row.confidence} />
            {foods.length > 0 && (
              <button
                type="button"
                aria-expanded={search !== null}
                onClick={() => setSearch(search === null ? parseLine(row.raw).name : null)}
                className="text-xs text-primary underline underline-offset-4"
              >
                {search === null ? (row.food ? "Change" : "Find a match") : "Cancel"}
              </button>
            )}
          </div>

          {search !== null && (
            <div className="mt-2 rounded-2xl border border-border bg-card p-2">
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
                  className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none"
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
                      className="w-full rounded-xl px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
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
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        check ? "bg-[hsl(45_84%_72%)] text-[hsl(230_50%_16%)]" : "bg-muted text-muted-foreground",
      )}
    >
      {check ? <TriangleAlert className="size-3" /> : <Check className="size-3" />}
      {check ? "Check match" : confidence === "picked" ? "Your pick" : "Matched"}
    </span>
  );
}
