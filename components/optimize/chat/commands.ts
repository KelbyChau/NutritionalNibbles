// Reads a chat message into a command. Only reading: the chat page carries
// each command out (it needs the recipe's state). Goals, nutrient prompts
// ("make it lower in sodium") and everything else come back as "other".
//
// No runtime imports, so the unit tests can load this file directly.

export type ChatCommand =
  | { kind: "undo" }
  | { kind: "reset" }
  | { kind: "servings"; servings: number } // clamped to 1–24
  | { kind: "remove"; target: string }
  | { kind: "swap"; target: string; replacement: string; lighter: boolean }
  | { kind: "scale"; target: string; factor: number } // ≤ 0 means remove it
  | { kind: "setAmount"; target: string; amount: string; unit: string | null }
  | { kind: "add"; text: string }
  | { kind: "other"; text: string };

export function parseChatCommand(message: string): ChatCommand | null {
  const t = message.trim();
  if (!t) return null;
  let m: RegExpMatchArray | null;

  if (/^undo$/i.test(t)) return { kind: "undo" };
  if (/^(reset|start over|reset to the original)/i.test(t)) return { kind: "reset" };

  if ((m = t.match(/^(?:make it |set |change to )?(?:serves\s+)?(\d+)\s*servings?$|^serves\s+(\d+)$/i)))
    return { kind: "servings", servings: Math.min(24, Math.max(1, Number(m[1] ?? m[2]))) };

  if ((m = t.match(/^(?:remove|delete|drop|take out)\s+(.+)$/i)))
    return { kind: "remove", target: m[1] };

  if ((m = t.match(/^(?:swap|replace|switch)\s+(.+?)\s+(?:for|with|to)\s+(.+)$/i)))
    return {
      kind: "swap",
      target: m[1],
      replacement: m[2],
      lighter: /^(something|a)\s+(lighter|healthier|leaner|better)/i.test(m[2]),
    };

  if ((m = t.match(/^(?:use\s+)?(?:(\d+)%\s+(less|more)|(half|double))\s+(?:the\s+|of\s+the\s+)?(.+)$/i))) {
    const factor = m[3]
      ? m[3].toLowerCase() === "half" ? 0.5 : 2
      : 1 + (m[2].toLowerCase() === "less" ? -1 : 1) * (Number(m[1]) / 100);
    return { kind: "scale", target: m[4], factor };
  }

  if ((m = t.match(/^(?:change|set|make)\s+(.+?)\s+to\s+(\d+(?:\.\d+)?|\d+\/\d+)\s*(g|kg|oz|lb|cups?|tbsp|tsp|ml|l)?$/i)))
    return {
      kind: "setAmount",
      target: m[1],
      amount: m[2],
      unit: m[3] ? m[3].toLowerCase().replace(/^cups$/, "cup") : null,
    };

  if (/^add\s+/i.test(t)) return { kind: "add", text: t.replace(/^add\s+/i, "") };

  return { kind: "other", text: t };
}

// The recipe ingredient a message refers to: its name contains the words,
// or failing that, every word appears in its USDA description.
export function findIngredient<T extends { name: string; food: { description: string } }>(
  ingredients: T[],
  term: string,
): T | undefined {
  const t = term.toLowerCase().replace(/^(the|my)\s+/, "").trim();
  if (!t) return undefined;
  const words = t.match(/[a-z0-9]+/g) ?? [];
  return (
    ingredients.find((i) => i.name.toLowerCase().includes(t)) ??
    ingredients.find((i) => words.every((w) => i.food.description.toLowerCase().includes(w)))
  );
}
