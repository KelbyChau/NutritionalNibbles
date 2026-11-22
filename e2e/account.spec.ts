import { expect, test } from "@playwright/test";
import { bodyText, draftOf, localSql, seedDraft } from "./helpers";

const email = `e2e-${Date.now()}@example.invalid`;
const password = "test-password-123";

test.afterAll(() => {
  localSql(`delete from public.recipes where title = 'E2E Saved Steak';
            delete from auth.users where email like 'e2e-%@example.invalid';`);
});

test("sign up, save a recipe, and see it after logging in again", async ({ page, browser }) => {
  await page.goto("/auth/sign-up");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.fill("#repeat-password", password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await seedDraft(page, draftOf("E2E Saved Steak"));
  await page.goto("/optimize?draft=1");
  await expect(page.getByLabel("Dish name")).toHaveValue("E2E Saved Steak", { timeout: 30_000 });
  await page.getByRole("button", { name: /save recipe/i }).first().click();
  await expect(page.getByRole("button", { name: /saved/i }).first()).toBeVisible();
  await page.goto("/dashboard");
  await expect.poll(() => bodyText(page)).toContain("E2E Saved Steak");

  const fresh = await (await browser.newContext()).newPage();
  await fresh.goto("/auth/login");
  await fresh.fill("#email", email);
  await fresh.fill("#password", password);
  await fresh.getByRole("button", { name: "Login" }).click();
  await expect(fresh).toHaveURL(/\/dashboard/);
  await expect.poll(() => bodyText(fresh)).toContain("E2E Saved Steak");
});
