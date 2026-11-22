// Recipe changes for the optimize chat: curated USDA swaps, "use less/more"
// scaling, and the before/after math behind every suggestion.
//
// There is no AI optimizer yet. Suggestions come from the swap list below
// and are only offered when the recalculated nutrition actually moves the
// chosen goal in the right direction.

import {
  calculateNutrition,
  parseAmount,
  type Nutrients,
} from "@/lib/nutrition";
import type { FoundationFood } from "@/lib/foundation-foods";
import { makeIngredient, type GoalKey, type Ingredient } from "./shared";

type SwapRule = {
  from: number[]; // fdc_ids
  to: number; // fdc_id
  factor?: number; // amount multiplier, e.g. dry rice -> ~3x the cauliflower
  note: string; // taste / texture tradeoff, in plain words
};

// fdc_ids from public.foundation_foods.
const swapRules: SwapRule[] = [
  {
    from: [2346386],
    to: 330137,
    note: "Greek yogurt keeps it creamy but tangier. Stir it in off the heat so it doesn't split.",
  },
  {
    from: [2346387],
    to: 330137,
    note: "Very close in texture to sour cream, slightly tangier.",
  },
  {
    from: [2346385],
    to: 328841,
    note: "Blend the cottage cheese smooth first; a little less rich.",
  },
  {
    from: [2514744],
    to: 2514743,
    note: "Same beefy flavor, a bit less juicy. Don't overcook it.",
  },
  {
    from: [2646171, 2727567],
    to: 2646170,
    note: "Leaner and milder. Pull it at 165°F and rest it so it stays juicy.",
  },
  {
    from: [2727569],
    to: 2646170,
    note: "Skinless breast: most of the fat is in the skin.",
  },
  {
    from: [748967],
    to: 747997,
    note: "Whites set firmer and taste milder. Half whites, half whole eggs is a gentler change.",
  },
  { from: [746782], to: 746772, note: "Barely noticeable in most recipes." },
  { from: [746778], to: 746776, note: "Thinner; fine in sauces and baking." },
  {
    from: [2259793, 2259794],
    to: 330137,
    note: "Thicker and tangier, with more protein.",
  },
  { from: [2346384], to: 328841, note: "Same curds, a little less rich." },
  {
    from: [328637],
    to: 329370,
    note: "Milder and stretchier. Keep a little sharp cheddar for flavor if you like.",
  },
  {
    from: [2512381, 2512380],
    to: 2685573,
    factor: 3,
    note: "Pulse cauliflower into rice-sized bits. Much lighter, softer bite. (Dry rice roughly triples when cooked, so the amount is tripled.)",
  },
  {
    from: [2758998, 2759000],
    to: 2685568,
    factor: 2.5,
    note: "Spiralized zucchini noodles: far fewer carbs, no pasta chew. (Dry pasta is ~2.5× heavier cooked, so the amount is scaled.)",
  },
  {
    from: [2758996],
    to: 2758997,
    note: "Corn tortillas are smaller and more fragile; warm them first.",
  },
  {
    from: [2758993],
    to: 2758994,
    note: "Nuttier and denser, with more protein and fiber.",
  },
  {
    from: [2346401, 2346402, 2346403],
    to: 2685573,
    note: "Mashed or roasted cauliflower stands in for potato; lighter and less starchy.",
  },
];

// Short, friendly names for swap buttons (USDA descriptions are long).
const shortNames: Record<number, string> = {
  2346386: "Heavy cream",
  2346387: "Sour cream",
  2346385: "Cream cheese",
  328841: "Cottage cheese (2%)",
  2514744: "80/20 ground beef",
  2514743: "90/10 ground beef",
  2646171: "Chicken thigh",
  2727567: "Chicken thigh with skin",
  2727569: "Chicken breast with skin",
  2646170: "Skinless chicken breast",
  748967: "Whole eggs",
  747997: "Egg whites",
  746782: "Whole milk",
  746772: "1% milk",
  746778: "2% milk",
  746776: "Skim milk",
  2259793: "Whole-milk yogurt",
  2259794: "Whole-milk Greek yogurt",
  330137: "Nonfat Greek yogurt",
  2346384: "Full-fat cottage cheese",
  328637: "Cheddar",
  329370: "Part-skim mozzarella",
  2512381: "White rice",
  2512380: "Brown rice",
  2685573: "Cauliflower",
  2758998: "Pasta",
  2759000: "Whole-grain pasta",
  2685568: "Zucchini noodles",
  2758996: "Flour tortillas",
  2758997: "Corn tortillas",
  2758993: "White bread",
  2758994: "Whole-wheat bread",
  2346401: "Russet potatoes",
  2346402: "Red potatoes",
  2346403: "Gold potatoes",
};

export function shortName(food: FoundationFood) {
  return shortNames[food.fdc_id] ?? food.description.split(",")[0];
}

