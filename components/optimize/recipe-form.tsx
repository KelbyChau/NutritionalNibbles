"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  goals,
  type Goal,
  type Macros,
  type OptimizeRequest,
  type OptimizeResponse,
} from "@/lib/optimize";

const ingredientsPlaceholder = `12 oz fettuccine
2 chicken breasts
1 cup heavy cream
4 tbsp butter
1 cup grated parmesan
3 cloves garlic`;

type Status =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "error"; message: string }
  | { state: "done"; result: OptimizeResponse };

const fieldClass =
  "h-11 rounded-xl border-border bg-background/60 text-foreground shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-macro-protein";

const textareaClass =
  "w-full resize-y rounded-2xl border border-border bg-background/60 p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-macro-protein";

export function RecipeForm({
  initialIngredients = "",
  initialGoal = "more-protein",
}: {
  initialIngredients?: string;
  initialGoal?: Goal;
}) {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const body: OptimizeRequest = {
      name: String(form.get("name") ?? "").trim() || undefined,
      servings: Number(form.get("servings")) || 1,
      ingredients: String(form.get("ingredients") ?? "").trim(),
      instructions: String(form.get("instructions") ?? "").trim() || undefined,
      goal: form.get("goal") as Goal,
    };

    setStatus({ state: "sending" });
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 404) {
        setStatus({
          state: "error",
          message:
            "The optimizer isn't connected yet (/api/optimize doesn't exist). Your recipe is ready to send once it does.",
        });
        return;
      }
      if (!res.ok) {
        setStatus({
          state: "error",
          message: `The optimizer returned an error (${res.status}). Check the recipe and try again.`,
        });
        return;
      }
      setStatus({ state: "done", result: (await res.json()) as OptimizeResponse });
    } catch {
      setStatus({
        state: "error",
        message: "Couldn't reach the optimizer. Check your connection and try again.",
      });
    }
  }

  const sending = status.state === "sending";

  return (
    <div className="relative z-10 mx-auto -mt-28 max-w-5xl px-4 sm:px-6 md:-mt-32">
      <form
        onSubmit={handleSubmit}
        className="surface-paper grid gap-10 rounded-3xl bg-card p-6 shadow-[0_24px_48px_-24px_hsl(230_60%_15%/0.45)] sm:p-8 md:grid-cols-[1.4fr_1fr]"
      >
        {/* Left: the recipe */}
        <div className="flex flex-col gap-6">
          <h2 className="font-display text-3xl leading-tight">Your recipe</h2>

          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Recipe name <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="name"
                name="name"
                placeholder="Chicken alfredo"
                className={fieldClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="servings" className="text-sm font-medium">
                Servings
              </label>
              <Input
                id="servings"
                name="servings"
                type="number"
                min={1}
                max={50}
                defaultValue={4}
                required
                className={fieldClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="ingredients" className="text-sm font-medium">
              Ingredients
            </label>
            <p id="ingredients-hint" className="text-sm text-muted-foreground">
              One per line, with amounts. You can check and fix what we read
              before anything changes.
            </p>
            <textarea
              id="ingredients"
              name="ingredients"
              required
              rows={8}
              defaultValue={initialIngredients}
              placeholder={ingredientsPlaceholder}
              aria-describedby="ingredients-hint"
              className={textareaClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="instructions" className="text-sm font-medium">
              Steps <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <p id="instructions-hint" className="text-sm text-muted-foreground">
              Add them and we&apos;ll update the steps to match any swaps.
            </p>
            <textarea
              id="instructions"
              name="instructions"
              rows={4}
              aria-describedby="instructions-hint"
              placeholder="Boil the pasta. Sear the chicken. Simmer the cream with garlic…"
              className={textareaClass}
            />
          </div>
        </div>

        {/* Right: the goal, kept in view while the recipe column scrolls */}
        <div className="flex flex-col gap-8 md:sticky md:top-8 md:self-start">
          <fieldset>
            <legend className="font-display text-3xl leading-tight">
              Your goal
            </legend>
            <div className="mt-4 flex flex-wrap gap-2">
              {goals.map((goal) => (
                <label key={goal.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="goal"
                    value={goal.value}
                    defaultChecked={goal.value === initialGoal}
                    className="peer sr-only"
                  />
                  <span className="inline-flex h-10 items-center rounded-full border border-border px-4 text-sm transition-colors hover:border-foreground/40 peer-checked:border-macro-protein peer-checked:bg-macro-protein peer-checked:text-card peer-focus-visible:ring-2 peer-focus-visible:ring-macro-protein peer-focus-visible:ring-offset-2">
                    {goal.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <p className="text-sm leading-relaxed text-muted-foreground">
            We aim to keep the dish recognizable and only suggest swaps you can
            buy and cook. Nutrition figures are estimates, not medical advice.
          </p>

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={sending}
              className="h-14 w-full rounded-full bg-[hsl(45_84%_72%)] text-base text-[hsl(230_50%_16%)] shadow-none hover:bg-[hsl(45_84%_66%)]"
            >
              {sending ? "Optimizing…" : "Optimize"}
              {!sending && <ArrowRight />}
            </Button>
            <div aria-live="polite" className="text-sm">
              {status.state === "error" && (
                <p className="rounded-xl bg-muted/70 p-3 leading-relaxed">
                  {status.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </form>

      {status.state === "done" && <Results result={status.result} />}
    </div>
  );
}

const macroRows: { key: keyof Macros; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
];

// Minimal results view so the round trip can be tested end to end.
// The full review and comparison UI can replace this.
function Results({ result }: { result: OptimizeResponse }) {
  return (
    <section aria-labelledby="results-heading" className="mt-12 flex flex-col gap-8">
      <div>
        <h2 id="results-heading" className="font-display text-4xl tracking-tight">
          {result.goalMet ? "Goal reached" : "Goal not fully reached"}
        </h2>
        <p className="mt-2 max-w-[65ch] leading-relaxed text-muted-foreground">
          {result.summary}
        </p>
      </div>

      {result.flags && result.flags.length > 0 && (
        <div className="rounded-2xl border border-border p-4">
          <p className="font-medium">Check these</p>
          <ul className="mt-2 list-disc pl-5 text-muted-foreground">
            {result.flags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      <table className="w-full max-w-md text-left tabular-nums">
        <caption className="mb-2 text-left text-sm text-muted-foreground">
          Estimated per serving
        </caption>
        <thead className="text-sm text-muted-foreground">
          <tr>
            <th className="py-1 font-normal"></th>
            <th className="py-1 font-normal">Original</th>
            <th className="py-1 font-normal">Revised</th>
          </tr>
        </thead>
        <tbody>
          {macroRows.map(({ key, label, unit }) => (
            <tr key={key} className="border-t border-border">
              <th className="py-2 font-medium">{label}</th>
              <td className="py-2">{result.before[key]}{unit}</td>
              <td className="py-2">{result.after[key]}{unit}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <h3 className="font-display text-3xl">What changed</h3>
        <ul className="mt-4 flex flex-col gap-4">
          {result.swaps.map((swap) => (
            <li key={`${swap.from}-${swap.to}`} className="border-l-2 border-primary pl-4">
              <p className="font-display text-2xl leading-snug">
                <span className="text-muted-foreground line-through decoration-1">
                  {swap.from}
                </span>{" "}
                ⟶ {swap.to}
              </p>
              <p className="mt-1 text-muted-foreground">{swap.reason}</p>
              {swap.tradeoff && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Tradeoff: {swap.tradeoff}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      {result.instructions && (
        <div>
          <h3 className="font-display text-3xl">Updated steps</h3>
          <p className="mt-3 max-w-[65ch] whitespace-pre-line leading-relaxed">
            {result.instructions}
          </p>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Nutrition figures are estimates, not medical advice.
      </p>
    </section>
  );
}
