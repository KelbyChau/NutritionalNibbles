// Nutrition rings: each ring fills to 100% of the daily value per serving.
import assert from "node:assert/strict";
import test from "node:test";
import { nutritionRings } from "./nutrition-rings.ts";

const none = { kcal: 0, protein: 0, carbs: 0, fat: 0, satFat: 0, fiber: 0, sugar: 0, sodium: 0, cholesterol: 0 };
const all = (n) => Object.fromEntries(Object.keys(none).map((k) => [k, n]));

test("rings fill to the daily value, outer to inner: calories, protein, carbs, fat", () => {
  const rings = nutritionRings({ ...none, kcal: 500, protein: 25, carbs: 275, fat: 100 }, all(1), 1);
  assert.deepEqual(rings.map((r) => r.key), ["calories", "protein", "carbs", "fat"]);
  assert.deepEqual(rings.map((r) => r.label), ["Calories", "Protein", "Carbs", "Fat"]);
  assert.deepEqual(rings.map((r) => r.fraction), [0.25, 0.5, 1, 1]);
  assert.deepEqual(rings.map((r) => r.over), [false, false, false, true]);
  assert.deepEqual(rings.map((r) => r.dailyValue), [2000, 50, 275, 78]);
  assert.deepEqual(rings.map((r) => r.unit), ["kcal", "g", "g", "g"]);
});

test("a missing value draws an empty ring", () => {
  const [, protein] = nutritionRings({ ...none, protein: null }, all(0), 1);
  assert.equal(protein.value, null);
  assert.equal(protein.fraction, 0);
});

test("a subtotal is marked partial", () => {
  const counted = { ...all(2), protein: 1 };
  const [calories, protein] = nutritionRings({ ...none, protein: 10 }, counted, 2);
  assert.equal(protein.partial, true);
  assert.equal(calories.partial, false);
});
