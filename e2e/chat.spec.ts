import { expect, test } from "@playwright/test";
import { draftOf, seedDraft, settledNumber, waitForCatalog } from "./helpers";

test("chat servings, undo and reset keep the Before → Now table in step", async ({ page }) => {
  await seedDraft(page, draftOf("E2E Steak", 2));
  await page.goto("/optimize/chat");
  await waitForCatalog(page);
  const table = page.locator("section", { hasText: "Before → Now" }).first();
  await expect(table).toContainText("kcal", { timeout: 30_000 });
  const startText = await table.innerText();

  const box = page.getByRole("combobox", { name: "Tell the optimizer what to change" });
  await box.fill("3 servings");
  await box.press("Enter");
  await expect(page.getByText("Now 3 servings.")).toBeVisible();
  await expect(table).not.toHaveText(startText);

  await box.fill("remove asparagus");
  await box.press("Enter");
  // A removed ingredient stays listed, labelled "Removed", until undone.
  const recipe = page.getByRole("complementary", { name: "Your recipe" });
  await expect(recipe).toContainText("Removed");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(recipe).not.toContainText("Removed");

  await box.fill("reset");
  await box.press("Enter");
  await expect(page.getByText("Back to your original recipe.")).toBeVisible();

  // Builder and back: the same foods and numbers (catalog loaded once per tab).
  const panel = page.getByRole("complementary", { name: "Estimated nutrition" });
  const calories = panel.locator(".font-display.text-5xl");
  const before = await settledNumber(calories);
  await page.getByRole("link", { name: "Edit ingredients" }).click();
  await expect(page.getByRole("complementary", { name: "Ingredients" })).toContainText("Asparagus");
  await page.getByRole("button", { name: /optimize/i }).first().click();
  await expect(page).toHaveURL(/\/optimize\/chat/);
  await expect(panel).toContainText("3 servings per recipe · 2 of 2 ingredients counted");
  expect(await settledNumber(calories)).toBe(before);
});
