// npm run screenshots [-- --grep <page>]: full-page screenshots of every
// page at desktop and phone width, light and dark, into screenshots/.
import { test } from "@playwright/test";
import { pages } from "../e2e/pages";

for (const width of [1440, 390]) {
  for (const theme of ["light", "dark"] as const) {
    for (const spec of pages) {
      test(`${spec.name} ${width} ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: width > 500 ? 1000 : 844 });
        await page.emulateMedia({ colorScheme: theme });
        await spec.open(page);
        await page.waitForTimeout(900); // let rings and numbers settle
        await page.screenshot({ path: `screenshots/${spec.name}-${width}-${theme}.png`, fullPage: true });
      });
    }
  }
}
