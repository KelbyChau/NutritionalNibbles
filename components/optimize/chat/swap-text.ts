// Wording for verified swaps and goals in the optimizer chat.

import {
  nutrients,
  type Direction,
  type Goal,
  type NutrientChange,
  type SwapBasis,
  type Target,
  type VerifiedSwap,
} from "@/lib/optimizer/nutrient-swaps";
import { goals, type GoalKey } from "../shared";

export const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
export const formatAmount = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });

export function formatChange({ target, perServing }: NutrientChange) {
  const { label, unit } = nutrients[target];
  const size = Math.abs(perServing);
  const value = unit === "g" ? formatAmount.format(size) : String(Math.round(size));
  const sign = perServing > 0 ? "+" : "−";
  return target === "calories" ? `${sign}${value} kcal` : `${sign}${value} ${unit} ${label}`;
}

// "+5.11 g protein, −163 kcal per serving (also −20.96 g fat)". A requested
// nutrient that barely moved is called out rather than left out.
export function describeChanges(swap: VerifiedSwap) {
  const requested = swap.changes.map((c) =>
    Math.abs(c.perServing) < nutrients[c.target].minChange
      ? `about the same ${nutrients[c.target].label}`
      : formatChange(c),
  );
  const also = swap.sideEffects.map(formatChange);
  return `${requested.join(", ")} per serving` + (also.length ? ` (also ${also.join(", ")})` : "");
}

export const basisNote: Record<SwapBasis, string> = {
  same_weight: "",
  same_volume: ", about the same volume",
  prepared_equivalent: ", the ready-to-eat equivalent",
};

// Shown under each offered swap, so the amount is never a surprise.
export const basisExplanation: Record<SwapBasis, string> = {
  same_weight: "Same weight as the original.",
  same_volume: "About the same volume as the original, so the weight differs.",
  prepared_equivalent: "The ready-to-eat equivalent of the original amount (one is dry, the other isn't).",
};

export const isGoalKey = (t: Target): t is GoalKey => goals.some((g) => g.key === t);

// The built-in (rule-based) goals each go one way, so they only stand in for
// the AI when the user asked for that same direction.
export const builtInDirection: Record<GoalKey, Direction> = { protein: "higher", calories: "lower", carbs: "lower", fat: "lower" };
export function builtInGoal(asked: Goal[]): GoalKey | undefined {
  const match = asked.find(({ target, direction }) => isGoalKey(target) && builtInDirection[target] === direction);
  return match && isGoalKey(match.target) ? match.target : undefined;
}
