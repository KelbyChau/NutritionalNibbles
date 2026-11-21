// PROPOSAL, not agreed with the backend yet. These are the shapes the
// recipe form sends to POST /api/optimize and expects back. Change them
// together with whoever builds the endpoint.

export const goals = [
  { value: "more-protein", label: "More protein" },
  { value: "fewer-calories", label: "Fewer calories" },
  { value: "fewer-carbs", label: "Fewer carbs" },
  { value: "less-fat", label: "Less fat" },
] as const;

export type Goal = (typeof goals)[number]["value"];

export function isGoal(value: unknown): value is Goal {
  return goals.some((goal) => goal.value === value);
}

// Estimated per serving, from ingredient nutrition data (not AI guesses).
export type Macros = {
  calories: number;
  protein: number; // grams
  carbs: number;
  fat: number;
};

export type OptimizeRequest = {
  name?: string;
  servings: number;
  ingredients: string; // free text, one ingredient per line
  instructions?: string;
  goal: Goal;
};

export type Swap = {
  from: string;
  to: string;
  reason: string; // plain-language why
  tradeoff?: string; // likely taste or texture change
};

export type OptimizeResponse = {
  swaps: Swap[];
  instructions?: string; // updated steps, when the swaps change them
  before: Macros;
  after: Macros;
  goalMet: boolean; // only true when before/after actually supports it
  summary: string;
  flags?: string[]; // uncertain matches or missing amounts to review
};
