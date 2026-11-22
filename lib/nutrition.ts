import type { FoundationFood } from "./foundation-foods";

// Nutrition estimates for the recipe builder.
//
// Legacy sample values are per 100 g, approximated from USDA FoodData Central (SR Legacy)
// reference foods. They are estimates for a hackathon demo: double-check
// anything important against https://fdc.nal.usda.gov/ and replace this
// table with a real lookup when there is time.
//
// Assumptions worth knowing: pasta, rice and oats are DRY weights; beans,
// chickpeas and lentils are COOKED/drained; meat and fish are RAW.

export type Nutrients = Record<
  "kcal" | "protein" | "carbs" | "fat" | "satFat" | "fiber" | "sugar" | "sodium" | "cholesterol",
  number | null
>;

type Food = {
  per100: [
    kcal: number,
    protein: number,
    carbs: number,
    fat: number,
    satFat: number,
    fiber: number,
    sugar: number,
    sodium: number,
    cholesterol: number,
  ];
  cup?: number; // grams in 1 cup
  piece?: number; // grams in one item (an egg, a clove, a slice, a can…)
  note?: string;
};

const foods: Record<string, Food> = {
  "chicken breast": {
    per100: [120, 22.5, 0, 2.6, 0.6, 0, 0, 45, 73],
    piece: 174,
    cup: 140,
    note: "raw, skinless",
  },
  "chicken thigh": {
    per100: [121, 19.7, 0, 4.1, 1.0, 0, 0, 84, 94],
    piece: 109,
    note: "raw, skinless",
  },
  "beef steak": {
    per100: [180, 20.0, 0, 10.5, 4.2, 0, 0, 55, 60],
    piece: 225,
    note: "raw sirloin",
  },
  "ground beef": {
    per100: [254, 17.2, 0, 20.0, 7.6, 0, 0, 66, 71],
    cup: 225,
    note: "80/20, raw",
  },
  "ground turkey": {
    per100: [148, 19.7, 0, 7.7, 2.0, 0, 0, 69, 74],
    cup: 225,
    note: "raw",
  },
  salmon: {
    per100: [208, 20.4, 0, 13.4, 3.1, 0, 0, 59, 55],
    piece: 170,
    note: "raw",
  },
  shrimp: {
    per100: [85, 20.1, 0, 0.5, 0.1, 0, 0, 119, 152],
    piece: 7,
    cup: 145,
    note: "raw",
  },
  tofu: {
    per100: [144, 17.3, 2.8, 8.7, 1.3, 2.3, 0.6, 14, 0],
    cup: 252,
    piece: 400,
    note: "firm",
  },
  eggs: {
    per100: [143, 12.6, 0.7, 9.5, 3.1, 0, 0.4, 142, 372],
    piece: 50,
    cup: 243,
  },
  "egg whites": {
    per100: [52, 10.9, 0.7, 0.2, 0, 0, 0.7, 166, 0],
    piece: 33,
    cup: 243,
  },
  "greek yogurt": {
    per100: [59, 10.2, 3.6, 0.4, 0.1, 0, 3.2, 36, 5],
    cup: 245,
    note: "plain, nonfat",
  },
  milk: {
    per100: [61, 3.2, 4.8, 3.3, 1.9, 0, 5.1, 43, 10],
    cup: 244,
    note: "whole",
  },
  "heavy cream": {
    per100: [340, 2.8, 2.7, 36.0, 23.0, 0, 2.9, 27, 113],
    cup: 238,
  },
  butter: {
    per100: [717, 0.9, 0.1, 81.1, 51.4, 0, 0.1, 643, 215],
    cup: 227,
    piece: 113,
    note: "salted",
  },
  "olive oil": { per100: [884, 0, 0, 100, 13.8, 0, 0, 2, 0], cup: 216 },
  "cheddar cheese": {
    per100: [403, 24.9, 1.3, 33.1, 21.1, 0, 0.5, 621, 105],
    cup: 113,
    piece: 28,
  },
  parmesan: {
    per100: [392, 35.8, 3.2, 25.8, 16.4, 0, 0.8, 1376, 68],
    cup: 100,
  },
  mozzarella: {
    per100: [300, 22.2, 2.2, 22.4, 13.2, 0, 1.0, 627, 79],
    cup: 112,
    piece: 28,
  },
  "cottage cheese": {
    per100: [84, 11.0, 4.3, 2.3, 1.2, 0, 4.0, 321, 12],
    cup: 226,
    note: "2%",
  },
  pasta: {
    per100: [371, 13.0, 74.7, 1.5, 0.3, 3.2, 2.7, 6, 0],
    cup: 100,
    note: "dry",
  },
  rice: {
    per100: [365, 7.1, 80.0, 0.7, 0.2, 1.3, 0.1, 5, 0],
    cup: 185,
    note: "white, uncooked",
  },
  "cauliflower rice": {
    per100: [25, 1.9, 5.0, 0.3, 0.1, 2.0, 1.9, 30, 0],
    cup: 107,
  },
  bread: {
    per100: [266, 7.6, 50.6, 3.3, 0.7, 2.4, 4.3, 490, 0],
    piece: 28,
    note: "white, per slice ≈ 28 g",
  },
  tortillas: {
    per100: [304, 8.0, 50.0, 7.8, 2.9, 3.5, 3.2, 680, 0],
    piece: 45,
    note: "flour",
  },
  flour: {
    per100: [364, 10.3, 76.3, 1.0, 0.2, 2.7, 0.3, 2, 0],
    cup: 125,
    note: "all-purpose",
  },
  oats: {
    per100: [379, 13.2, 67.7, 6.5, 1.1, 10.1, 1.0, 6, 0],
    cup: 81,
    note: "rolled, dry",
  },
  sugar: { per100: [387, 0, 100, 0, 0, 0, 100, 1, 0], cup: 200 },
  honey: { per100: [304, 0.3, 82.4, 0, 0, 0.2, 82.1, 4, 0], cup: 339 },
  potatoes: {
    per100: [77, 2.0, 17.5, 0.1, 0, 2.1, 0.8, 6, 0],
    piece: 213,
    cup: 150,
  },
  "sweet potatoes": {
    per100: [86, 1.6, 20.1, 0.1, 0, 3.0, 4.2, 55, 0],
    piece: 130,
    cup: 133,
  },
  broccoli: {
    per100: [34, 2.8, 6.6, 0.4, 0, 2.6, 1.7, 33, 0],
    cup: 91,
    piece: 150,
  },
  spinach: { per100: [23, 2.9, 3.6, 0.4, 0.1, 2.2, 0.4, 79, 0], cup: 30 },
  lettuce: {
    per100: [17, 1.2, 3.3, 0.3, 0, 2.1, 1.2, 8, 0],
    cup: 47,
    piece: 626,
  },
  tomatoes: {
    per100: [18, 0.9, 3.9, 0.2, 0, 1.2, 2.6, 5, 0],
    piece: 123,
    cup: 180,
  },
  onion: {
    per100: [40, 1.1, 9.3, 0.1, 0, 1.7, 4.2, 4, 0],
    piece: 110,
    cup: 160,
  },
  garlic: {
    per100: [149, 6.4, 33.1, 0.5, 0.1, 2.1, 1.0, 17, 0],
    piece: 3,
    cup: 136,
    note: "1 clove ≈ 3 g",
  },
  "bell pepper": {
    per100: [31, 1.0, 6.0, 0.3, 0, 2.1, 4.2, 4, 0],
    piece: 119,
    cup: 149,
  },
  carrots: {
    per100: [41, 0.9, 9.6, 0.2, 0, 2.8, 4.7, 69, 0],
    piece: 61,
    cup: 128,
  },
  mushrooms: {
    per100: [22, 3.1, 3.3, 0.3, 0, 1.0, 2.0, 5, 0],
    piece: 18,
    cup: 70,
  },
  avocado: {
    per100: [160, 2.0, 8.5, 14.7, 2.1, 6.7, 0.7, 7, 0],
    piece: 150,
    cup: 150,
  },
  corn: {
    per100: [86, 3.3, 19.0, 1.4, 0.3, 2.7, 6.3, 15, 0],
    piece: 90,
    cup: 145,
  },
  "black beans": {
    per100: [132, 8.9, 23.7, 0.5, 0.1, 8.7, 0.3, 1, 0],
    cup: 172,
    piece: 255,
    note: "cooked; 1 can ≈ 255 g drained",
  },
  chickpeas: {
    per100: [164, 8.9, 27.4, 2.6, 0.3, 7.6, 4.8, 7, 0],
    cup: 164,
    piece: 255,
    note: "cooked; 1 can ≈ 255 g drained",
  },
  lentils: {
    per100: [116, 9.0, 20.1, 0.4, 0.1, 7.9, 1.8, 2, 0],
    cup: 198,
    note: "cooked",
  },
  banana: {
    per100: [89, 1.1, 22.8, 0.3, 0.1, 2.6, 12.2, 1, 0],
    piece: 118,
    cup: 150,
  },
  berries: {
    per100: [57, 0.7, 14.5, 0.3, 0, 2.4, 10.0, 1, 0],
    cup: 148,
    piece: 1.5,
    note: "blueberries",
  },
  lemon: {
    per100: [29, 1.1, 9.3, 0.3, 0, 2.8, 2.5, 2, 0],
    piece: 58,
    cup: 244,
  },
  "peanut butter": {
    per100: [588, 25.1, 20.0, 50.4, 10.3, 6.0, 9.2, 459, 0],
    cup: 258,
  },
  almonds: {
    per100: [579, 21.2, 21.6, 49.9, 3.8, 12.5, 4.4, 1, 0],
    cup: 143,
    piece: 1.2,
  },
  basil: {
    per100: [23, 3.2, 2.7, 0.6, 0, 1.6, 0.3, 4, 0],
    cup: 21,
    piece: 0.5,
  },
  rosemary: {
    per100: [131, 3.3, 20.7, 5.9, 2.8, 14.1, 0, 26, 0],
    cup: 27,
    piece: 1,
  },
  chili: { per100: [40, 1.9, 8.8, 0.4, 0, 1.5, 5.3, 9, 0], piece: 45, cup: 75 },
  "soy sauce": {
    per100: [53, 8.1, 4.9, 0.6, 0.1, 0.8, 0.4, 5493, 0],
    cup: 255,
  },
  salt: { per100: [0, 0, 0, 0, 0, 0, 0, 38758, 0], cup: 292 },
  "black pepper": {
    per100: [251, 10.4, 64.0, 3.3, 1.4, 25.3, 0.6, 20, 0],
    cup: 110,
  },
};

