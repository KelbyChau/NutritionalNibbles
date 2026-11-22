// Suggestions shown under the chat box as the user types.

import { Minus, Plus, RotateCcw, Undo2, UtensilsCrossed, WandSparkles, X } from "lucide-react";
import type { FoundationFood } from "@/lib/foundation-foods";
import { findSwapRule } from "../changes";
import { goals, type Ingredient } from "../shared";
import { ingredientOptions } from "../ingredients";
import { lower } from "./swap-text";
import type { Suggestion } from "./types";

export function chatSuggestions(
  raw: string,
  ingredients: Ingredient[],
  foods: FoundationFood[],
): Suggestion[] {
  const q = raw.trim();
  if (!q) return [];
  const out: Suggestion[] = [];

  if (/^(ad|add)\b/i.test(q)) {
    for (const option of ingredientOptions(
      q.replace(/^add\s*/i, ""),
      foods,
      ingredients,
    ).slice(0, 4)) {
      out.push({
        text: "Add " + option.text,
        food: option.food,
        icon: Plus,
        iconClass: "text-primary",
      });
    }
  }

  const byId = new Map(foods.map((f) => [f.fdc_id, f]));
  const actions: Suggestion[] = [
    ...goals.map((g) => ({
      text: `Make it ${g.phrase}`,
      icon: g.icon,
      iconClass: g.color,
    })),
    ...ingredients.flatMap((i) => {
      const rule = findSwapRule(i.food.fdc_id);
      const to = rule && byId.get(rule.to);
      const name = lower(i.name);
      return [
        ...(to
          ? [
              {
                text: `Swap ${name} for ${lower(to.description)}`,
                icon: WandSparkles,
                iconClass: "text-primary",
              },
            ]
          : []),
        { text: `Use half the ${name}`, icon: Minus },
        { text: `Use 25% less ${name}`, icon: Minus },
        { text: `Remove ${name}`, icon: X },
      ];
    }),
    { text: "Undo", icon: Undo2 },
    { text: "Reset to the original", icon: RotateCcw },
    { text: "4 servings", icon: UtensilsCrossed },
  ];
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  for (const a of actions) {
    const words = a.text.toLowerCase().split(/[\s,()]+/);
    if (
      a.text.toLowerCase() !== q.toLowerCase() &&
      tokens.every((t) => words.some((w) => w.startsWith(t)))
    ) {
      out.push(a);
    }
  }
  return out.slice(0, 6);
}
