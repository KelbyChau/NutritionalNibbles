import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MacroSwapPreview } from "./macro-swap-preview";
import { focusRing } from "./site-nav";

// What a visitor gets, in plain words. Each one is true of the app today.
const reassurances = [
  "Nutrition from USDA food data",
  "Before and after for every swap",
  "Undo any change",
];

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-8 sm:px-6 md:grid-cols-[1.05fr_1fr] md:gap-14 md:pb-28 md:pt-14">
      <div className="flex flex-col items-start">
        <h1 className="font-display text-[clamp(2.75rem,5.8vw,5.5rem)] leading-[0.92] tracking-[-0.02em]">
          <span className="block">Keep the recipe.</span>
          <span className="block">Change the macros.</span>
        </h1>
        <p className="mt-5 max-w-[36ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Add the ingredients you already cook with, pick a goal, and get
          practical swaps for more protein or fewer calories, carbs or fat.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
          <Button
            asChild
            size="lg"
            className="h-14 rounded-full px-8 text-base shadow-none"
          >
            <Link href="/optimize">
              Create a recipe
              <ArrowRight />
            </Link>
          </Button>
          <Link
            href="#how-it-works"
            className={cn(
              "inline-flex h-14 items-center justify-center rounded-full px-6 text-base underline decoration-foreground/40 underline-offset-4 hover:decoration-foreground",
              focusRing,
            )}
          >
            See how it works
          </Link>
        </div>

        <ul className="mt-8 flex flex-col gap-2.5 text-sm sm:text-base">
          {reassurances.map((text) => (
            <li key={text} className="flex items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[hsl(45_84%_72%)] text-[hsl(230_50%_16%)]">
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative">
        {/* Yellow blob, bleeding off the right edge like a plate on a tablecloth */}
        <div
          aria-hidden
          className="absolute -right-24 -top-10 bottom-[-6rem] left-6 rounded-[58%_42%_47%_53%/45%_52%_48%_55%] bg-primary md:-right-40"
        />
        <div className="relative md:rotate-[-2deg]">
          <MacroSwapPreview />
        </div>
      </div>
    </section>
  );
}
