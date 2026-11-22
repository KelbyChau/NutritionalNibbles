import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { cn, hasEnvVars } from "@/lib/utils";

// Butter-yellow keyboard focus ring; reads on the cobalt hero.
export const focusRing =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(45_84%_72%)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent";

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "/optimize", label: "Create a recipe" },
  { href: "/dashboard", label: "Saved recipes" },
];

export function SiteNav() {
  return (
    <header className="relative z-10 w-full">
      {/* Phones: brand + account on the first row, links on a second row.
          md and up: one 80px row. */}
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 pb-2 pt-5 sm:px-6 md:h-20 md:flex-nowrap md:py-0">
        <Link
          href="/"
          className={cn(
            "shrink-0 font-display text-3xl leading-none tracking-tight",
            focusRing,
          )}
        >
          NutritionalNibbles
        </Link>
        <ul className="order-last flex w-full items-center gap-6 text-sm md:order-none md:w-auto md:gap-8">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                // py-3 gives a ~44px tap target without changing the look.
                className={cn(
                  "inline-block py-3 underline-offset-4 hover:underline",
                  focusRing,
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="text-sm">
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense>
              <AuthButton />
            </Suspense>
          )}
        </div>
      </nav>
    </header>
  );
}
