import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Second hero version: the recipe box is right on the landing page.
// The form submits to /optimize as ?recipe=...&goal=..., so the optimize
// page can read searchParams.recipe and searchParams.goal.
const goals = [
  { value: "more-protein", label: "More protein" },
  { value: "fewer-calories", label: "Fewer calories" },
  { value: "fewer-carbs", label: "Fewer carbs" },
  { value: "less-fat", label: "Less fat" },
];

const examplePlaceholder = `Chicken alfredo (serves 4)
12 oz fettuccine
2 chicken breasts
1 cup heavy cream
4 tbsp butter
1 cup grated parmesan
3 cloves garlic`;

export function HeroPaste() {
  return (
    <section className="relative">
      <div
        aria-hidden
        className="absolute -right-32 top-8 hidden h-[26rem] w-[26rem] rounded-[58%_42%_47%_53%/45%_52%_48%_55%] bg-primary md:block"
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-40 pt-10 sm:px-6 md:pb-48 md:pt-16">
        <h1 className="font-display text-[clamp(3rem,7vw,6rem)] leading-[0.9] tracking-[-0.02em]">
          <span className="block">Paste a recipe.</span>
          <span className="block">Get better macros.</span>
        </h1>
        <p className="mt-6 max-w-[40ch] font-display text-2xl leading-snug text-muted-foreground sm:text-3xl">
          We suggest ingredient swaps and show what each one does to your
          calories, protein, carbs and fat.
        </p>
      </div>
    </section>
  );
}

export function RecipeBox() {
  return (
    <div className="relative z-10 mx-auto -mt-32 max-w-5xl px-4 sm:px-6 md:-mt-40">
      <form
        action="/optimize"
        method="get"
        className="surface-paper grid gap-8 rounded-3xl bg-card p-6 shadow-[0_24px_48px_-24px_hsl(230_60%_15%/0.45)] sm:p-8 md:grid-cols-[1.4fr_1fr]"
      >
        <div className="flex flex-col">
          <label htmlFor="recipe" className="font-display text-3xl leading-tight">
            Your recipe
          </label>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingredients with amounts work best. Steps are optional.
          </p>
          <textarea
            id="recipe"
            name="recipe"
            required
            rows={8}
            placeholder={examplePlaceholder}
            className="mt-4 w-full flex-1 resize-y rounded-2xl border border-border bg-background/60 p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-macro-protein"
          />
        </div>

        <div className="flex flex-col">
          <fieldset>
            <legend className="font-display text-3xl leading-tight">
              Your goal
            </legend>
            <div className="mt-4 flex flex-wrap gap-2">
              {goals.map((goal, i) => (
                <label key={goal.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="goal"
                    value={goal.value}
                    defaultChecked={i === 0}
                    className="peer sr-only"
                  />
                  <span className="inline-flex h-10 items-center rounded-full border border-border px-4 text-sm transition-colors hover:border-foreground/40 peer-checked:border-macro-protein peer-checked:bg-macro-protein peer-checked:text-card peer-focus-visible:ring-2 peer-focus-visible:ring-macro-protein peer-focus-visible:ring-offset-2">
                    {goal.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mb-6 mt-8 rounded-2xl bg-muted/70 p-4 text-sm leading-relaxed">
            <p className="font-medium">
              Example swap{" "}
              <span className="font-normal text-muted-foreground">
                (illustrative numbers)
              </span>
            </p>
            <p className="mt-1 text-muted-foreground">
              Heavy cream to Greek yogurt in chicken alfredo: protein{" "}
              <span className="text-foreground">+14g</span>, fat{" "}
              <span className="text-foreground">−25g</span> per serving.
            </p>
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-14 w-full rounded-full bg-[hsl(45_84%_72%)] text-base text-[hsl(230_50%_16%)] shadow-none hover:bg-[hsl(45_84%_66%)] md:mt-auto"
          >
            Optimize
            <ArrowRight />
          </Button>
        </div>
      </form>
    </div>
  );
}
