"use client";

// The builder's ingredient sidebar: one card per ingredient, and the add box.

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { parseIngredient } from "@/lib/ingredients";
import { exactFood, type FoundationFood } from "@/lib/foundation-foods";
import { cn } from "@/lib/utils";
import { BUTTER, IngredientArt, type Ingredient } from "../shared";
import { Combobox } from "../combobox";
import { alreadyAddedMessage, ingredientOptions, ingredientWithFood } from "../ingredients";

export function IngredientCard({
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

export function AddIngredient({
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