export type Change = {
  kind: "swap" | "scale";
  id: number; // ingredient id
  label: string; // shown on the button
  command: string; // what the chat sends when the button is pressed
  note: string;
  apply: (list: Ingredient[]) => Ingredient[];
  improvement: number;
  after: Nutrients;
};

const goalMetric: Record<GoalKey, keyof Nutrients> = {
  protein: "protein",
  calories: "kcal",
  carbs: "carbs",
  fat: "fat",
};

export function scaleAmount(amount: string, factor: number) {
  const n = parseAmount(amount);
  if (n === null) return amount;
  const v = n * factor;
  return v >= 10 ? String(Math.round(v)) : String(Number(v.toFixed(2)));
}

export function swapIngredient(
  list: Ingredient[],
  id: number,
  to: FoundationFood,
  factor = 1,
): Ingredient[] {
  return list.map((i) =>
    i.id === id
      ? makeIngredient(
          to,
          { amount: scaleAmount(i.amount, factor), unit: i.unit },
          i.id,
        )
      : i,
  );
}

export function scaleIngredient(
  list: Ingredient[],
  id: number,
  factor: number,
) {
  return list.map((i) =>
    i.id === id ? { ...i, amount: scaleAmount(i.amount, factor) } : i,
  );
}

export function findSwapRule(fromFdcId: number) {
  return swapRules.find((r) => r.from.includes(fromFdcId));
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

// Best few changes for a goal, each with its recalculated nutrition.
export function suggestChanges(
  goal: GoalKey,
  ingredients: Ingredient[],
  servings: number,
  foods: FoundationFood[],
): Change[] {
  const metric = goalMetric[goal];
  const base = calculateNutrition(ingredients, servings);
  const before = base.perServing[metric];
  if (before === null) return [];

  const byId = new Map(foods.map((f) => [f.fdc_id, f]));
  const candidates: Omit<Change, "improvement" | "after">[] = [];

  for (const ing of ingredients) {
    const rule = findSwapRule(ing.food.fdc_id);
    const to = rule && byId.get(rule.to);
    if (rule && to) {
      candidates.push({
        kind: "swap",
        id: ing.id,
        label: `${shortName(ing.food)} → ${shortName(to)}`,
        command: `Swap ${lower(ing.name)} for ${lower(to.description)}`,
        note: rule.note,
        apply: (list) => swapIngredient(list, ing.id, to, rule.factor),
      });
    }
  }

  // Scaling: use less of the biggest source of what we're cutting, or more
  // of a lean protein when raising protein.
  base.items.forEach((item, idx) => {
    const ing = ingredients[idx];
    const value = item.nutrients?.[metric] ?? null;
    if (!ing || value === null || item.nutrients?.kcal == null) return;
    if (goal === "protein") {
      const kcal = item.nutrients.kcal;
      if (kcal > 0 && value / kcal >= 0.15) {
        candidates.push({
          kind: "scale",
          id: ing.id,
          label: `Use 50% more ${lower(shortName(ing.food))}`,
          command: `Use 50% more ${lower(ing.name)}`,
          note: "A bigger portion of a lean protein; the dish stays the same.",
          apply: (list) => scaleIngredient(list, ing.id, 1.5),
        });
      }
    } else if (before > 0 && value / servings / before >= 0.15) {
      candidates.push({
        kind: "scale",
        id: ing.id,
        label: `Use 25% less ${lower(shortName(ing.food))}`,
        command: `Use 25% less ${lower(ing.name)}`,
        note: "Keeps every ingredient, just less of the heaviest one.",
        apply: (list) => scaleIngredient(list, ing.id, 0.75),
      });
    }
  });

  return candidates
    .map((c) => {
      const after = calculateNutrition(
        c.apply(ingredients),
        servings,
      ).perServing;
      const now = after[metric];
      const improvement =
        now === null
          ? -Infinity
          : goal === "protein"
            ? now - before
            : before - now;
      return { ...c, after, improvement };
    })
    .filter((c) => c.improvement >= 0.5)
    .sort((a, b) => b.improvement - a.improvement)
    .slice(0, 3);
}

// "−120 kcal · +18 g protein · −9 g fat" (per serving), skipping tiny changes.
export function describeDelta(before: Nutrients, after: Nutrients) {
  const parts: string[] = [];
  const add = (key: keyof Nutrients, label: string, unit: string) => {
    const a = before[key];
    const b = after[key];
    if (a === null || b === null) return;
    const d = b - a;
    if (Math.abs(d) < 0.5) return;
    parts.push(`${d > 0 ? "+" : "−"}${Math.round(Math.abs(d))}${unit}${label}`);
  };
  add("kcal", "", " kcal");
  add("protein", " protein", " g");
  add("carbs", " carbs", " g");
  add("fat", " fat", " g");
  return parts.length
    ? `${parts.join(" · ")} per serving`
    : "no real change per serving";
}
