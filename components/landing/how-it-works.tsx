import { ChartPie, Link2, Sparkles, type LucideIcon } from "lucide-react";

// A real sequence, so the steps are numbered.
const steps: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Link2,
    title: "Add or import a recipe",
    body: "Search the USDA food list and enter amounts, or paste a link to a recipe page and review what was matched.",
  },
  {
    icon: ChartPie,
    title: "See the nutrition",
    body: "Calories, protein, carbs, fat and more for each serving, updated as you change amounts or servings.",
  },
  {
    icon: Sparkles,
    title: "Ask for a lighter version",
    body: "Ask for more protein or less sodium in your own words. Every swap shows before and after, and you can undo it.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 className="mx-auto max-w-2xl text-center font-display text-[clamp(2.25rem,5vw,3rem)]">How it works</h2>
        <ol className="mt-14 grid gap-5 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="surface-paper flex flex-col rounded-card p-7">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <p className="mt-6 text-[13px] font-medium text-muted-foreground">Step {i + 1}</p>
              <h3 className="mt-1 text-[21px] font-semibold tracking-[-0.01em]">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
