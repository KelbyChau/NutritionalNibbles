import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { focusRing } from "./site-nav";

// Last stop before the footer: one clear way in, plus saved recipes.
export function ClosingCta() {
  return (
    <section className="px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <h2 className="font-display text-[clamp(2.25rem,5vw,3.5rem)]">Try it with a recipe you already make.</h2>
        <p className="mt-5 text-[clamp(1.125rem,2vw,1.375rem)] text-muted-foreground">
          Start with a few ingredients. You can add the rest later.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
          <Button asChild size="lg">
            <Link href="/optimize">Create a recipe</Link>
          </Button>
          <Link href="/dashboard" className={cn("px-2 py-2 text-[17px] text-primary hover:underline hover:underline-offset-4", focusRing)}>
            View saved recipes
          </Link>
        </div>
      </div>
    </section>
  );
}
