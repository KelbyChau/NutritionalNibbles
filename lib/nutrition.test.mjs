// Pins today's nutrition math (values recorded 2026-11-22) so refactors
// can't quietly change a number a user sees.
import assert from "node:assert/strict";
import test from "node:test";
import { calculateNutrition, parseAmount } from "./nutrition.ts";

const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≉ ${expected}`);

const steak = {
  fdc_id: 2727574, description: "Beef, top sirloin steak, raw",
  kcal_per_100g: 146, protein_per_100g: 22, carbs_per_100g: 0.218, fat_per_100g: 5.71,
  total_sugars_g_per_100g: null, sodium_mg_per_100g: 42.8,
};
const butter = {
  fdc_id: 790508, description: "Butter, stick, unsalted",
  kcal_per_100g: 717, protein_per_100g: null, carbs_per_100g: null, fat_per_100g: 82.2,
  total_sugars_g_per_100g: 0.58, sodium_mg_per_100g: 11,
};
const broth = {
  fdc_id: 171609, description: "Soup, chicken broth, low sodium, canned",
  kcal_per_100g: 16, protein_per_100g: 2, carbs_per_100g: 1.2, fat_per_100g: 0.6,
};

test("parseAmount reads whole numbers, fractions and mixed numbers", () => {
  const cases = [["1 1/2", 1.5], ["1/2", 0.5], [" 3 ", 3], ["", null], ["abc", null],
    ["1,5", null], ["1,000", null], ["1/0", Infinity], ["-2", -2]];
  for (const [input, expected] of cases) assert.equal(parseAmount(input), expected, JSON.stringify(input));
});

test("a recipe with spoon, cup, missing and unknown units", () => {
  const r = calculateNutrition([
    { name: "steak", food: steak, amount: "400", unit: "g" },
    { name: "butter", food: butter, amount: "2", unit: "tbsp" },
    { name: "broth", food: broth, amount: "3/4", unit: "cup" },
    { name: "steak again", food: steak, amount: "", unit: "g" },
    { name: "steak bunch", food: steak, amount: "2", unit: "bunch" },
  ], 2);
  assert.deepEqual(r.items.map((i) => i.grams), [400, 28.375, 180, null, null]);
  assert.equal(r.items[3].issue, "Enter a positive amount");
  assert.equal(r.items[4].issue, "Can't convert “bunch” to grams — enter a weight in grams");
  assert.equal(r.counted, 3);
  assert.equal(r.perServing.protein, null);
  close(r.perServing.kcal, 408.124375);
  close(r.known.perServing.protein, 45.8);
  close(r.known.perServing.sodium, 87.160625);
  assert.deepEqual(r.known.counted,
    { kcal: 3, protein: 2, carbs: 2, fat: 3, satFat: 0, fiber: 0, sugar: 1, sodium: 2, cholesterol: 0 });
  assert.equal(r.knownCalories.counted, 3);
  close(r.knownCalories.total, 816.24875);
  close(r.knownCalories.perServing, 408.124375);
});

test("millilitres of a food with no portion data count as grams", () => {
  const liquid = { fdc_id: 1, description: "Mystery liquid", kcal_per_100g: 10 };
  const r = calculateNutrition([{ name: "liquid", food: liquid, amount: "250", unit: "ml" }], 1);
  assert.equal(r.items[0].grams, 250);
});
