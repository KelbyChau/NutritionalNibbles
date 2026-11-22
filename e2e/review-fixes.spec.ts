// Problems found in the final review of the redesign, pinned as tests.
import { expect, test } from "@playwright/test";
import { pages } from "./pages";

test.describe("phone chat", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("a new reply isn't hidden under the input bar", async ({ page }) => {
    await pages.find((p) => p.name === "chat")!.open(page);
    const box = page.getByRole("combobox", { name: "Tell the optimizer what to change" });
    // Enough messages that the page scrolls; the newest reply is last.
    for (const n of [3, 4, 5, 6, 7]) {
      await box.fill(`${n} servings`);
      await box.press("Enter");
      await expect(page.getByText(`Now ${n} servings.`)).toBeVisible();
    }
    const reply = page.getByText("Now 7 servings.");
    await expect(reply).toBeVisible();
    await page.waitForTimeout(600); // let the smooth scroll finish
    const covered = await reply.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !hit || !el.contains(hit);
    });
    expect(covered).toBe(false);
  });
});

// A focus ring in the same green as a green control needs a gap (ring
// offset) around it, or it just looks like a bigger control.
async function keyboardFocus(page: import("@playwright/test").Page, el: import("@playwright/test").Locator) {
  await el.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(el).toBeFocused();
  await page.waitForTimeout(400); // shadows animate
}
// The first shadow is the ring offset: its spread must be wider than 0.
const offsetRing = (el: Element) => /^rgba?\([^)]*\) 0px 0px 0px [1-9]/.test(getComputedStyle(el).boxShadow);

test("keyboard focus rings have a visible gap on the dashboard", async ({ page }) => {
  await pages.find((p) => p.name === "dashboard")!.open(page);
  const card = page.getByRole("button", { name: /^Open .* in the recipe builder$/ }).nth(1);
  await keyboardFocus(page, card);
  expect(await card.evaluate(offsetRing)).toBe(true);
  const category = page.getByRole("button", { name: "Recipes", pressed: true });
  await keyboardFocus(page, category);
  expect(await category.locator("span").first().evaluate(offsetRing)).toBe(true);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("the landing rings don't animate", async ({ page }) => {
    await page.goto("/");
    // Once the page's JavaScript has read the setting, nothing may move.
    const rings = page.getByTestId("rings-hero");
    await expect(rings).toHaveAttribute("data-animate", "false");
    const arc = rings.locator("circle").nth(1); // first progress arc
    await page.waitForTimeout(50);
    const early = await arc.getAttribute("stroke-dasharray");
    await page.waitForTimeout(800);
    const late = await arc.getAttribute("stroke-dasharray");
    expect(early).toBe(late);
    expect(early).not.toBe("0 1"); // drawn filled, not empty
  });
});
