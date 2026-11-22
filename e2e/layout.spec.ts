import { expect, test } from "@playwright/test";
import { draftOf, seedDraft, waitForCatalog } from "./helpers";
import { pages } from "./pages";

test.describe("phone width", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const spec of pages) {
    test(`${spec.name} doesn't scroll sideways on a phone`, async ({ page }) => {
      await spec.open(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("rings render still when reduced motion is on", async ({ page }) => {
    const chat = pages.find((p) => p.name === "chat")!;
    await chat.open(page);
    const rings = page.locator('[data-testid^="rings"]');
    await expect(rings.first()).toBeVisible();
    for (const ring of await rings.all()) await expect(ring).toHaveAttribute("data-animate", "false");
  });
});

test("keyboard focus stays visible", async ({ page }) => {
  const builder = pages.find((p) => p.name === "builder")!;
  await builder.open(page);
  let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    await page.keyboard.press("Tab");
    found = await page.evaluate(() => document.activeElement?.textContent?.trim() === "Optimize");
  }
  expect(found).toBe(true);
  const style = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement!);
    return { outline: s.outlineStyle, shadow: s.boxShadow };
  });
  expect(style.outline !== "none" || style.shadow !== "none").toBe(true);
});

test("long ingredient names stay inside the panel", async ({ page }) => {
  const draft = draftOf("A very long recipe title that keeps going and going", 2);
  draft.current = draft.original = draft.original.map((i, n) =>
    n === 0 ? { ...i, name: "Beef (top sirloin steak, raw, trimmed, extra lean, for grilling)" } : i);
  await seedDraft(page, draft);
  await page.goto("/optimize?draft=1");
  await waitForCatalog(page);
  const panel = page.getByRole("complementary", { name: "Ingredients" });
  const box = await panel.boundingBox();
  for (const row of await panel.locator("li").all()) {
    const r = await row.boundingBox();
    expect(r!.x + r!.width).toBeLessThanOrEqual(box!.x + box!.width + 1);
  }
  const width = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(width).toBeLessThanOrEqual(0);
});

test("an empty builder shows the add box", async ({ page }) => {
  await page.goto("/optimize");
  await expect(page.getByRole("combobox", { name: "Add an ingredient" })).toBeVisible();
  const width = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(width).toBeLessThanOrEqual(0);
});
