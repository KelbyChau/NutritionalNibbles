import { expect, test } from "@playwright/test";
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
  // Enabled in Task 5, once the nutrition panel shows rings.
  test.fixme("rings render still when reduced motion is on", async ({ page }) => {
    const chat = pages.find((p) => p.name === "chat")!;
    await chat.open(page);
    const rings = page.locator('[data-testid^="rings"]');
    await expect(rings.first()).toBeVisible();
    for (const ring of await rings.all()) await expect(ring).toHaveAttribute("data-animate", "false");
  });
});
