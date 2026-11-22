// The import review sheet, opened with a mocked recipe page.
import { test } from "@playwright/test";
import { waitForCatalog } from "../e2e/helpers";

for (const [width, theme] of [[1440, "light"], [1440, "dark"], [390, "light"]] as const) {
  test(`import ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 500 ? 1000 : 844 });
    await page.emulateMedia({ colorScheme: theme });
    await page.route("**/api/recipe-import", (route) => route.fulfill({
      json: { recipe: {
        title: "Skillet chicken", servings: 4, image: null, sourceUrl: "https://example.com/skillet-chicken",
        ingredients: ["4 boneless, skinless chicken breasts", "2 tbsp salted butter", "1 tsp crushed red pepper flakes",
          "3/4 c. low-sodium chicken broth", "1 tbsp salted butter", "Kosher salt"],
      } },
    }));
    await page.goto("/optimize");
    await waitForCatalog(page);
    await page.getByRole("button", { name: "Import a recipe" }).click();
    await page.locator("#recipe-import-url").fill("example.com/skillet-chicken");
    await page.getByRole("button", { name: "Find recipe" }).click();
    await page.getByText("Review import").waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `screenshots/import-${width}-${theme}.png` });
  });
}
