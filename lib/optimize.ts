// Shared shapes for the recipe optimizer. The frontend sends an
// OptimizeRequest to POST /api/optimize and expects an OptimizeResponse.
// Agree on changes here with the backend before editing.

export const goals = [
  { value: "more-protein", label: "More protein" },
  { value: "fewer-carbs", label: "Fewer carbs" },
  { value: "less-fat", label: "Less fat" },
  { value: "fewer-calories", label: "Fewer calories" },
] as const;

export type Goal = (typeof goals)[number]["value"];

export function isGoal(value: unknown): value is Goal {
  return goals.some((goal) => goal.value === value);
}

export type Macros = {
  protein: number; // grams per serving
  carbs: number;
  fat: number;
};

export type OptimizeRequest = {
  name?: string;
  servings: number;
  ingredients: string; // free text, one ingredient per line; the AI parses it
  instructions?: string;
  goal: Goal;
  targets?: Partial<Macros>; // optional per-serving targets in grams
};

export type Swap = {
  from: string;
  to: string;
  reason?: string;
};

export type OptimizeResponse = {
  swaps: Swap[];
  before: Macros;
  after: Macros;
};
