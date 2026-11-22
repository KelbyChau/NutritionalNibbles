"use client";

// The USDA food list for a page, and turning foods into recipe ingredients.

import { useEffect, useState } from "react";
import { lookupIngredient, parseIngredient } from "@/lib/ingredients";
import { createClient } from "@/lib/supabase/client";
import { loadUsdaCatalog } from "@/lib/usda-catalog";
import { foodLabel, foodSuggestions, type FoundationFood } from "@/lib/foundation-foods";
import type { Ingredient } from "./shared";

// Every USDA food the app can use (both catalogs), loaded once per tab;
// see lib/usda-catalog.ts.
export function useUsdaFoods() {
  const [foods, setFoods] = useState<FoundationFood[]>([]);
  const [status, setStatus] = useState("Loading USDA ingredients…");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    loadUsdaCatalog(createClient()).then(
      (list) => {
        if (!current) return;
        setFoods(list);
        setStatus("");
      },
      () => {
        if (current) setStatus("Couldn’t load USDA ingredients.");
      },
    );
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

/** The recipe's ingredient with this food, if it's already in the recipe. */
export function ingredientWithFood(ingredients: Ingredient[], food: FoundationFood) {
  return ingredients.find((i) => i.food.fdc_id === food.fdc_id);
}

/** Message for adding a food that's already in the recipe. */
export function alreadyAddedMessage(ingredient: Ingredient) {
  return `${ingredient.name} is already in the recipe. Change its amount instead of adding it again.`;
}

/** Suggestions for the typed ingredient, leaving out foods already in the recipe. */
export function ingredientOptions(
  text: string,
  foods: FoundationFood[],
  inRecipe: Ingredient[] = [],
) {
  const parsed = parseIngredient(text);
  if (!parsed) return [];
  const used = new Set(inRecipe.map((i) => i.food.fdc_id));
  return foodSuggestions(foods, parsed.name, used).map((food) => ({
    food,
    text: [parsed.amount, parsed.unit, foodLabel(food.description)]
      .filter(Boolean)
      .join(" "),
    emoji: lookupIngredient(foodLabel(food.description)).emoji,
  }));
}
