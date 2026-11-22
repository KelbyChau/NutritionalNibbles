import { expect, test } from "@playwright/test";
import { waitForCatalog } from "./helpers";

test("import a recipe link, combine repeated foods, and fill the builder", async ({ page }) => {
  await page.route("**/api/recipe-import", (route) => route.fulfill({
    json: {
      recipe: {
        title: "E2E Cake", servings: 2, image: null, sourceUrl: "https://example.com/cake",
        ingredients: ["2 tbsp salted butter", "1 cup all-purpose flour", "1 tbsp salted butter"],
      },
    },
  }));
  await page.goto("/optimize");
  await waitForCatalog(page);
  await page.getByRole("button", { name: "Import a recipe" }).click();
  await page.locator("#recipe-import-url").fill("example.com/cake"); // no https://
  await page.getByRole("button", { name: "Find recipe" }).click();

  const footer = page.locator("dialog footer");
  await expect(footer).toContainText("2 lines are the same food, so they’re combined into one ingredient.");
  await expect(footer).toContainText("2 ingredients will be added");
  await page.getByRole("button", { name: /Add to recipe|Replace recipe/ }).click();

  await expect(page.getByLabel("Dish name")).toHaveValue("E2E Cake");
  await expect(page.getByText("New Recipe")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Estimated nutrition" })).toContainText("2 of 2 ingredients counted");
});
