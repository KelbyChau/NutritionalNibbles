import { SiteNav } from "@/components/landing/site-nav";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SwapShowcase } from "@/components/landing/swap-showcase";
import { ClosingCta } from "@/components/landing/closing-cta";
import { SiteFooter } from "@/components/landing/site-footer";

// Landing page, product-page style. Each section lives in components/landing/.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <SwapShowcase />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
