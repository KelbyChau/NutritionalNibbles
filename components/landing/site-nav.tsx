import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { Button } from "@/components/ui/button";
import { hasEnvVars } from "@/lib/utils";

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
        <ul className="hidden items-center gap-3 text-sm md:flex">
          <li>
            <Link href="#how-it-works" className="underline-offset-4 hover:underline">
              How it works
            </Link>
          </li>
          <li>
            <Button asChild size="sm" variant="outline">
              <Link href="/optimize">Optimize a recipe</Link>
            </Button>
          </li>
          <li>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </li>
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
