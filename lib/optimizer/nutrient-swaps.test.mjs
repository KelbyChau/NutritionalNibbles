// Pins how the optimizer reads goals and verifies a swap before offering it.
import assert from "node:assert/strict";
import test from "node:test";
import { AMOUNT_LIMITS, evaluateSwap, promptGoals } from "./nutrient-swaps.ts";

test("goals come from direction words near a nutrient", () => {
  assert.deepEqual(promptGoals("make it lower in sodium"), [{ target: "sodium", direction: "lower" }]);
  assert.deepEqual(promptGoals("more protein and less fat"), [
    { target: "protein", direction: "higher" }, { target: "fat", direction: "lower" },
  ]);
  assert.deepEqual(promptGoals("less sugar please"), [{ target: "sugar", direction: "lower" }]);
  assert.deepEqual(promptGoals("cut down on carbs"), [{ target: "carbs", direction: "lower" }]);
  assert.deepEqual(promptGoals("sodium"), []);
});

const salted = {
  fdc_id: 173410, description: "Butter, salted", kcal_per_100g: 717, protein_per_100g: 0.85,
  carbs_per_100g: 0.06, fat_per_100g: 81.11, total_sugars_g_per_100g: 0.06, sodium_mg_per_100g: 643,
};
const unsalted = { ...salted, fdc_id: 173430, description: "Butter, without salt", sodium_mg_per_100g: 11 };
const swap = {
  ingredientId: 2, original: salted, originalGrams: 30, replacement: unsalted, grams: 30,
  basis: "same_weight", servings: 2, goals: [{ target: "sodium", direction: "lower" }], recipe: { sodium: 184 },
};

test("unsalted butter is a verified lower-sodium swap", () => {
  const result = evaluateSwap(swap);
  assert.equal(result.changes.length, 1);
  assert.equal(result.changes[0].target, "sodium");
  assert.ok(Math.abs(result.changes[0].perServing - -94.8) < 1e-9);
  assert.ok(Math.abs(result.score - 0.5152173913043478) < 1e-9);
  assert.deepEqual(result.sideEffects, []);
});

test("swaps that go the wrong way, change nothing or change the amount are refused", () => {
  assert.equal(evaluateSwap({ ...swap, original: unsalted, replacement: salted }), null);
  assert.equal(evaluateSwap({ ...swap, replacement: salted }), null);
  assert.equal(evaluateSwap({ ...swap, grams: 300 }), null);
});

test("amount limits per swap basis", () => {
  assert.deepEqual(AMOUNT_LIMITS, {
    same_weight: { min: 1, max: 1 },
    same_volume: { min: 0.5, max: 2 },
    prepared_equivalent: { min: 0.25, max: 4 },
  });
});
