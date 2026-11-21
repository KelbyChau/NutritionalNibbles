import { ThemeSwitcher } from "@/components/theme-switcher";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <p>NutritionalNibbles. Nutrition data from USDA FoodData Central.</p>
        <ThemeSwitcher />
      </div>
    </footer>
  );
}
