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

const targetFields = [
  { key: "protein", label: "Protein", dot: "bg-macro-protein" },
  { key: "carbs", label: "Carbs", dot: "bg-macro-carbs" },
  { key: "fat", label: "Fat", dot: "bg-macro-fat" },
] as const;

type Status =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "error"; message: string }
  | { state: "done"; result: OptimizeResponse };

const fieldClass =
  "h-11 rounded-xl border-border bg-background/60 text-foreground shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-macro-protein";

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

    const targets: Partial<Macros> = {};
    for (const { key } of targetFields) {
      const value = form.get(key);
      if (value) targets[key] = Number(value);
    }

    const body: OptimizeRequest = {
      name: String(form.get("name") ?? "").trim() || undefined,
      servings: Number(form.get("servings")) || 1,
      ingredients: String(form.get("ingredients") ?? "").trim(),
      instructions: String(form.get("instructions") ?? "").trim() || undefined,
      goal: form.get("goal") as Goal,
      targets: Object.keys(targets).length ? targets : undefined,
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
              One per line, with amounts. Paste straight from a recipe site.
            </p>
            <textarea
              id="ingredients"
              name="ingredients"
              required
              rows={9}
              defaultValue={initialIngredients}
              placeholder={ingredientsPlaceholder}
              aria-describedby="ingredients-hint"
              className="w-full resize-y rounded-2xl border border-border bg-background/60 p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-macro-protein"
            />
          </div>

          <details className="group rounded-2xl border border-border p-4 open:pb-5">
            <summary className="cursor-pointer text-sm font-medium marker:text-muted-foreground">
              Add steps <span className="font-normal text-muted-foreground">(optional)</span>
            </summary>
            <textarea
              id="instructions"
              name="instructions"
              rows={5}
              aria-label="Steps"
              placeholder="Boil the pasta. Sear the chicken. Simmer the cream with garlic…"
              className="mt-4 w-full resize-y rounded-xl border border-border bg-background/60 p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-macro-protein"
            />
          </details>
        </div>

        {/* Right: the goal */}
        <div className="flex flex-col gap-8">
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

          <fieldset>
            <legend className="text-sm font-medium">
              Targets per serving{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </legend>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {targetFields.map(({ key, label, dot }) => (
                <div key={key} className="flex flex-col gap-2">
                  <label
                    htmlFor={key}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground"
                  >
                    <span className={`size-2 rounded-full ${dot}`} aria-hidden />
                    {label}
                  </label>
                  <div className="relative">
                    <Input
                      id={key}
                      name={key}
                      type="number"
                      min={0}
                      max={500}
                      inputMode="numeric"
                      placeholder="–"
                      className={`${fieldClass} pr-7`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      g
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="mt-auto flex flex-col gap-3">
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

// Minimal results view so the round trip can be tested end to end.
// The full results UI can replace this.
function Results({ result }: { result: OptimizeResponse }) {
  return (
    <section aria-labelledby="results-heading" className="mt-12">
      <h2 id="results-heading" className="font-display text-4xl tracking-tight">
        Suggested swaps
      </h2>
      <ul className="mt-6 flex flex-col gap-4">
        {result.swaps.map((swap) => (
          <li key={`${swap.from}-${swap.to}`} className="border-l-2 border-primary pl-4">
            <p className="font-display text-2xl leading-snug">
              <span className="text-muted-foreground line-through decoration-1">
                {swap.from}
              </span>{" "}
              ⟶ {swap.to}
            </p>
            {swap.reason && (
              <p className="mt-1 text-muted-foreground">{swap.reason}</p>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-muted-foreground tabular-nums">
        Per serving: protein {result.before.protein}g → {result.after.protein}g,
        carbs {result.before.carbs}g → {result.after.carbs}g, fat{" "}
        {result.before.fat}g → {result.after.fat}g
      </p>
    </section>
  );
}
