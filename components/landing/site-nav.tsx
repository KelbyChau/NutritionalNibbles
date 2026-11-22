import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { hasEnvVars } from "@/lib/utils";

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "/optimize", label: "Optimize a recipe" },
  { href: "/dashboard", label: "Dashboard" },
];

export function SiteNav() {
  return (
    <header className="relative z-10 w-full">
      <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 font-display text-3xl leading-none tracking-tight"
        >
          NutritionalNibbles
        </Link>
        <ul className="hidden items-center gap-8 text-sm md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="underline-offset-4 hover:underline"
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
