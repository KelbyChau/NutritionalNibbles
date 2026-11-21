const steps = [
  {
    title: "Paste your recipe",
    body: "Drop in an ingredient list or a whole recipe. We read the amounts for you.",
  },
  {
    title: "Pick a goal",
    body: "More protein, fewer carbs, lower fat, or a calorie target per serving.",
  },
  {
    title: "Review the swaps",
    body: "See each suggested change and how it moves your macros, then keep the ones you like.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-8"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
        <h2 className="font-display text-5xl tracking-tight">
          How it works
        </h2>
        <ol className="mt-10 grid gap-10 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="w-8 shrink-0 font-display text-6xl leading-[0.8] text-primary tabular-nums">
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 max-w-[38ch] leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
