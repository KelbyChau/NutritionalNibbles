import { NutritionRings } from "@/components/nutrition-rings";
import { swapShowcase } from "./sample-dish";

// The black band: one real swap, before and after, as rings.
export function SwapShowcase() {
  const s = swapShowcase;
  return (
    <section className="surface-band px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="mx-auto max-w-[18ch] font-display text-[clamp(2.25rem,5vw,3.5rem)]">
          Lighter, without starting over.
        </h2>
        <p className="mx-auto mt-5 max-w-[46ch] text-[clamp(1.125rem,2vw,1.375rem)] leading-snug text-muted-foreground">
          {s.from} to {s.to} in {s.title.toLowerCase()}: {s.calorieCut} fewer calories,
          {" "}{s.fatCut} g less fat and {s.proteinGain} g more protein per serving.
        </p>
        <div className="mt-14 grid items-center gap-10 sm:grid-cols-2">
          {[
            { label: `With ${s.from.toLowerCase()}`, rings: s.before, id: "rings-before-showcase" },
            { label: `With ${s.to}`, rings: s.after, id: "rings-after-showcase" },
          ].map(({ label, rings, id }) => (
            <figure key={id} className="flex flex-col items-center gap-5">
              <NutritionRings rings={rings} size={220} stroke={18} gap={4} showLegend={false} testId={id} />
              <figcaption className="text-[17px] font-medium">{label}</figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-10 text-[13px] text-muted-foreground">
          Chicken alfredo for 4. Rings fill to the daily value per serving.
        </p>
      </div>
    </section>
  );
}
