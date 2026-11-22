import { SiteNav } from "@/components/landing/site-nav";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ClosingCta } from "@/components/landing/closing-cta";
import { SiteFooter } from "@/components/landing/site-footer";

// Landing page. Each section lives in components/landing/ — add new
// sections there and drop them into this list.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="surface-cobalt overflow-hidden">
        <SiteNav />
        <Hero />
      </div>
      <main className="flex-1">
        <HowItWorks />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
