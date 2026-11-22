// Shared types for the optimizer chat.

import type { LucideIcon } from "lucide-react";
import type { UsdaFood } from "@/lib/foundation-foods";
import type { VerifiedSwap } from "@/lib/optimizer/nutrient-swaps";
import type { Change } from "../changes";
import type { GoalKey, Ingredient } from "../shared";

export type Action =
  | { type: "goal"; goal: GoalKey }
  | { type: "change"; change: Change }
  | { type: "nutrientSwap"; swap: VerifiedSwap; from: Ingredient; servings: number; label: string };
export type NutrientSwapAction = Extract<Action, { type: "nutrientSwap" }>;

export type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  actions?: Action[];
};

export type Suggestion = {
  text: string;
  icon: LucideIcon;
  iconClass?: string;
  food?: UsdaFood;
};
