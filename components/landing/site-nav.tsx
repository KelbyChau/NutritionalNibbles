import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { cn, hasEnvVars } from "@/lib/utils";

// Keyboard focus ring for links on the landing page.
export const focusRing =
  "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "/optimize", label: "Create a recipe" },
  { href: "/dashboard", label: "Saved recipes" },
];

// Frosted, sticky bar: content scrolls underneath it.
export function SiteNav() {
  return (
    <header className="surface-glass sticky top-0 z-40 w-full border-b border-border/60">
      {/* Phones: brand + account on the first row, links on a second row. */}
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 sm:px-6 md:h-14 md:flex-nowrap md:py-0">
        <Link href="/" className={cn("shrink-0 text-[19px] font-semibold tracking-[-0.01em]", focusRing)}>
          NutritionalNibbles
        </Link>
        <ul className="order-last flex w-full items-center gap-6 text-[13px] text-foreground/80 md:order-none md:w-auto md:gap-8">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={cn("inline-block py-2 transition-colors hover:text-foreground", focusRing)}>
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
