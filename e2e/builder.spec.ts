import { expect, test } from "@playwright/test";
import { settledNumber, waitForCatalog } from "./helpers";

test("add an ingredient from search and see nutrition follow the servings", async ({ page }) => {
  await page.goto("/optimize");
  const add = page.getByRole("combobox", { name: "Add an ingredient" });
  await waitForCatalog(page);
  await add.fill("200g asparagus");
  await page.getByRole("listbox", { name: "Suggestions" }).getByRole("option").first().click();

  const ingredients = page.getByRole("complementary", { name: "Ingredients" });
  await expect(ingredients).toContainText("Asparagus");
  const nutrition = page.getByRole("complementary", { name: "Estimated nutrition" });
  await expect(nutrition).toContainText("1 of 1 ingredients counted");

  const calories = nutrition.locator(".font-display.text-5xl");
  const before = await settledNumber(calories);
  expect(before).toBeGreaterThan(0);
  await page.getByRole("button", { name: "More servings" }).click();
  expect(await settledNumber(calories)).toBeLessThan(before);
});
