// Turn ingredient lines from a recipe website ("1 ½ cups all-purpose flour,
// sifted") into an amount, a unit our nutrition math understands, and the
// closest USDA Foundation Food. The import dialog shows the result for review,
// so this aims to be right most of the time and to say when it's unsure.

import type { FoundationFood } from "../foundation-foods";

export type ParsedLine = {
  raw: string; // the line exactly as the website wrote it
  name: string; // cleaned ingredient name used for matching
  amount: string; // "1 1/2", "0.5", or "" when the recipe gives none
  unit: string; // g, kg, oz, lb, ml, l, cup, tbsp, tsp, pinch, clove, slice, can, "" (pieces), or another word
  note?: string; // something the reviewer should know (range, size, ...)
};

export type FoodMatch = {
  food: FoundationFood | null;
  // sure: every word of the ingredient matched the USDA name.
  // check: close but not exact ("sharp cheddar" → "Cheese, cheddar").
  // none: nothing in the catalog looked right.
  confidence: "sure" | "check" | "none";
};

// ---- Line parsing --------------------------------------------------------------

const vulgar: Record<string, string> = {
  "½": "1/2", "¼": "1/4", "¾": "3/4", "⅓": "1/3", "⅔": "2/3", "⅛": "1/8",
  "⅜": "3/8", "⅝": "5/8", "⅞": "7/8", "⅕": "1/5", "⅙": "1/6",
};

// Every spelling we expect → [canonical unit, multiplier]. Units the
// nutrition code can't convert (pint, quart…) are turned into ones it can.
const unitTable: [RegExp, string, number][] = [
  [/^(?:g|gr|grams?|grammes?)$/, "g", 1],
  [/^(?:kg|kgs|kilos?|kilograms?)$/, "kg", 1],
  [/^(?:mg|milligrams?)$/, "g", 0.001],
  [/^(?:oz|ounces?)$/, "oz", 1],
  [/^(?:lbs?|pounds?)$/, "lb", 1],
  [/^(?:ml|mls|milliliters?|millilitres?)$/, "ml", 1],
  [/^(?:cl|centiliters?|centilitres?)$/, "ml", 10],
  [/^(?:dl|deciliters?|decilitres?)$/, "ml", 100],
  [/^(?:l|liters?|litres?)$/, "l", 1],
  [/^(?:c|cups?)$/, "cup", 1],
  [/^(?:tbsps?|tbs|tbl|tablespoons?)$/, "tbsp", 1],
  [/^(?:tsps?|teaspoons?)$/, "tsp", 1],
  [/^(?:fl\.? ?oz|fluid ounces?)$/, "tbsp", 2],
  [/^(?:pints?|pt)$/, "cup", 2],
  [/^(?:quarts?|qt)$/, "cup", 4],
  [/^(?:gallons?|gal)$/, "cup", 16],
  [/^(?:pinch(?:es)?|dash(?:es)?|smidgens?)$/, "pinch", 1],
  [/^(?:handfuls?)$/, "handful", 1],
  [/^(?:cloves?)$/, "clove", 1],
  [/^(?:slices?)$/, "slice", 1],
  [/^(?:cans?|tins?)$/, "can", 1],
  // Counted things: "2 sticks butter", "3 stalks celery". Kept as pieces.
  [/^(?:sticks?|stalks?|ribs?|pieces?|whole|fillets?|breasts?|thighs?)$/, "", 1],
];
// Containers and bunches: real units, but we don't know their weight.
const vagueUnits = /^(?:packages?|pkgs?|packets?|jars?|bottles?|containers?|cartons?|bags?|boxes|box|bunch(?:es)?|heads?|sprigs?|envelopes?|sheets?|bars?|loaf|loaves|scoops?)$/;

const inner = (re: RegExp) => re.source.slice(4, -2); // "^(?:a|b)$" → "a|b"
// Bare "T" (tablespoon) and "t" (teaspoon) appear in older recipes.
const UNIT_RE = new RegExp(
  `^(${[...unitTable.map(([re]) => inner(re)), inner(vagueUnits), "t"].join("|")})\\.?(?=\\s|$|,)`,
  "i",
);

// Mixed numbers and fractions first so "1/2" isn't read as "1".
const NUM = "\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:[.,]\\d+)?";

function canonicalUnit(word: string): { unit: string; factor: number } | null {
  const w = word.replace(/\.$/, "");
  if (w === "T") return { unit: "tbsp", factor: 1 };
  if (w === "t") return { unit: "tsp", factor: 1 };
  for (const [re, unit, factor] of unitTable)
    if (new RegExp(re.source, "i").test(w)) return { unit, factor };
  if (vagueUnits.test(w.toLowerCase())) return { unit: w.toLowerCase(), factor: 1 };
  return null;
}

