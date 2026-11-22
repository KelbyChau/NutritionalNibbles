// The dishes shown on the landing page. Real USDA Foundation values,
// computed with the same nutrition math the app uses, so the numbers a
// visitor sees are the numbers they'd get.

import { calculateNutrition } from "../../lib/nutrition.ts";
import type { UsdaFood } from "../../lib/foundation-foods";
import { nutritionRings, type Ring } from "../../lib/nutrition-rings.ts";

const food = (
  fdc_id: number,
  description: string,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
): UsdaFood => ({
  fdc_id,
  description,
  kcal_per_100g: kcal,
  protein_per_100g: protein,
  carbs_per_100g: carbs,
  fat_per_100g: fat,
});

const chicken = food(2646170, "Chicken, breast, boneless, skinless, raw", 112, 22.5, 0, 1.93);
const asparagus = food(2710823, "Asparagus, green, raw", 23.5, 1.44, 5.1, 0.216);
const pasta = food(2758998, "Pasta, dry, enriched, spaghetti", 371, 15.1, 73.5, 1.85);
const cream = food(2346386, "Cream, heavy", 336, 2.02, 3.8, 35.6);
const yogurt = food(330137, "Yogurt, Greek, plain, nonfat", 61, 10.3, 3.64, 0.37);

type Line = { food: UsdaFood; grams: number };

function rings(lines: Line[], servings: number): Ring[] {
  const n = calculateNutrition(
    lines.map(({ food, grams }) => ({ name: food.description, food, amount: String(grams), unit: "g" })),
    servings,
  );
  return nutritionRings(n.known.perServing, n.known.counted, n.items.length);
}

export const sampleDish = {
  title: "Lemon chicken & asparagus",
  servings: 2,
  lines: [
    { food: chicken, grams: 400 },
    { food: asparagus, grams: 200 },
  ],
};

export const sampleRings = rings(sampleDish.lines, sampleDish.servings);

// Chicken alfredo for 4, with nonfat Greek yogurt in place of heavy cream.
const alfredo = (sauce: UsdaFood): Line[] => [
  { food: chicken, grams: 450 },
  { food: pasta, grams: 340 },
  { food: sauce, grams: 240 },
];
const before = rings(alfredo(cream), 4);
const after = rings(alfredo(yogurt), 4);
const value = (list: Ring[], key: Ring["key"]) => list.find((r) => r.key === key)!.value ?? 0;

export const swapShowcase = {
  title: "Chicken alfredo",
  from: "Heavy cream",
  to: "Greek yogurt",
  before,
  after,
  proteinGain: Math.round(value(after, "protein") - value(before, "protein")),
  fatCut: Math.round(value(before, "fat") - value(after, "fat")),
  calorieCut: Math.round(value(before, "calories") - value(after, "calories")),
};
