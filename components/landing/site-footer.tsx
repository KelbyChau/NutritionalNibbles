import { ThemeSwitcher } from "@/components/theme-switcher";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 text-[12px] text-muted-foreground sm:px-6">
        <p>NutritionalNibbles. Nutrition figures are estimates from USDA data, not medical advice.</p>
        <ThemeSwitcher />
      </div>
    </footer>
  );
}