export function toNumber(amount: string): number | null {
  const a = amount.trim().replace(",", ".");
  const mixed = a.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return +mixed[1] + +mixed[2] / +mixed[3];
  const frac = a.match(/^(\d+)\/(\d+)$/);
  if (frac) return +frac[2] ? +frac[1] / +frac[2] : null;
  const n = Number(a);
  return a && Number.isFinite(n) ? n : null;
}

function formatNumber(n: number) {
  return String(Math.round(n * 100) / 100);
}

export function parseLine(raw: string): ParsedLine {
  let text = raw
    .replace(/(\d)\s*([½¼¾⅓⅔⅛⅜⅝⅞⅕⅙])/g, (_, d, f) => `${d} ${vulgar[f]}`)
    .replace(/[½¼¾⅓⅔⅛⅜⅝⅞⅕⅙]/g, (f) => vulgar[f])
    .replace(/⁄/g, "/")
    .replace(/^[\s▢□☐•·*\-–—]+/, "") // checkbox and bullet characters
    .replace(/\s+/g, " ")
    .trim();
  const notes: string[] = [];

  // Amount, possibly a range: "1-2", "1 to 2", "2–3"
  let amount = "";
  const amountMatch = text.match(new RegExp(`^(${NUM})(?:\\s*(?:-|–|—|to|or)\\s*(${NUM}))?\\s*`, "i"));
  if (amountMatch) {
    amount = amountMatch[1].replace(",", ".");
    if (amountMatch[2]) notes.push(`Recipe says ${amountMatch[1]}–${amountMatch[2]}; using ${amountMatch[1]}`);
    text = text.slice(amountMatch[0].length);
  }

  // "1 (14.5 ounce) can tomatoes" → 14.5 oz. "2 (8 oz) packages cream cheese" → 16 oz.
  const sized = text.match(new RegExp(`^\\((${NUM})\\s*-?\\s*([a-z. ]+?)\\)\\s*`, "i"));
  let unit = "";
  if (sized) {
    const innerUnit = canonicalUnit(sized[2].trim());
    const outer = toNumber(amount || "1");
    const size = toNumber(sized[1]);
    if (innerUnit && outer !== null && size !== null && !vagueUnits.test(innerUnit.unit)) {
      amount = formatNumber(outer * size * innerUnit.factor);
      unit = innerUnit.unit;
      text = text.slice(sized[0].length);
      const container = text.match(UNIT_RE);
      if (container) text = text.slice(container[0].length).trimStart();
    }
  }

  if (!unit) {
    const u = text.match(UNIT_RE);
    if (u) {
      const c = canonicalUnit(u[1]);
      if (c) {
        unit = c.unit;
        if (c.factor !== 1 && amount) amount = formatNumber((toNumber(amount) ?? 0) * c.factor);
        text = text.slice(u[0].length).replace(/^\s*of\s+/i, "").trimStart();
        // "15 oz. can tomatoes": the weight is what counts, drop the container.
        if (["g", "kg", "oz", "lb", "ml", "l"].includes(unit))
          text = text.replace(/^(?:cans?|tins?|jars?|packages?|bags?|boxes|box|bottles?|containers?)\s+(?:of\s+)?/i, "");
      }
    }
  }

  // "2 large eggs" stays pieces; remember the size for the reviewer.
  const size = text.match(/^(extra[- ]large|large|medium|small|jumbo)\s+/i);
  if (size && !unit) notes.push(`${size[1].toLowerCase()} size`);

  let name = ingredientName(text)
    .replace(/\b(?:to taste|to serve|as needed|for (?:serving|garnish|frying|the pan|greasing)|plus\b.*|divided|optional|at room temperature|room temperature)\b.*$/i, "")
    .trim()
    // "butter or margarine" → butter; "sunflower or vegetable oil" → sunflower oil
    .replace(/^(\S+)\s+(?:or|\/)\s+(?:\S+\s+)+?(\S+)$/i, "$1 $2")
    .replace(/\s+(?:or|\/)\s+.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // "4 garlic cloves" → 4 clove garlic, so cloves aren't weighed as whole garlic.
  const trailing = name.match(/^(.*\S)\s+(cloves?|slices?|stalks?|sticks?)$/i);
  if (trailing && !unit) {
    name = trailing[1];
    unit = /^clove/i.test(trailing[2]) ? "clove" : /^slice/i.test(trailing[2]) ? "slice" : "";
  }

  if (!name) name = raw.trim();
  return { raw, name, amount, unit, note: notes.join(" · ") || undefined };
}

// ---- USDA matching --------------------------------------------------------------

const stopwords = new Set(["and", "or", "of", "the", "a", "an", "with", "without", "for", "to", "in", "into", "added", "vitamin", "d", "fortified"]);

// Words that describe preparation or size but don't change what the food is.
const descriptive = new Set([
  "fresh", "freshly", "chopped", "diced", "minced", "sliced", "thinly", "thickly", "finely", "roughly",
  "coarsely", "large", "medium", "small", "extra-large", "jumbo", "peeled", "softened", "melted", "cubed",
  "shredded", "packed", "lightly", "firmly", "cold", "warm", "hot", "room", "temperature", "kosher", "sea",
  "organic", "trimmed", "rinsed", "drained", "halved", "quartered", "crushed", "beaten", "sifted",
  "cut", "pieces", "piece", "inch", "bite", "sized", "size", "about", "plus", "more", "good", "quality",
  "best", "pure", "natural", "your", "favorite", "store", "bought", "homemade", "uncooked", "dry", "torn",
]);

const oppositeCut: Record<string, string> = {
  boneless: "bonein", bonein: "boneless", skinless: "skinon", skinon: "skinless",
};

function cutDescription(text: string) {
  const terms = words(text);
  return terms.length > 0 && terms.every((term) => Object.hasOwn(oppositeCut, term));
}

function ingredientName(text: string) {
  const parts = text
    .replace(/\(([^)]*)\)/g, (_, note: string) => cutDescription(note) ? ` ${note} ` : " ")
    .split(/;|\s+-\s+/)[0]
    .split(",");
  // Leading descriptors belong to the food ("boneless, skinless chicken breasts").
  // After the food, retain cut details but drop instructions such as "finely chopped".
  const foodIndex = parts.findIndex((part) => words(part).some(
    (term) => !descriptive.has(term) && !Object.hasOwn(oppositeCut, term) && !prefixPreparations.has(term),
  ));
  if (foodIndex === -1) return parts[0];
  return [...parts.slice(0, foodIndex + 1), ...parts.slice(foodIndex + 1).filter(cutDescription)].join(" ");
}

