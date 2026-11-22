import { execSync } from "node:child_process";
import { expect, type Locator, type Page } from "@playwright/test";

const DRAFT_KEY = "nutritionalnibbles:optimize-draft";

export const steak = {
  fdc_id: 2727574, description: "Beef, top sirloin steak, raw", kcal_per_100g: 146,
  protein_per_100g: 22, carbs_per_100g: 0.218, fat_per_100g: 5.71,
  total_sugars_g_per_100g: null, sodium_mg_per_100g: 42.8, source: "foundation",
};
// An SR Legacy food, so both catalogs are exercised.
export const asparagus = {
  fdc_id: 168389, description: "Asparagus, raw", kcal_per_100g: 20, protein_per_100g: 2.2,
  carbs_per_100g: 3.88, fat_per_100g: 0.12, total_sugars_g_per_100g: 1.88, sodium_mg_per_100g: 2,
  source: "sr_legacy",
};

export function draftOf(title: string, servings = 2) {
  const list = [
    { id: 1, name: "Beef (top sirloin steak, raw)", food: steak, amount: "400", unit: "g" },
    { id: 2, name: "Asparagus (raw)", food: asparagus, amount: "200", unit: "g" },
  ];
  return { title, servings, original: list, current: list };
}

// Hands a recipe to the builder/chat the same way the builder does. Seeded
// from the home page: a plain /optimize visit clears any draft on load.
export async function seedDraft(page: Page, draft: ReturnType<typeof draftOf>) {
  await page.goto("/");
  await page.evaluate(([key, value]) => sessionStorage.setItem(key, value), [DRAFT_KEY, JSON.stringify(draft)]);
}

// Runs SQL in the local Supabase database container (test cleanup only).
export function localSql(sql: string) {
  execSync(`docker exec -i supabase_db_nutritionalnibbles psql -U postgres -d postgres -At`, { input: sql });
}

export async function bodyText(page: Page) {
  return page.locator("body").innerText();
}

// The USDA food list loads in the background; matching and search need it.
// The chat page shows no loading message, so also wait for the requests to finish.
export async function waitForCatalog(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 60_000 });
  await expect(page.getByText("Loading USDA ingredients…")).toHaveCount(0, { timeout: 60_000 });
}

// Numbers count up in an animation, so read one only once it stops changing.
export async function settledNumber(locator: Locator) {
  let last = NaN;
  await expect.poll(async () => {
    const now = Number((await locator.innerText()).replace(/[^\d.]/g, ""));
    const settled = now === last;
    last = now;
    return settled;
  }, { intervals: [400] }).toBe(true);
  return last;
}
