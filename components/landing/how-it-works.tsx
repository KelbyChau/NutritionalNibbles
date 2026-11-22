import { ArrowLeftRight, Search, Target, type LucideIcon } from "lucide-react";

// The real flow: build the recipe from USDA ingredients, choose a goal on
// the optimize page, then apply swaps and compare.
const steps: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Search,
    title: "Add your ingredients",
    body: "Search the USDA food list, enter amounts, and set how many servings the recipe makes. Calories and macros update as you go.",
  },
  {
    icon: Target,
    title: "Pick a goal",
    body: "More protein, fewer calories, fewer carbs or less fat. You can also ask for a change in your own words.",
  },
  {
    icon: ArrowLeftRight,
    title: "Swap and compare",
    body: "Apply the swaps you like and see before and after per serving, with a note on taste or texture. Undo anything, then save the recipe.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-8">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
          How it works
        </h2>
        <p className="mt-3 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
          Three steps. Your recipe stays yours: every change is shown before
          you keep it.
        </p>

        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="flex flex-col">
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-semibold">{title}</h3>
              <p className="mt-2 max-w-[40ch] leading-relaxed text-muted-foreground">
                {body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
