import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NutritionRings } from "@/components/nutrition-rings";
import { cn } from "@/lib/utils";
import { sampleDish, sampleRings } from "./sample-dish";
import { focusRing } from "./site-nav";

// Centered, product-page hero. The one visual is a real recipe's nutrition
// rings, which fill once when the page opens.
export function Hero() {
  return (
    <section className="px-4 pb-20 pt-16 sm:px-6 md:pb-28 md:pt-24">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <h1 className="font-display text-[clamp(3rem,7.5vw,5rem)]">Know what’s in every recipe.</h1>
        <p className="mt-6 max-w-[34ch] text-[clamp(1.25rem,2.2vw,1.625rem)] leading-snug text-muted-foreground">
          Paste a link or add ingredients. See the nutrition, then make it better.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
          <Button asChild size="lg">
            <Link href="/optimize">Create a recipe</Link>
          </Button>
          <Link
            href="#how-it-works"
            className={cn("px-2 py-2 text-[17px] text-primary hover:underline hover:underline-offset-4", focusRing)}
          >
            See how it works
          </Link>
        </div>
      </div>

      <figure className="mx-auto mt-16 flex max-w-3xl flex-col items-center md:mt-20">
        <div className="surface-paper flex w-full flex-col items-center gap-10 rounded-panel px-6 py-10 sm:px-12 md:flex-row md:gap-14 md:py-12">
          <NutritionRings rings={sampleRings} size={260} stroke={22} gap={5} showLegend={false} testId="rings-hero" />
          <NutritionRingsLegend />
        </div>
        <figcaption className="mt-4 text-[13px] text-muted-foreground">
          {sampleDish.title}, per serving. USDA values, computed by the app.
        </figcaption>
      </figure>
    </section>
  );
}

function NutritionRingsLegend() {
  return (
    <dl className="grid w-full max-w-xs grid-cols-2 gap-x-8 gap-y-6 text-left">
      {sampleRings.map((ring) => (
        <div key={ring.key}>
          <dt className="flex items-center gap-2 text-[15px] text-muted-foreground">
            <span className="size-2.5 rounded-full" style={{ background: `hsl(var(--nutrient-${ring.key}))` }} />
            {ring.label}
          </dt>
          <dd className="mt-1 font-rounded text-3xl font-semibold tabular-nums">
            {ring.unit === "kcal" ? Math.round(ring.value ?? 0) : Math.round((ring.value ?? 0) * 10) / 10}
            <span className="ml-1 text-base font-medium text-muted-foreground">{ring.unit}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
