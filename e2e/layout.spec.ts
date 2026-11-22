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