// Modifiers that make a *different* food when they don't match ("black pepper"
// isn't bell pepper, "coconut milk" isn't milk). Words that appear anywhere in
// the USDA catalog are treated the same way (computed per catalog below).
const differentFood = new Set([
  "black", "white", "cayenne", "chili", "chile", "chipotle", "vanilla", "chocolate", "cocoa", "cinnamon",
  "cumin", "paprika", "oregano", "thyme", "basil", "parsley", "cilantro", "ginger", "nutmeg", "lime",
  "lemon", "maple", "balsamic", "cider", "wine", "sesame", "fish", "oyster", "hoisin", "worcestershire",
  "sriracha", "powder", "powdered", "extract", "broth", "stock", "bouillon", "flake", "zest", "starch",
  "cornstarch", "soup", "seasoning", "vinegar", "syrup", "sweetened", "condensed", "evaporated", "garlic",
  "onion", "celery", "mustard", "brown", "light", "dark", "baking", "yeast", "gelatin", "imitation",
]);

const cookedWords = ["cooked", "roasted", "boiled", "braised", "grilled", "fried", "baked", "steamed", "heated", "prepared", "broiled", "stewed", "rotisserie"];
const processedWords = ["dried", "frozen", "canned", "dehydrated", "powder", "pickled", "puffed", "flour", "juice", "breaded", "par", "commercial", "restaurant"];
const prefixPreparations = new Set([...cookedWords, "raw", "frozen", "canned", "dried", "ground", "grated"]);
// Mild preferences between otherwise equal catalog entries.
const preferred: Record<string, number> = { raw: 1, unsalted: 0.5, skinless: 0.5, boneless: 0.5 };
// What a recipe usually means by the plain word ("rice" → white rice).
const usualKind: Record<string, string> = { rice: "white", milk: "whole", pasta: "enriched", onion: "yellow", mushroom: "button" };
const partWords = ["white", "yolk", "skin", "bran", "germ", "greens"];

const synonyms: Record<string, string> = {
  scallion: "green onion", scallions: "green onion", garbanzo: "chickpea", parmigiano: "parmesan",
  reggiano: "", evoo: "olive oil", ap: "all purpose", courgette: "zucchini", aubergine: "eggplant",
  capsicum: "bell pepper", coriander: "cilantro", prawns: "shrimp", prawn: "shrimp", yoghurt: "yogurt",
  catsup: "ketchup", chilli: "chili", mayo: "mayonnaise", spaghettini: "spaghetti", cremini: "crimini", portobello: "portabella",
  basmati: "white long grain", jasmine: "white long grain", leaves: "leaf",
};

