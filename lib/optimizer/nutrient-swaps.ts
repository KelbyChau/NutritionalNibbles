import type { FoundationFood } from "../foundation-foods";

export const nutrients = {
  sugar: { column: "total_sugars_g_per_100g", label: "total sugars", unit: "g" },
  sodium: { column: "sodium_mg_per_100g", label: "sodium", unit: "mg" },
} as const;

export type Target = keyof typeof nutrients;
export type Reduction = { target: Target; perServing: number };
export type VerifiedSwap = {
  ingredientId: number;
  replacement: FoundationFood;
  grams: number;
  reductions: Reduction[];
};

export function promptTargets(prompt: string): Target[] {
  if (!/\b(less(?:en(?:ing)?)?|lower(?:ing)?|low|reduc(?:e|ing|tion)|cut(?:ting)?|decreas(?:e|ing)|limit(?:ing)?|drop|fewer)\b/i.test(prompt)) {
    return [];
  }
  const targets: Target[] = [];
  if (/\b(sugars?|sweet(?:ness)?)\b/i.test(prompt)) targets.push("sugar");
  if (/\b(sodium|salt(?:y|iness)?)\b/i.test(prompt)) targets.push("sodium");
  return targets;
}

export function verifySwap(
  ingredientId: number,
  original: FoundationFood,
  replacement: FoundationFood,
  grams: number,
  servings: number,
  targets: Target[],
): VerifiedSwap | null {
  if (original.fdc_id === replacement.fdc_id || !Number.isFinite(grams) || grams <= 0 ||
      !Number.isSafeInteger(servings) || servings < 1 || !targets.length) return null;

  const reductions: Reduction[] = [];
  for (const target of targets) {
    const { column, unit } = nutrients[target];
    const before = original[column];
    const after = replacement[column];
    if (before == null || after == null || !Number.isFinite(before) ||
        !Number.isFinite(after) || after < 0) return null;
    const perServing = (before - after) * grams / 100 / servings;
    // Avoid recommending a change that rounds to zero in the chat.
    if (!Number.isFinite(perServing) || perServing < (unit === "mg" ? 0.5 : 0.005)) return null;
    reductions.push({ target, perServing });
  }

  return { ingredientId, replacement, grams, reductions };
}

export function selectVerifiedSwaps(choices: unknown[], candidates: VerifiedSwap[]) {
  const selected: VerifiedSwap[] = [];
  for (const choice of choices) {
    if (!isRecord(choice)) continue;
    const match = candidates.find((candidate) =>
      candidate.ingredientId === choice.ingredientId &&
      candidate.replacement.fdc_id === choice.fdcId,
    );
    if (match && !selected.includes(match)) selected.push(match);
    if (selected.length === 3) break;
  }
  return selected;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
