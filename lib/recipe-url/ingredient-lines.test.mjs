import assert from "node:assert/strict";
import test from "node:test";
import { combineDuplicates, matchFood, parseLine } from "./ingredient-lines.ts";
import { calculateNutrition } from "../nutrition.ts";

const breast = { fdc_id: 2646170, description: "Chicken, breast, boneless, skinless, raw" };
const skinOn = { fdc_id: 2727569, description: "Chicken, breast, meat and skin, raw" };
const thigh = { fdc_id: 2646171, description: "Chicken, thigh, boneless, skinless, raw" };
const cooked = { fdc_id: 171534, description: "Chicken, broiler or fryers, breast, skinless, boneless, meat only, cooked, grilled" };
const poultry = [thigh, cooked, skinOn, breast];

test("the Delish chicken line keeps its quantity and matches the raw USDA breast", () => {
  const line = parseLine("4 boneless, skinless chicken breasts");
  assert.equal(line.amount, "4");
  assert.equal(line.unit, "");
  assert.deepEqual(matchFood(line.name, poultry), { food: breast, confidence: "sure" });
});

test("cut details can follow the food, while trailing instructions stay out of the match", () => {
  for (const raw of [
    "4 chicken breasts, skinless and boneless, cut into strips",
    "4 chicken breasts (boneless, skinless), patted dry",
  ]) {
    assert.deepEqual(matchFood(parseLine(raw).name, poultry), { food: breast, confidence: "sure" });
  }
  const garlic = parseLine("2 garlic cloves, finely chopped");
  assert.deepEqual([garlic.name, garlic.amount, garlic.unit], ["garlic", "2", "clove"]);
});

test("opposite cuts are excluded and unspecified bone details need review", () => {
  const name = parseLine("2 bone-in, skin-on chicken breasts").name;
  assert.deepEqual(matchFood(name, poultry), { food: skinOn, confidence: "check" });
  assert.deepEqual(matchFood(name, [breast]), { food: null, confidence: "none" });
  assert.deepEqual(matchFood("skinless chicken breast", [skinOn]), { food: null, confidence: "none" });
});

test("pepper and herbs match their USDA names without treating all pepper products alike", () => {
  const pepper = { fdc_id: 170931, description: "Spices, pepper, black" };
  const thyme = { fdc_id: 173470, description: "Thyme, fresh" };
  const foods = [pepper, thyme];
  assert.deepEqual(matchFood("Freshly ground black pepper", foods), { food: pepper, confidence: "sure" });
  assert.deepEqual(matchFood("fresh thyme leaves", foods), { food: thyme, confidence: "sure" });
  assert.deepEqual(matchFood("crushed red pepper flakes", foods), { food: null, confidence: "none" });
});

test("plain chili flakes can use the SR Legacy red pepper estimate after checking for an exact match", () => {
  const redPepper = { fdc_id: 170932, description: "Spices, pepper, red or cayenne" };
  for (const name of ["crushed red pepper flakes", "red pepper flakes", "chilli flakes", "crushed red pepper"]) {
    const match = matchFood(name, [redPepper]);
    assert.equal(match.food, redPepper);
    assert.equal(match.confidence, "check");
  }
  const exact = { fdc_id: 1, description: "Red pepper flakes" };
  assert.equal(matchFood("crushed red pepper flakes", [redPepper, exact]).food, exact);
  assert.equal(matchFood("smoked paprika flakes", [redPepper]).food, null);
});

test("the Delish broth and pepper count toward both whole-recipe and per-serving nutrition", () => {
  const broth = {
    fdc_id: 171609, description: "Soup, chicken broth, low sodium, canned",
    kcal_per_100g: 16, protein_per_100g: 2, carbs_per_100g: 1.2, fat_per_100g: 0.6,
  };
  const pepper = {
    fdc_id: 170932, description: "Spices, pepper, red or cayenne",
    kcal_per_100g: 318, protein_per_100g: 12.01, carbs_per_100g: 56.63, fat_per_100g: 17.27,
  };
  const ingredients = ["3/4 c. low-sodium chicken broth", "1 tsp. crushed red pepper flakes"].map((raw) => {
    const line = parseLine(raw);
    return { ...line, food: matchFood(line.name, [broth, pepper]).food };
  });
  const nutrition = calculateNutrition(ingredients, 4);
  assert.equal(nutrition.counted, 2);
  assert.deepEqual(nutrition.items.map((item) => item.grams), [180, 1.8]);
  assert.equal(nutrition.items[0].nutrients.kcal, 28.8);
  assert.equal(nutrition.knownCalories.total, 28.8 + 318 * 1.8 / 100);
  assert.equal(nutrition.perServing.kcal, nutrition.knownCalories.total / 4);
});

test("cup weights follow the specific food and leave unsupported cups uncounted", () => {
  const foods = [
    { fdc_id: 174536, description: "Soup, chicken broth, ready-to-serve" },
    { fdc_id: 168567, description: "Tomatoes, sun-dried" },
    { fdc_id: 0, description: "Unknown food" },
  ];
  const items = foods.map((food) => ({ name: food.description, amount: "1/2", unit: "cup", food }));
  assert.deepEqual(calculateNutrition(items, 1).items.map((item) => item.grams), [124.5, 27, null]);
});

test("lines for the same food are combined into one ingredient", () => {
  const butter = { fdc_id: 173410, description: "Butter, salted", kcal_per_100g: 717 };
  const salt = { fdc_id: 173468, description: "Salt, table", kcal_per_100g: 0 };
  // Same unit: amounts add up.
  const weigh = (line) => calculateNutrition([{ name: line.food.description, ...line }], 1).items[0].grams;
  let out = combineDuplicates([
    { food: butter, amount: "2", unit: "tbsp" }, { food: salt, amount: "1", unit: "tsp" },
    { food: butter, amount: "1", unit: "tbsp" },
  ], weigh);
  assert.equal(out.combined, 1);
  assert.deepEqual(out.ingredients.map((i) => [i.food.fdc_id, i.amount, i.unit]), [[173410, "3", "tbsp"], [173468, "1", "tsp"]]);
  // Different units: added up in grams.
  out = combineDuplicates([{ food: butter, amount: "100", unit: "g" }, { food: butter, amount: "1", unit: "tbsp" }], weigh);
  assert.equal(out.ingredients.length, 1);
  assert.equal(out.ingredients[0].unit, "g");
  assert.ok(Number(out.ingredients[0].amount) > 110 && Number(out.ingredients[0].amount) < 120);
  // Unmatched lines are skipped.
  assert.equal(combineDuplicates([{ food: null, amount: "1", unit: "" }], weigh).ingredients.length, 0);
});
