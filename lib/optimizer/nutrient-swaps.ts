// Nutrient-goal ingredient swaps for the optimize chat.
//
// Gemini only suggests what to search for, which candidates fit the dish and
// how much of the replacement to use. Every number comes from the USDA
// catalogs, and every swap is re-checked here before the chat shows it.
// Pure functions (type-only imports), so they can run anywhere.
import type { UsdaFood } from "../foundation-foods";

// minChange: smallest per-serving change worth showing (smaller rounds to 0).
// floor: per-serving amount used for scoring when the recipe has very little.
export const nutrients = {
  calories: { column: "kcal_per_100g", key: "kcal", label: "calories", unit: "kcal", minChange: 5, floor: 50 },
  protein: { column: "protein_per_100g", key: "protein", label: "protein", unit: "g", minChange: 0.5, floor: 5 },
  carbs: { column: "carbs_per_100g", key: "carbs", label: "carbs", unit: "g", minChange: 0.5, floor: 5 },
  fat: { column: "fat_per_100g", key: "fat", label: "fat", unit: "g", minChange: 0.5, floor: 3 },
  sugar: { column: "total_sugars_g_per_100g", key: "sugar", label: "total sugars", unit: "g", minChange: 0.005, floor: 2 },
  sodium: { column: "sodium_mg_per_100g", key: "sodium", label: "sodium", unit: "mg", minChange: 0.5, floor: 50 },
} as const;

export type Target = keyof typeof nutrients;
const allTargets = Object.keys(nutrients) as Target[];

/** Which way the user wants a nutrient to move. Any nutrient can go either way. */
export type Direction = "higher" | "lower";
export type Goal = { target: Target; direction: Direction };

/** Signed per-serving change: positive means the nutrient went up. */
export type NutrientChange = { target: Target; perServing: number };

/** How the replacement amount was chosen. */
export const swapBases = ["same_weight", "same_volume", "prepared_equivalent"] as const;
export type SwapBasis = (typeof swapBases)[number];

// The replacement amount, as a multiple of the original weight, for each
// basis. Only dry <-> ready-to-eat swaps get a wide range: riced cauliflower
// for dry rice is about 3x, dry pasta for zucchini noodles about 1/3.
export const AMOUNT_LIMITS: Record<SwapBasis, { min: number; max: number }> = {
  same_weight: { min: 1, max: 1 },
  same_volume: { min: 0.5, max: 2 },
  prepared_equivalent: { min: 0.25, max: 4 },
};
// A requested goal may slip by this share of the recipe's current amount
// (or minChange, if larger) while another requested goal improves.
const GOAL_TOLERANCE = 0.02;

export type VerifiedSwap = {
  ingredientId: number;
  replacement: UsdaFood;
  originalGrams: number;
  /** Replacement amount in grams. */
  grams: number;
  basis: SwapBasis;
  /** The requested nutrients, in the order they were asked for. */
  changes: NutrientChange[];
  /** Other nutrients that moved by at least their minChange. */
  sideEffects: NutrientChange[];
  /** Combined improvement relative to the recipe's current amounts. */
  score: number;
  /** Gemini's one-sentence taste/texture note. Never contains numbers. */
  note?: string;
};

/** Current per-serving amount of each requested nutrient in the recipe. */
export type RecipeAmounts = Partial<Record<Target, number | null>>;

// ---- Reading goals from a chat message ---------------------------------------

const lowerWords = new Set([
  "less", "lessen", "lower", "low", "reduce", "reduced", "reducing", "cut", "cutting",
  "decrease", "decreasing", "limit", "limiting", "drop", "fewer", "minimize", "minimise",
  "no", "without", "trim",
]);
const higherWords = new Set([
  "more", "higher", "high", "increase", "increasing", "boost", "boosting", "raise",
  "extra", "maximize", "maximise", "packed", "add", "adding",
]);
const nutrientWords: Record<Target, RegExp> = {
  calories: /^(calorie|calories|cal|cals|kcal|kcals)$/,
  protein: /^proteins?$/,
  carbs: /^(carb|carbs|carbohydrate|carbohydrates|starch|starchy)$/,
  fat: /^(fat|fats|fatty|greasy)$/,
  sugar: /^(sugar|sugars|sugary|sweet|sweetness)$/,
  sodium: /^(sodium|salt|salty|saltiness)$/,
};
// Words that are a goal on their own.
const goalWords: Record<string, Goal> = {
  lighter: { target: "calories", direction: "lower" },
  leaner: { target: "fat", direction: "lower" },
  keto: { target: "carbs", direction: "lower" },
  bulking: { target: "calories", direction: "higher" },
};

// Words that can follow the nutrient: "keep the fat low", "protein up".
const lowerAfter = new Set(["free", "low", "lower", "down", "reduced"]);
const higherAfter = new Set(["high", "higher", "up"]);