foods.blueberries = foods.berries;

// FDA Daily Values for a 2,000-calorie diet.
export const dailyValues: Partial<Record<keyof Nutrients, number>> = {
  fat: 78,
  satFat: 20,
  cholesterol: 300,
  sodium: 2300,
  carbs: 275,
  fiber: 28,
  protein: 50,
};

const zero: Nutrients = {
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  satFat: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
  cholesterol: 0,
};

export type IngredientNutrition = {
  name: string;
  grams: number | null;
  nutrients: Nutrients | null;
  // Why this ingredient isn't counted, or what was assumed about it.
  issue?: string;
  note?: string;
};

export type RecipeNutrition = {
  total: Nutrients;
  perServing: Nutrients;
  knownCalories: { total: number | null; perServing: number | null; counted: number };
  // Like knownCalories, for every nutrient: the sum over the ingredients that
  // have a value for it (null when none do), and how many that was. One food
  // with no USDA protein value no longer makes the recipe's protein unknown.
  known: { total: Nutrients; perServing: Nutrients; counted: Record<keyof Nutrients, number> };
  items: IngredientNutrition[];
  counted: number;
  skipped: IngredientNutrition[];
};

export function findFood(name: string): { key: string; food: Food } | null {
  const n = name.toLowerCase().trim();
  if (Object.hasOwn(foods, n)) return { key: n, food: foods[n] };
  // Longest key first so "egg whites" beats "eggs" and "sweet potatoes" beats "potatoes".
  const keys = Object.keys(foods).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    // Whole words only, so "cornstarch" doesn't count as corn.
    const singular = k.replace(/(es|s)$/, "");
    const re = new RegExp(`\\b(${k}|${singular})(e?s)?\\b`);
    if (re.test(n)) return { key: k, food: foods[k] };
  }
  return null;
}

