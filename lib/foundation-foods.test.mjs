// Pins how USDA names are shown and how the ingredient search ranks foods.
import assert from "node:assert/strict";
import test from "node:test";
import { exactFood, foodLabel, foodName, foodSuggestions } from "./foundation-foods.ts";

test("USDA descriptions read the way people say them", () => {
  const cases = [
    ["Syrups, maple", "Maple syrup", "Maple syrup"],
    ["Spices, pepper, black", "Black pepper", "Black pepper"],
    ["Fish, salmon, Atlantic, farmed, raw", "Atlantic salmon (farmed, raw)", "Atlantic salmon"],
    ["Chicken, breast, boneless, skinless, raw", "Chicken Breast (boneless, skinless, raw)", "Chicken Breast"],
    ["Oil, olive, extra virgin", "Olive oil (extra virgin)", "Olive oil"],
    ["Salad dressing, italian dressing, commercial, regular", "Italian dressing (commercial, regular)", "Italian dressing"],
    ["Apples, raw, with skin", "Apples (raw, with skin)", "Apples"],
    ["Butter, salted", "Butter (salted)", "Butter"],
  ];
  for (const [description, label, name] of cases) {
    assert.equal(foodLabel(description), label);
    assert.equal(foodName(description), name);
  }
});

const foods = [
  { fdc_id: 1, description: "Eggs, whole, raw", source: "foundation" },
  { fdc_id: 2, description: "Eggplant, raw", source: "foundation" },
  { fdc_id: 3, description: "Egg, white, raw", source: "sr_legacy" },
  { fdc_id: 4, description: "Syrups, maple", source: "sr_legacy" },
  { fdc_id: 5, description: "Chicken, breast, raw", source: "foundation" },
  { fdc_id: 6, description: "Chickpeas, canned", source: "sr_legacy" },
];
const ids = (query) => foodSuggestions(foods, query).map((f) => f.fdc_id);

test("search ranks whole-word matches first and Foundation before SR Legacy", () => {
  assert.deepEqual(ids("egg"), [1, 3, 2]);
  assert.deepEqual(ids("chick"), [5, 6]);
  assert.deepEqual(ids("maple syrup"), [4]);
  assert.deepEqual(ids(""), []);
  assert.deepEqual(ids("zzz"), []);
});

test("exactFood matches the USDA description or the friendly label", () => {
  assert.equal(exactFood(foods, "maple syrup")?.fdc_id, 4);
  assert.equal(exactFood(foods, "Eggs, whole, raw")?.fdc_id, 1);
  assert.equal(exactFood(foods, "egg"), undefined);
});
