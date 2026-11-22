import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MacroSwapPreview } from "./macro-swap-preview";

// Drop a dish photo in public/ (e.g. "/hero-dish.jpg") and set it here to
// show it on the yellow blob, with the macro card overlapping it.
const heroImage: string | null = null;

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-10 sm:px-6 md:grid-cols-[1.05fr_1fr] md:pb-28 md:pt-16">
      <div className="flex flex-col items-start">
        <h1 className="font-display text-[clamp(3rem,5.8vw,5.5rem)] leading-[0.9] tracking-[-0.02em]">
          <span className="block">Keep the recipe.</span>
          <span className="block">Change the macros.</span>
        </h1>
        <p className="mt-6 max-w-[34ch] font-display text-2xl leading-snug text-muted-foreground sm:text-3xl">
          Practical swaps for more protein or fewer calories, carbs or fat.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-3">
          <Button
            asChild
            size="lg"
            className="h-14 rounded-full px-8 text-base shadow-none"
          >
            <Link href="/optimize">
              Optimize a recipe
              <ArrowRight />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-14 rounded-full px-5 text-base shadow-none"
          >
            <Link href="/dashboard">
              <LayoutGrid aria-hidden="true" />
              Dashboard
            </Link>
          </Button>
          <Link
            href="#how-it-works"
            className="text-base underline underline-offset-4 decoration-foreground/40 hover:decoration-foreground"
          >
            See how it works
          </Link>
        </div>
      </div>

      <div className="relative">
        {/* Yellow blob, bleeding off the right edge like a plate on a tablecloth */}
        <div
          aria-hidden
          className="absolute -right-24 -top-10 bottom-[-6rem] left-6 rounded-[58%_42%_47%_53%/45%_52%_48%_55%] bg-primary md:-right-40"
        />
        {heroImage ? (
          <div className="relative">
            <Image
              src={heroImage}
              alt=""
              width={720}
              height={720}
              priority
              className="aspect-square w-full rounded-full object-cover"
            />
            <div className="relative -mt-24 ml-auto w-[85%]">
              <MacroSwapPreview />
            </div>
          </div>
        ) : (
          <div className="relative md:rotate-[-2deg]">
            <MacroSwapPreview />
          </div>
        )}
      </div>
    </section>
  );
}