function directionNear(words: string[], i: number): Direction | null {
  // The nearest direction word in the four words before: "reduce the amount of sodium".
  for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
    if (lowerWords.has(words[j])) return "lower";
    if (higherWords.has(words[j])) return "higher";
  }
  // Or right after: "sugar-free", "fat low".
  const next = words[i + 1];
  if (next && lowerAfter.has(next)) return "lower";
  if (next && higherAfter.has(next)) return "higher";
  return null;
}

/**
 * The nutrient goals in a message, in the order they're mentioned, each with
 * the direction the user asked for: "more carbs and less fat" ->
 * [carbs higher, fat lower]. A nutrient needs a direction word nearby
 * ("more", "less", "lower in", "cut down on"...) to count. If a nutrient is
 * mentioned twice, the first direction wins.
 */
export function promptGoals(prompt: string): Goal[] {
  const words = prompt.toLowerCase().match(/[a-z]+/g) ?? [];
  const found: Goal[] = [];
  words.forEach((word, i) => {
    let goal: Goal | null = goalWords[word] ?? null;
    if (!goal) {
      const target = allTargets.find((t) => nutrientWords[t].test(word));
      const direction = target ? directionNear(words, i) : null;
      if (target && direction) goal = { target, direction };
    }
    if (goal && !found.some((g) => g.target === goal.target)) found.push(goal);
  });
  return found;
}

// ---- Searching the catalogs ------------------------------------------------------

/**
 * A Postgres regex matching a search term as a whole word, singular or plural:
 * "milk" matches "Milk, nonfat" but not "Fish, milkfish"; "tomatoes" and
 * "tomato" both match "Tomatoes"; "berry" matches "berries". Terms are
 * [a-z0-9]+, so they're safe to put in a pattern.
 */
export function wordPattern(term: string) {
  const singular = term.length > 3 && term.endsWith("ies") ? `${term.slice(0, -3)}y`
    : term.length > 3 && /(o|s|x|z|ch|sh)es$/.test(term) ? term.slice(0, -2)
    : term.length > 3 && term.endsWith("s") && !term.endsWith("ss") ? term.slice(0, -1)
    : term;
  const word = singular.endsWith("y") ? `${singular.slice(0, -1)}(y|ies)` : `${singular}(s|es)?`;
  return `\\m${word}\\M`;
}

// ---- Checking swaps ------------------------------------------------------------