export function parseAmount(amount: string): number | null {
  const a = amount.trim();
  if (!a) return null;
  const mixed = a.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return +mixed[1] + +mixed[2] / +mixed[3];
  const frac = a.match(/^(\d+)\/(\d+)$/);
  if (frac) return +frac[1] / +frac[2];
  const n = Number(a);
  return Number.isFinite(n) ? n : null;
}

const weightUnits: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.35,
  lb: 453.6,
};
const pieceUnits = new Set(["", "clove", "slice", "can", "piece"]);

function toGrams(qty: number, unit: string, food?: Food): number | null {
  if (unit in weightUnits) return qty * weightUnits[unit];
  const cup = food?.cup;
  if (unit === "cup") return cup ? qty * cup : null;
  if (unit === "tbsp") return cup ? (qty * cup) / 16 : null;
  if (unit === "tsp") return cup ? (qty * cup) / 48 : null;
  if (unit === "ml") return cup ? (qty * cup) / 240 : qty;
  if (unit === "l") return cup ? (qty * cup * 1000) / 240 : qty * 1000;
  if (unit === "pinch") return qty * 0.4;
  if (unit === "handful") return qty * 30;
  if (pieceUnits.has(unit)) return food?.piece ? qty * food.piece : null;
  return null;
}

export function calculateNutrition(
  ingredients: { name: string; amount: string; unit: string; food?: FoundationFood }[],
  servings: number,
): RecipeNutrition {
  const items: IngredientNutrition[] = ingredients.map((ing) => {
    const match = findFood(ing.food?.description ?? ing.name);
    if (!match && !ing.food)
      return {
        name: ing.name,
        grams: null,
        nutrients: null,
        issue: "Not in our nutrition table yet",
      };
    const qty = parseAmount(ing.amount);
    if (qty === null || !Number.isFinite(qty) || qty <= 0)
      return {
        name: ing.name,
        grams: null,
        nutrients: null,
        issue: "Enter a positive amount",
        note: ing.food ? undefined : match?.food.note,
      };
    const grams = toGrams(qty, ing.unit, match?.food);
    if (grams === null || !Number.isFinite(grams))
      return {
        name: ing.name,
        grams: null,
        nutrients: null,
        issue: `Can't convert “${ing.unit || "pieces"}” to grams — enter a weight in grams`,
        note: ing.food ? undefined : match?.food.note,
      };
    const per100 = ing.food
      ? [ing.food.kcal_per_100g, ing.food.protein_per_100g, ing.food.carbs_per_100g,
         ing.food.fat_per_100g, null, null, ing.food.total_sugars_g_per_100g ?? null,
         ing.food.sodium_mg_per_100g ?? null, null]
      : match!.food.per100;
    const [kcal, protein, carbs, fat, satFat, fiber, sugar, sodium, cholesterol] =
      per100.map(value => value === null ? null : value * grams / 100);
    return {
      name: ing.name,
      grams,
      note: ing.food ? undefined : match?.food.note,
      nutrients: { kcal, protein, carbs, fat, satFat, fiber, sugar, sodium, cholesterol },
    };
  });

  const keys = Object.keys(zero) as (keyof Nutrients)[];
  const total: Nutrients = { ...zero };
  const knownTotal: Nutrients = { ...zero };
  const counted = Object.fromEntries(keys.map((k) => [k, 0])) as Record<keyof Nutrients, number>;
  for (const item of items) {
    if (!item.nutrients) continue; // Skipped items are explicitly listed in the panel.
    for (const key of keys) {
      const running = total[key];
      const contribution = item.nutrients[key];
      total[key] = running === null || contribution === null ? null : running + contribution;
      if (contribution !== null) {
        knownTotal[key] = knownTotal[key]! + contribution;
        counted[key]++;
      }
    }
  }
  for (const key of keys) if (!counted[key]) knownTotal[key] = null;

  const s = Math.max(1, servings);
  const divide = (n: Nutrients) => Object.fromEntries(
    Object.entries(n).map(([k, v]) => [k, v === null ? null : v / s]),
  ) as Nutrients;
  const perServing = divide(total);
  const knownPerServing = divide(knownTotal);

  return {
    total,
    perServing,
    knownCalories: {
      total: knownTotal.kcal,
      perServing: knownPerServing.kcal,
      counted: counted.kcal,
    },
    known: { total: knownTotal, perServing: knownPerServing, counted },
    items,
    counted: items.filter((i) => i.nutrients).length,
    skipped: items.filter((i) => !i.nutrients),
  };
}