// Whole phrases recipe sites use for foods the USDA names differently.
const phrases: [RegExp, string][] = [
  [/\bbone[- ]in\b/g, "bonein"],
  [/\bskin[- ]on\b/g, "skinon"],
  [/\bwithout skin\b/g, "skinless"],
  [/\bwith skin\b/g, "skinon"],
  [/\bmeat and skin\b/g, "meat skin skinon"],
  [/\bground ((?:black|white) pepper)\b/g, "$1"],
  [/\b(basil|thyme|oregano|rosemary|sage|parsley|cilantro|mint) (?:leaf|leaves)\b/g, "$1"],
  [/\b(?:white|caster|castor|superfine|cane) sugar\b/g, "granulated sugar"],
  [/\bplain flour\b/g, "all-purpose flour"],
  [/\b(?:vegetable|cooking|neutral) oil\b/g, "canola oil"],
  [/\bfire[- ]roasted\b/g, ""],
  [/\bsweet italian sausage\b/g, "mild italian sausage"],
  [
    /\b(?:penne|rigatoni|fusilli|macaroni|elbow macaroni|linguine|fettuccine|fettuccini|farfalle|rotini|ziti|orzo|lasagna|lasagne|angel hair|bucatini|tagliatelle|pappardelle|spaghetti)(?: noodles| pasta)?\b/g,
    "pasta spaghetti",
  ],
];

export function stem(word: string) {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (/(?:ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function words(text: string): string[] {
  let t = text.toLowerCase().replace(/[’']/g, "");
  for (const [re, to] of phrases) t = t.replace(re, to);
  return (t.match(/[a-z]+/g) ?? [])
    .flatMap((w) => (w in synonyms ? synonyms[w].split(" ").filter(Boolean) : [w]))
    .map(stem)
    .filter((w) => !stopwords.has(w));
}

type Indexed = { food: FoundationFood; tokens: Set<string>; main: Set<string>; head: string[]; order: number };
const indexCache = new WeakMap<FoundationFood[], { items: Indexed[]; vocab: Set<string> }>();

function indexFoods(foods: FoundationFood[]) {
  let cached = indexCache.get(foods);
  if (!cached) {
    const items = foods.map((food, order) => ({
      food,
      order,
      tokens: new Set(words(food.description)),
      main: new Set(words(food.description.replace(/\([^)]*\)/g, " "))), // without "(…)" notes
      head: words(food.description.split(",")[0]),
    }));
    const vocab = new Set(items.flatMap((i) => [...i.tokens]));
    cached = { items, vocab };
    indexCache.set(foods, cached);
  }
  return cached;
}

export function matchFood(name: string, foods: FoundationFood[]): FoodMatch {
  const { items, vocab } = indexFoods(foods);
  const all = words(name);
  const cuts = all.filter((w) => Object.hasOwn(oppositeCut, w));
  const optional = new Set(all.filter((w) => descriptive.has(w) || Object.hasOwn(oppositeCut, w)));
  const wanted = all.filter((w) => !optional.has(w));
  if (!wanted.length || /^(?:ice )?water$|^ice$/.test(wanted.join(" "))) return { food: null, confidence: "none" };
  // In English the last word names the food ("chicken *broth*", "garlic *powder*").
  const key = wanted[wanted.length - 1];
  const preferRawCut = cuts.length > 0 && !all.some((w) => cookedWords.includes(w));

  let best: { item: Indexed; score: number; missing: string[] } | null = null;
  for (const item of items) {
    if (!item.main.has(key)) continue;
    if (cuts.some((cut) => item.tokens.has(oppositeCut[cut]))) continue;
    const missing = wanted.filter((w) => !item.tokens.has(w));
    if (missing.length > 2 || missing.some((w) => differentFood.has(w) || vocab.has(w))) continue;
    const matched = wanted.length - missing.length + [...optional].filter((w) => item.tokens.has(w)).length;
    const extras = [...item.tokens].filter((t) => !wanted.includes(t) && !optional.has(t));
    let score = matched * 15 - extras.length * 1.2; // a matching word outweighs any penalty
    if (item.head.every((h) => wanted.includes(h))) score += 5;
    if (preferRawCut && item.tokens.has("raw")) score += 5;
    if (usualKind[key] && item.tokens.has(usualKind[key])) score += 3;
    for (const t of extras) {
      if (cookedWords.includes(t) || processedWords.includes(t)) score -= 5;
      if (partWords.includes(t)) score -= 4;
      score += preferred[t] ?? 0;
    }
    if (!best || score > best.score || (score === best.score && item.order < best.item.order))
      best = { item, score, missing };
  }
  if (!best) return { food: null, confidence: "none" };
  // A cooked or canned USDA entry for a recipe that didn't say so is close, not exact.
  const changed = [...best.item.tokens].some(
    (t) => (cookedWords.includes(t) || processedWords.includes(t)) && !all.includes(t),
  );
  const missingCut = cuts.some((cut) => !best.item.tokens.has(cut));
  return { food: best.item.food, confidence: best.missing.length || changed || missingCut ? "check" : "sure" };
}
