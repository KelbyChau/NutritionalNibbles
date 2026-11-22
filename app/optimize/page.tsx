import Link from "next/link";
import { FoundationFoodPicker } from "@/components/foundation-food-picker";

export default function OptimizePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-4 py-12">
      <h1 className="font-display text-5xl tracking-tight">
        Optimize a recipe
      </h1>
      <p className="text-muted-foreground">Start with the ingredients you have. Search USDA Foundation Foods and select the ones you want to use.</p>
      <FoundationFoodPicker />
      <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
        Back to home
      </Link>
    </main>
  );
}
