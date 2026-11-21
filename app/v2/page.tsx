import { SiteNav } from "@/components/landing/site-nav";
import { HeroPaste, RecipeBox } from "@/components/landing/hero-paste";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SiteFooter } from "@/components/landing/site-footer";

// Second landing page version (recipe box in the hero), for comparing
// against "/". Whichever the team picks becomes app/page.tsx.
export default function HomeV2() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="surface-cobalt relative overflow-hidden">
        <SiteNav />
        <HeroPaste />
      </div>
      <main className="flex-1">
        <RecipeBox />
        <HowItWorks />
      </main>
      <SiteFooter />
    </div>
  );
}
