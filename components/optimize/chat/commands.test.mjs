// The chat's command reading, pinned to today's patterns.
import assert from "node:assert/strict";
import test from "node:test";
import { findIngredient, parseChatCommand } from "./commands.ts";

test("blank messages are ignored", () => {
  assert.equal(parseChatCommand("  "), null);
});

test("undo and reset (reset matches as a prefix)", () => {
  assert.deepEqual(parseChatCommand("Undo"), { kind: "undo" });
  assert.deepEqual(parseChatCommand("reset please"), { kind: "reset" });
  assert.deepEqual(parseChatCommand("start over"), { kind: "reset" });
});

test("servings, clamped to 1–24", () => {
  for (const message of ["4 servings", "serves 4", "make it 4 servings"])
    assert.deepEqual(parseChatCommand(message), { kind: "servings", servings: 4 }, message);
  assert.deepEqual(parseChatCommand("99 servings"), { kind: "servings", servings: 24 });
  assert.deepEqual(parseChatCommand("0 servings"), { kind: "servings", servings: 1 });
});

test("remove keeps the words after the verb", () => {
  assert.deepEqual(parseChatCommand("take out the garlic"), { kind: "remove", target: "the garlic" });
});

test("swap, with 'something lighter' flagged", () => {
  assert.deepEqual(parseChatCommand("swap rice for something lighter"),
    { kind: "swap", target: "rice", replacement: "something lighter", lighter: true });
  assert.deepEqual(parseChatCommand("replace cream with greek yogurt"),
    { kind: "swap", target: "cream", replacement: "greek yogurt", lighter: false });
});

test("scaling by percent, half or double", () => {
  assert.deepEqual(parseChatCommand("use 25% less pasta"), { kind: "scale", target: "pasta", factor: 0.75 });
  assert.deepEqual(parseChatCommand("half the butter"), { kind: "scale", target: "butter", factor: 0.5 });
  assert.deepEqual(parseChatCommand("double the beef"), { kind: "scale", target: "beef", factor: 2 });
  assert.deepEqual(parseChatCommand("use 100% less salt"), { kind: "scale", target: "salt", factor: 0 });
});

test("setting an amount, with an optional unit", () => {
  assert.deepEqual(parseChatCommand("change chicken to 300 g"),
    { kind: "setAmount", target: "chicken", amount: "300", unit: "g" });
  assert.deepEqual(parseChatCommand("set milk to 2 cups"),
    { kind: "setAmount", target: "milk", amount: "2", unit: "cup" });
  assert.deepEqual(parseChatCommand("change egg to 3"),
    { kind: "setAmount", target: "egg", amount: "3", unit: null });
});

test("add keeps the text after 'add'", () => {
  assert.deepEqual(parseChatCommand("add 100 g spinach"), { kind: "add", text: "100 g spinach" });
});

test("goals, nutrient prompts and chat fall through to 'other'", () => {
  assert.deepEqual(parseChatCommand("make it lower in sodium"), { kind: "other", text: "make it lower in sodium" });
  assert.deepEqual(parseChatCommand(" hello "), { kind: "other", text: "hello" });
});

const recipe = [
  { name: "Beef (top sirloin steak, raw)", food: { description: "Beef, top sirloin steak, raw" } },
  { name: "Heavy cream", food: { description: "Cream, fluid, heavy whipping" } },
];

test("findIngredient: name contains the term, after dropping 'the'/'my'", () => {
  assert.equal(findIngredient(recipe, "the beef"), recipe[0]);
  assert.equal(findIngredient(recipe, "My Heavy"), recipe[1]);
});

test("findIngredient: otherwise every word must appear in the USDA description", () => {
  assert.equal(findIngredient(recipe, "whipping cream"), recipe[1]);
  assert.equal(findIngredient(recipe, "chicken"), undefined);
  assert.equal(findIngredient(recipe, "the "), undefined);
});
