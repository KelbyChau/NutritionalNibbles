// Readability of the design tokens in app/globals.css, light and dark.
// Text needs 4.5:1 (WCAG AA); nutrient colors are graphics and need 3:1.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

function block(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `${selector} block missing`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

function luminance(hsl) {
  const [h, s, l] = hsl.replace(/%/g, "").split(/\s+/).map(Number);
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(f(0)) + 0.7152 * lin(f(8)) + 0.0722 * lin(f(4));
}

function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

for (const [mode, selector] of [["light", ":root"], ["dark", ".dark"]]) {
  test(`${mode} mode text is readable`, () => {
    const t = mode === "light" ? block(":root") : { ...block(":root"), ...block(".dark") };
    for (const [fg, bg] of [["foreground", "background"], ["foreground", "card"],
      ["muted-foreground", "card"], ["muted-foreground", "background"], ["primary-foreground", "primary"]]) {
      assert.ok(t[fg] && t[bg], `${selector} needs --${fg} and --${bg}`);
      assert.ok(ratio(t[fg], t[bg]) >= 4.5, `${mode}: --${fg} on --${bg} is ${ratio(t[fg], t[bg]).toFixed(2)}:1`);
    }
  });

  test(`${mode} mode nutrient colors stand out on cards`, () => {
    const t = mode === "light" ? block(":root") : { ...block(":root"), ...block(".dark") };
    for (const n of ["calories", "protein", "carbs", "fat"]) {
      const c = t[`nutrient-${n}`];
      assert.ok(c, `${selector} needs --nutrient-${n}`);
      assert.ok(ratio(c, t.card) >= 3, `${mode}: --nutrient-${n} on --card is ${ratio(c, t.card).toFixed(2)}:1`);
    }
  });
}
