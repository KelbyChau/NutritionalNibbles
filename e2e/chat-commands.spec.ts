// Pins every chat command's reply on today's code, so the command parser
// can be pulled out of the chat component without changing what it says.
import { expect, test, type Page } from "@playwright/test";
import { draftOf, seedDraft, waitForCatalog } from "./helpers";

async function openChat(page: Page) {
  await seedDraft(page, draftOf("E2E Commands", 2));
  await page.goto("/optimize/chat");
  await waitForCatalog(page);
}

async function send(page: Page, message: string) {
  const box = page.getByRole("combobox", { name: "Tell the optimizer what to change" });
  await box.fill(message);
  await box.press("Enter");
}

const recipe = (page: Page) => page.getByRole("complementary", { name: "Your recipe" });

test("undo with nothing to undo", async ({ page }) => {
  await openChat(page);
  await send(page, "undo");
  await expect(page.getByText("Nothing to undo.")).toBeVisible();
});

test("use half of an ingredient", async ({ page }) => {
  await openChat(page);
  await send(page, "use half the steak");
  await expect(page.getByText("Changed beef (top sirloin steak, raw).")).toBeVisible();
  await expect(recipe(page)).toContainText("200 g");
});

test("change an amount", async ({ page }) => {
  await openChat(page);
  await send(page, "change asparagus to 100 g");
  await expect(page.getByText("Asparagus (raw) is now 100 g.")).toBeVisible();
});

test("add an ingredient, then refuse adding it twice", async ({ page }) => {
  await openChat(page);
  await send(page, "add 100 g spinach");
  await expect(page.getByText(/^Added 100 g spinach/i)).toBeVisible();
  await expect(recipe(page)).toContainText("New");
  await send(page, "add 100 g spinach");
  await expect(page.getByText(/is already in the recipe\. Change its amount instead of adding it again\./)).toBeVisible();
});

test("swap an ingredient for a named food", async ({ page }) => {
  await openChat(page);
  await send(page, "swap asparagus for broccoli");
  await expect(page.getByText(/^Swapped asparagus \(raw\) for broccoli/i)).toBeVisible();
  await expect(recipe(page)).toContainText("Swapped");
});

test("an ingredient that isn't in the recipe", async ({ page }) => {
  await openChat(page);
  await send(page, "remove garlic");
  await expect(page.getByText("I don't see “garlic” in the recipe.")).toBeVisible();
});

test("set servings with a phrase", async ({ page }) => {
  await openChat(page);
  await send(page, "make it 5 servings");
  await expect(page.getByText("Now 5 servings.")).toBeVisible();
});

test("anything else gets the help text", async ({ page }) => {
  await openChat(page);
  await send(page, "hello there");
  await expect(page.getByText(/^I can make these changes right now:/)).toBeVisible();
});