/** A non-negative number from a catalog value, or null when it's missing. */
export function amountOf(value: unknown): number | null {
  const n = typeof value === "number" ? value
    : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Whether swapping this food could help: every goal has data, and at least
 * one can move (anything can go up; only a value above 0 can go down).
 */
export function canImprove(food: UsdaFood, goals: Goal[]) {
  const values = goals.map((g) => amountOf(food[nutrients[g.target].column]));
  return goals.length > 0 && values.every((v) => v !== null) &&
    goals.some((g, i) => g.direction === "higher" || values[i]! > 0);
}

/**
 * Verifies one swap at a given replacement amount, using only catalog values.
 * Returns null unless all of these hold:
 * - the amount is within AMOUNT_LIMITS for the basis;
 * - per 100 g, the replacement moves no requested nutrient the wrong way and
 *   moves at least one the right way, so changing the portion alone never counts;
 * - per serving, no goal slips beyond a small tolerance, and at least one
 *   moves the requested way by its minChange.
 */
export function evaluateSwap(input: {
  ingredientId: number;
  original: UsdaFood;
  originalGrams: number;
  replacement: UsdaFood;
  grams: number;
  basis: SwapBasis;
  servings: number;
  goals: Goal[];
  recipe: RecipeAmounts;
}): VerifiedSwap | null {
  const { original, replacement, originalGrams, grams, servings, goals } = input;
  if (original.fdc_id === replacement.fdc_id || !goals.length ||
      !Number.isFinite(originalGrams) || originalGrams <= 0 ||
      !Number.isFinite(grams) || grams <= 0 ||
      !Number.isSafeInteger(servings) || servings < 1) return null;
  const ratio = grams / originalGrams;
  const limits = AMOUNT_LIMITS[input.basis];
  if (ratio < limits.min - 1e-9 || ratio > limits.max + 1e-9) return null;

  const perServing = (target: Target) => {
    const before = amountOf(original[nutrients[target].column]);
    const after = amountOf(replacement[nutrients[target].column]);
    return before === null || after === null
      ? null
      : { before, after, change: (after * grams - before * originalGrams) / 100 / servings };
  };

  let betterPer100g = false;
  let improved = false;
  let score = 0;
  const changes: NutrientChange[] = [];
  for (const { target, direction } of goals) {
    const { minChange, floor } = nutrients[target];
    const values = perServing(target);
    if (!values) return null;
    const sign = direction === "higher" ? 1 : -1;
    const gainPer100g = sign * (values.after - values.before);
    if (gainPer100g < 0) return null;
    if (gainPer100g > 0) betterPer100g = true;

    const gain = sign * values.change;
    const current = Math.abs(input.recipe[target] ?? 0);
    if (gain < -Math.max(minChange, GOAL_TOLERANCE * current)) return null;
    if (gain >= minChange) improved = true;
    score += gain / Math.max(current, floor);
    changes.push({ target, perServing: values.change });
  }
  if (!betterPer100g || !improved) return null;

  const sideEffects = allTargets
    .filter((t) => !goals.some((g) => g.target === t))
    .flatMap((target) => {
      const values = perServing(target);
      return values && Math.abs(values.change) >= nutrients[target].minChange
        ? [{ target, perServing: values.change }]
        : [];
    });

  return {
    ingredientId: input.ingredientId,
    replacement,
    originalGrams,
    grams,
    basis: input.basis,
    changes,
    sideEffects,
    score,
  };
}

const roundGrams = (g: number) => (g >= 10 ? Math.round(g) : Math.round(g * 10) / 10);

// Gemini rates how readily a home cook would accept each pick, 1-5. Only
// natural swaps are offered; a pick without a rating isn't trusted.
export const MIN_FIT = 4;

// "Yogurt, Greek, plain, nonfat (Includes foods for ...)" and "Yogurt, Greek,
// plain, nonfat" are the same option to a cook.
const sameFoodKey = (description: string) =>
  description.replace(/\s*\([^)]*\)/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * A short taste/texture note from Gemini, or undefined. Notes with digits are
 * dropped so the AI never supplies a number; nutrition figures only come from
 * the catalogs.
 */
export function cleanNote(value: unknown) {
  if (typeof value !== "string") return undefined;
  const note = value.replace(/\s+/g, " ").trim();
  return note && note.length <= 140 && !/\d/.test(note) ? note : undefined;
}

/**
 * Mixes candidates across ingredients, best score first within each, so one
 * ingredient's search results can't crowd out the rest.
 */
export function interleaveByIngredient(candidates: VerifiedSwap[], limit: number) {
  const groups = new Map<number, VerifiedSwap[]>();
  for (const swap of [...candidates].sort((a, b) => b.score - a.score)) {
    groups.set(swap.ingredientId, [...(groups.get(swap.ingredientId) ?? []), swap]);
  }
  const mixed: VerifiedSwap[] = [];
  for (let round = 0; mixed.length < limit; round++) {
    const picks = [...groups.values()].map((list) => list[round]).filter(Boolean);
    if (!picks.length) break;
    mixed.push(...picks.slice(0, limit - mixed.length));
  }
  return mixed;
}

export type SwapContext = {
  /** The original food and its grams, by ingredient id. */
  originals: Map<number, { food: UsdaFood; grams: number }>;
  servings: number;
  goals: Goal[];
  recipe: RecipeAmounts;
};

/**
 * Turns Gemini's ranked picks into verified swaps. Only candidate pairs the
 * server already found are accepted, and each is re-checked at the amount
 * Gemini chose. "same_weight" always uses the original weight. Picks rated
 * below MIN_FIT, and repeats of the same food under another USDA name, are
 * skipped. Keeps the first three that pass, in Gemini's order (best first).
 */
export function selectVerifiedSwaps(choices: unknown[], candidates: VerifiedSwap[], context: SwapContext) {
  const selected: VerifiedSwap[] = [];
  const used = new Set<string>();
  for (const choice of choices) {
    if (!isRecord(choice)) continue;
    const candidate = candidates.find((c) =>
      c.ingredientId === choice.ingredientId && c.replacement.fdc_id === choice.fdcId,
    );
    const original = candidate && context.originals.get(candidate.ingredientId);
    if (!candidate || !original) continue;
    if (typeof choice.fit !== "number" || choice.fit < MIN_FIT) continue;
    const pair = `${candidate.ingredientId}:${sameFoodKey(candidate.replacement.description)}`;
    if (used.has(pair)) continue;

    const basis = swapBases.find((b) => b === choice.basis) ?? "same_weight";
    const grams = basis === "same_weight" ? original.grams : roundGrams(Number(choice.grams));
    const swap = evaluateSwap({
      ingredientId: candidate.ingredientId,
      original: original.food,
      originalGrams: original.grams,
      replacement: candidate.replacement,
      grams,
      basis,
      servings: context.servings,
      goals: context.goals,
      recipe: context.recipe,
    });
    if (!swap) continue;
    used.add(pair);
    selected.push({ ...swap, note: cleanNote(choice.note) });
    if (selected.length === 3) break;
  }
  return selected;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
