import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { focusRing } from "./site-nav";

// Last stop before the footer: one more clear way in, plus a route back to
// recipes already saved.
export function ClosingCta() {
  return (
    <section className="px-4 pb-20 sm:px-6 md:pb-28">
      <div className="surface-band relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-12 sm:px-12 md:py-16">
        <div
          aria-hidden
          // Hidden on phones, where it would sit behind the links.
          className="absolute -bottom-24 -right-16 hidden h-64 w-64 rounded-[58%_42%_47%_53%/45%_52%_48%_55%] bg-primary opacity-90 sm:block md:h-80 md:w-80"
        />
        <div className="relative max-w-xl">
          <h2 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">
            Try it with a recipe you already make.
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
            Start with a few ingredients. You can add the rest later.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
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
              href="/dashboard"
              className={cn(
                "inline-flex h-14 items-center justify-center rounded-full px-6 text-base underline decoration-foreground/40 underline-offset-4 hover:decoration-foreground",
                focusRing,
              )}
            >
              View saved recipes
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
