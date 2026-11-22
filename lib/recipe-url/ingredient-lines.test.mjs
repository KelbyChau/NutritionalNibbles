import assert from "node:assert/strict";
import test from "node:test";
import { matchFood, parseLine } from "./ingredient-lines.ts";

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
