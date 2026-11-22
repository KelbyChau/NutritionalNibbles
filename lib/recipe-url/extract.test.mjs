// Pins how recipes are read from a page's HTML (JSON-LD first, microdata second).
import assert from "node:assert/strict";
import test from "node:test";
import { extractRecipe } from "./extract.ts";

test("JSON-LD recipe inside @graph, with entities, tags, yield list and relative image", () => {
  const html = `<html><head><title>Best Soup | Site</title><script type="application/ld+json">
    {"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":"Recipe",
     "name":"Tomato &amp; Basil Soup","recipeYield":["4","4 servings"],
     "recipeIngredient":["1 &frac12; cups <b>tomatoes</b>","2 tbsp olive oil"],
     "image":{"url":"/img/soup.jpg"}}]}</script></head></html>`;
  assert.deepEqual(extractRecipe(html, "https://ex.com/r/soup"), {
    title: "Tomato & Basil Soup", servings: 4,
    ingredients: ["1 ½ cups tomatoes", "2 tbsp olive oil"],
    image: "https://ex.com/img/soup.jpg", sourceUrl: "https://ex.com/r/soup",
  });
});

test("microdata fallback uses the page title and the first number of the yield", () => {
  const html = `<title>Grandma's Pie - Blog</title><span itemprop="recipeYield">Serves 6-8</span>
    <li itemprop="recipeIngredient">2 cups flour</li><li itemprop="ingredients">1 egg</li>`;
  assert.deepEqual(extractRecipe(html, "https://ex.com/pie"), {
    title: "Grandma's Pie", servings: 6, ingredients: ["2 cups flour", "1 egg"],
    image: null, sourceUrl: "https://ex.com/pie",
  });
});

test("a page without a recipe gives null", () => {
  assert.equal(extractRecipe("<html>no recipe</html>", "https://ex.com"), null);
});

test("a broken JSON-LD block is skipped and newline-separated ingredients are split", () => {
  const html = `<script type="application/ld+json">{broken</script>` +
    `<script type="application/ld+json">{"@type":"Recipe","name":"X","recipeIngredient":"a\\nb"}</script>`;
  assert.deepEqual(extractRecipe(html, "https://ex.com")?.ingredients, ["a", "b"]);
});
