// Every USDA food the app can use, from both catalogs: Foundation Foods
// (newer data, listed first so it wins ties in search) and SR Legacy
// (~7,800 more, including brand-name foods). One list, one search field.
//
// It's about 2 MB, so it's downloaded once per browser tab and shared by
// the recipe builder and the optimizer chat instead of once per page.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FoundationFood } from "./foundation-foods";

const PAGE = 1000; // Supabase returns at most 1,000 rows per request

// Only what the app reads (search, labels, nutrition math, swaps).
export const USDA_FOOD_COLUMNS =
  "fdc_id, description, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, total_sugars_g_per_100g, sodium_mg_per_100g";

let catalog: Promise<FoundationFood[]> | null = null;

export function loadUsdaCatalog(supabase: SupabaseClient): Promise<FoundationFood[]> {
  catalog ??= fetchCatalog(supabase).catch((error: unknown) => {
    catalog = null; // a failed load is retried, not cached
    throw error;
  });
  return catalog;
}

// Tests start each case with an empty cache.
export function resetUsdaCatalog() {
  catalog = null;
}

async function fetchCatalog(supabase: SupabaseClient): Promise<FoundationFood[]> {
  const [foundation, legacyCount] = await Promise.all([
    supabase.from("foundation_foods").select(USDA_FOOD_COLUMNS).order("fdc_id"),
    supabase.from("sr_legacy_foods").select("fdc_id", { count: "exact", head: true }),
  ]);
  if (foundation.error || !foundation.data?.length || legacyCount.error)
    throw new Error("Catalog unavailable");
  const pages = await Promise.all(
    Array.from({ length: Math.ceil((legacyCount.count ?? 0) / PAGE) }, (_, i) =>
      supabase
        .from("sr_legacy_foods")
        .select(USDA_FOOD_COLUMNS)
        .order("fdc_id")
        .range(i * PAGE, (i + 1) * PAGE - 1),
    ),
  );
  if (pages.some((page) => page.error)) throw new Error("Catalog unavailable");
  return [
    ...(foundation.data as FoundationFood[]).map((f) => ({ ...f, source: "foundation" as const })),
    ...pages
      .flatMap((page) => (page.data ?? []) as FoundationFood[])
      .map((f) => ({ ...f, source: "sr_legacy" as const })),
  ];
}
