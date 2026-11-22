// The landing page's dishes are computed with the app's own nutrition math.
import assert from "node:assert/strict";
import test from "node:test";
import { sampleDish, sampleRings, swapShowcase } from "./sample-dish.ts";

test("the hero dish: real USDA numbers, protein-led", () => {
  assert.equal(sampleDish.title, "Lemon chicken & asparagus");
  assert.equal(sampleDish.servings, 2);
  for (const ring of sampleRings) assert.ok(ring.fraction > 0 && ring.fraction <= 1, ring.key);
  const protein = sampleRings.find((r) => r.key === "protein");
  assert.ok(sampleRings.every((r) => r.fraction <= protein.fraction));
  assert.ok(Math.abs(protein.value - 46.44) < 0.01); // (400 g × 22.5 + 200 g × 1.44) / 100 / 2
});

test("the swap showcase: Greek yogurt for heavy cream adds protein and cuts fat", () => {
  const value = (rings, key) => rings.find((r) => r.key === key).value;
  const { before, after, proteinGain, fatCut } = swapShowcase;
  assert.ok(value(after, "protein") > value(before, "protein"));
  assert.ok(value(after, "fat") < value(before, "fat"));
  assert.equal(proteinGain, Math.round(value(after, "protein") - value(before, "protein")));
  assert.equal(fatCut, Math.round(value(before, "fat") - value(after, "fat")));
});
