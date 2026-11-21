// Static example for the landing page. Once /api/optimize exists, this
// same shape can be filled from a real response.
const example = {
  recipe: "Chicken alfredo, 1 serving",
  swap: { from: "Heavy cream", to: "Greek yogurt + pasta water" },
  before: { protein: 38, carbs: 62, fat: 41 },
  after: { protein: 52, carbs: 60, fat: 16 },
};

const macros = [
  { key: "protein", label: "Protein", color: "bg-macro-protein" },
  { key: "carbs", label: "Carbs", color: "bg-macro-carbs" },
  { key: "fat", label: "Fat", color: "bg-macro-fat" },
] as const;

const scaleMax = 70; // grams; keeps bar widths comparable across macros

export function MacroSwapPreview() {
  return (
    <figure className="surface-paper rounded-3xl bg-card p-6 shadow-[0_24px_48px_-24px_hsl(230_60%_15%/0.45)] sm:p-8">
      <figcaption className="text-sm text-muted-foreground">
        {example.recipe}
      </figcaption>

      <p className="mt-2 font-display text-3xl leading-tight">
        <span className="text-muted-foreground line-through decoration-1">
          {example.swap.from}
        </span>{" "}
        <span aria-hidden>⟶</span>
        <span className="sr-only">swapped for</span>{" "}
        {example.swap.to}
      </p>

      <dl className="mt-8 flex flex-col gap-5">
        {macros.map(({ key, label, color }) => {
          const before = example.before[key];
          const after = example.after[key];
          const diff = after - before;
          return (
            <div key={key}>
              <div className="flex items-baseline justify-between text-sm">
                <dt className="font-medium">{label}</dt>
                <dd className="tabular-nums text-muted-foreground">
                  {before}g → <span className="text-foreground">{after}g</span>{" "}
                  ({diff > 0 ? "+" : ""}
                  {diff}g)
                </dd>
              </div>
              <div className="mt-2 flex flex-col gap-1" aria-hidden>
                <div className="h-1.5 rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${color} opacity-30`}
                    style={{ width: `${(before / scaleMax) * 100}%` }}
                  />
                </div>
                <div className="h-2.5 rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${(after / scaleMax) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </dl>

      <p className="mt-6 text-xs text-muted-foreground">
        Thin bar: original recipe. Thick bar: after the swap.
      </p>
    </figure>
  );
}
