# Apple-Style Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every page of NutritionalNibbles to the approved Apple-style design (product-page public pages, Health-app app screens, nutrition rings), with every feature still working.

**Architecture:**
- **Task 1 swaps the foundations:** the color variables in `app/globals.css`, fonts, the `font-display`, `surface-paper` and `surface-cobalt` classes, and the hard-coded colors. That re-skins the whole app at once.
- **Task 2 builds the nutrition rings,** test-first (pure math, then an SVG component).
- **Tasks 3–9 polish one area each:** primitives, landing, nutrition panel, builder, chat, import, dashboard, auth.
- **Every task is gated** by the browser tests plus screenshots at 1440/390 px in light and dark, which I review before committing.

**Tech Stack:** Next.js 16.4.6, Tailwind (shadcn HSL variables), `motion`, `next-themes`, `next/font` (Inter), Playwright.

**Spec:** `Docs/superpowers/specs/2026-11-22-apple-style-redesign-design.md`

## Global Constraints

- Every feature keeps working; every chat assistant reply stays word for word.
- Accessible names used by the e2e tests stay the same:
  - "Add an ingredient", "Suggestions", "Ingredients", "Estimated nutrition", "Your recipe", "Tell the optimizer what to change"
  - "More servings", "Fewer servings", "Undo", "Import a recipe", "Find recipe", "Dish name", "Edit ingredients"
  - the Save, Sign up and Login button names
  - the texts "New Recipe", "Before → Now", "Removed", "Loading USDA ingredients…"
- Tests may change selectors only, never what they check.
- Tokens are exactly the spec's (copy hex values from the spec's Design tokens section). Nutrient colors are used for nutrient data only.
- No Apple logos, icons, images or font files; the system font stack only names SF.
- Text contrast ≥ 4.5:1 in both modes; visible keyboard focus; `prefers-reduced-motion` disables ring and number animation.
- No horizontal page scroll at 390 px wide.
- Gate per commit: `npx tsc --noEmit -p .`, `npx eslint <changed>`, `npm test`, `npm run test:e2e`, `npm run screenshots` (reviewed).

## Review Focus

1. **Dark mode contrast**, the likeliest regression. The green action color and nutrient colors on `#1C1C1E` must stay readable: Task 1's contrast test covers both modes.
2. **Phone width:** the builder's three columns, the chat's side column and the dashboard grid must stack at 390 px with no sideways scroll. Task 1 adds an e2e test that checks `scrollWidth ≤ innerWidth` on every page.
3. **Reduced motion:** rings render already filled with no transition when the OS asks for less motion. Task 2 adds an e2e check with `reducedMotion: "reduce"`.
4. **Keyboard focus** on pills, the combobox and suggestion options must stay visible after the restyle. Task 3 adds an e2e test: Tab to "Optimize" and check that its computed outline or ring isn't `none`.
5. **Long names and empty states:** a 60-character ingredient name and an empty recipe must neither overflow a panel nor collapse it. Task 6 adds an e2e test with a long-name draft that checks the ingredient row stays inside its panel.

---

### Task 1: Foundations (tokens, fonts, surfaces, test hooks)

**Files:**
- Modify:
  - `app/globals.css`: light/dark variables, the `surface-paper` panel, the `surface-cobalt` black band, `.font-display` weight/tracking, selection color
  - `app/layout.tsx`: Inter (`--font-inter`) replaces Geist and Instrument Serif
  - `tailwind.config.ts`: `fontFamily.sans/display/rounded`, the `nutrient.*` colors, the `rounded-panel` (28px) and `rounded-card` (20px) radii, the `shadow-panel` shadow
  - every component with a hard-coded `hsl(` color or a `BUTTER`/`SHADOW` constant: swap it for a token class (`git grep -n "hsl(\|BUTTER\|SHADOW" -- app components`)
  - `components/optimize/nutrition-panel.tsx`: add `data-testid="calories-value"` on the calorie number
  - `e2e/*.spec.ts`: use `getByTestId("calories-value")` instead of `.font-display.text-5xl`
- Create:
  - `lib/design/contrast.test.mjs`
  - `e2e/layout.spec.ts`
  - `scripts/screenshots.mjs`, plus the `"screenshots"` npm script and the `/screenshots/` gitignore entry

**Interfaces — Produces:**
- **CSS variables** (HSL triplets as today):
  - `--background`, `--card`, `--foreground`, `--muted`, `--muted-foreground`, `--border`, `--primary` (action green), `--ring`
  - `--nutrient-calories`, `--nutrient-protein`, `--nutrient-carbs`, `--nutrient-fat`
- **Tailwind classes:** `bg-nutrient-calories` etc. (and `text-`/`stroke-`), `font-rounded`, `rounded-panel`, `rounded-card`, `shadow-panel`.
- **The screenshots script:**
  - Command: `npm run screenshots -- [page…]`.
  - Output: PNGs in `screenshots/<page>-<width>-<theme>.png`.
  - Pages: `/`, `/optimize` (seeded draft), `/optimize/chat` (seeded draft), `/dashboard`, `/auth/login`.
  - It reuses the e2e web server config on port 3100.

- [ ] **Step 1: Write `lib/design/contrast.test.mjs`.**
  - It parses `app/globals.css`: the `:root` and `.dark` blocks, HSL to sRGB.
  - It asserts a WCAG contrast of at least 4.5 for these pairs, in both modes:
    - foreground on background
    - foreground on card
    - muted-foreground on card
    - primary-foreground on primary
  - It asserts at least 3.0 (graphics) for each nutrient color on card.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL. Today's `--muted-foreground` and the nutrient variables don't exist or don't match the spec yet. Record which assertion fails.
- [ ] **Step 3: Write `e2e/layout.spec.ts`,** test `no page scrolls sideways on a phone`.
  - Viewport 390×844. For each of the 5 screenshot pages, `document.documentElement.scrollWidth <= window.innerWidth`.
  - This passes or fails on today's code. Record the result; it must pass by the end of the task.
- [ ] **Step 4: Implement the tokens, fonts and surfaces** with the spec's exact hex values, converted to HSL triplets.
  - `.font-display` becomes the sans display style: semibold, `letter-spacing:-0.02em`, `line-height:1.05`.
  - `surface-paper` = white card + `shadow-panel` in light mode, `#1C1C1E` with no shadow in dark mode.
  - `surface-cobalt` is renamed to `surface-band` (black, white text) and every use is updated.
- [ ] **Step 5:** Replace the hard-coded `hsl(` colors and the `BUTTER`/`SHADOW` constants with token classes:
  - the old butter-yellow art backdrop becomes `bg-muted`
  - the old macro colors become nutrient tokens
- [ ] **Step 6:** Add the `data-testid` and update the e2e selectors.
- [ ] **Step 7:** Run the gate.
  - Expected: contrast test passes; 12+1 e2e pass.
  - Read every screenshot. The whole app should be light gray / white / green / sans, dark mode black, with nothing invisible or unreadable.
- [ ] **Step 8:** Commit: `"Switch the design foundations to the Apple-style tokens and type"`

### Task 2: Nutrition rings

**Files:**
- Create:
  - `lib/nutrition-rings.ts` + `lib/nutrition-rings.test.mjs`
  - `components/nutrition-rings.tsx`
- Modify: `e2e/layout.spec.ts`, adding the reduced-motion test

**Interfaces — Produces:**
```ts
export type RingKey = "calories" | "protein" | "carbs" | "fat";
export type Ring = { key: RingKey; label: string; value: number | null; unit: "kcal" | "g"; dailyValue: number; fraction: number; over: boolean; partial: boolean };
export function nutritionRings(perServing: Nutrients, counted: Record<keyof Nutrients, number>, items: number): Ring[];
// order calories, protein, carbs, fat (outer → inner); daily values kcal 2000, protein 50, carbs 275, fat 78
// fraction = clamp(value / dailyValue, 0, 1); null value → fraction 0; over = value > dailyValue;
// partial = 0 < counted[key] < items
```

The component:
- Signature: `NutritionRings({ rings, size = 160, stroke = 14, showLegend = true, testId? })`.
- It draws concentric SVG arcs with `stroke-linecap: round`, a 15%-opacity track per ring, and `motion` to animate `pathLength` from the previous value (600 ms ease).
- Under `useReducedMotion()` it renders static and sets `data-animate="false"`.
- The legend shows the value, unit, % daily value, and `†` when partial.

- [ ] **Step 1: Write `nutrition-rings.test.mjs`:**
  - `{kcal:500, protein:25, carbs:275, fat:100}` → fractions `[0.25, 0.5, 1, 1]`; `over` is false, false, false, true
  - `protein:null` → fraction `0`
  - counted protein 1 of 2 → `partial:true`
  - the order and labels are "Calories", "Protein", "Carbs", "Fat"
- [ ] **Step 2:** Run `npm test`. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement `nutritionRings`. Use `dailyValues` from `lib/nutrition.ts` for protein/carbs/fat; calories is 2000.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Implement the component.
- [ ] **Step 6:** Add the e2e test `rings render still when reduced motion is on`:
  - context `reducedMotion: "reduce"`, open `/optimize/chat` with a seeded draft
  - every `[data-testid^="rings"]` has `data-animate="false"`

  The test runs after Task 5 places the rings, so mark it `test.fixme` here and remove the `fixme` in Task 5.
- [ ] **Step 7:** Run the gate, then commit: `"Add nutrition rings (daily-value math tested)"`

### Task 3: UI primitives and theme switch

**Files:** Modify:
- `components/ui/button.tsx`:
  - variants `default` (green pill), `secondary` (gray pill), `outline`, `ghost`, `link`
  - sizes `sm` 32px, `default` 40px, `lg` 48px
  - all `rounded-full`
  - focus: `ring-2 ring-ring ring-offset-2`
- `components/ui/input.tsx`: 44px tall, `rounded-xl`, `bg-muted` fill, no border, focus ring
- `components/ui/card.tsx`: `rounded-panel`, `surface-paper`
- `components/ui/badge.tsx`: chips
- `components/ui/dropdown-menu.tsx`: `rounded-card`, blurred backdrop, 8px padding
- `components/theme-switcher.tsx`: a pill trigger
- `components/save-button.tsx`

Add the e2e test `keyboard focus stays visible` to `e2e/layout.spec.ts`: on `/optimize` with a seeded draft, Tab until "Optimize" is focused, then check its computed `outline-style !== "none"` or its `box-shadow` contains the ring color.

- [ ] **Step 1:** Write the focus test and run it. Record the result.
- [ ] **Step 2:** Restyle the primitives. Keep every variant and size name that's already used (`git grep -n "variant=\|size=" -- app components`).
- [ ] **Step 3:** Run the gate, then commit: `"Restyle buttons, inputs, cards and menus as Apple-style pills and panels"`

### Task 4: Landing page

**Files:** Modify `components/landing/site-nav.tsx`, `hero.tsx`, `how-it-works.tsx`, `macro-swap-preview.tsx`, `closing-cta.tsx`, `site-footer.tsx`, `app/page.tsx`. Create `components/landing/sample-dish.ts`.

**Interfaces — Consumes:** `nutritionRings`, `NutritionRings` (Task 2); `calculateNutrition`.

- **`sample-dish.ts`:** exports `sampleDish`, made of 2 foods:
  - chicken breast `{fdc_id:2646170, description:"Chicken, breast, boneless, skinless, raw", kcal 120, protein 22.5, carbs 0, fat 2.62}`, 400 g
  - asparagus `{fdc_id:168389, kcal 20, protein 2.2, carbs 3.88, fat 0.12}`, 200 g

  The dish is named "Lemon chicken & asparagus", serves 2. It also exports `sampleRings`, computed by `calculateNutrition` → `nutritionRings`.
- **Copy (exact):**
  - headline "Know what's in every recipe."
  - subhead "Paste a link or add ingredients. See the nutrition, then make it better."
  - buttons "Create a recipe" (to `/optimize`) and "See how it works" (to `#how-it-works`)
- **Nav:** frosted, sticky. Keep the existing links and the auth button.
- **How it works:** three numbered steps: "Add or import a recipe", "See the nutrition", "Ask for a lighter version".
- **Swap showcase:** a black `surface-band`, before/after ring pairs for salted → unsalted butter, with the caption "Salted butter → unsalted: 95 mg less sodium per serving".
- **Animation:** the rings fill once on load; no per-section scroll fades.

- [ ] **Step 1: Unit test in `lib/nutrition-rings.test.mjs`:** `sampleRings` fractions are all between 0 and 1, and the protein ring is the largest. This pins that the sample uses real math. Run it; expect FAIL (module missing).
- [ ] **Step 2:** Implement `sample-dish.ts`. Run it; expect PASS.
- [ ] **Step 3:** Rebuild the landing sections.
- [ ] **Step 4:** Run the gate and read the `/` screenshots. Then commit: `"Redesign the landing page as a product page with nutrition rings"`

### Task 5: Nutrition panel

**Files:** Modify `components/optimize/nutrition-panel.tsx`.

- **Top of the panel:** `NutritionRings` (`testId="rings-panel"`) with the calories number (`data-testid="calories-value"`, `font-rounded`, 56px) beside it.
- **Below:** the existing facts as an Apple list: label left, value right, hairlines between rows, % daily value in secondary ink.
- **Keep unchanged:** the "Per serving / Whole recipe" toggle (as a segmented control), the `†` notes, "Not counted" and "Breakdown by ingredient", and all text.

- [ ] **Step 1:** Restyle, and remove the `test.fixme` from Task 2's reduced-motion test.
- [ ] **Step 2:** Run the gate and read the builder and chat screenshots. Then commit: `"Redesign the nutrition panel with rings and an Apple-style list"`

### Task 6: Builder

**Files:** Modify:
- `components/optimize/recipe-builder.tsx`: header, layout and stats
- `builder/stage.tsx`: a white circular plate on canvas, art in `bg-muted` circles
- `builder/ingredient-list.tsx`: rows in a white panel, amount field in `bg-muted`
- `combobox.tsx`: a `rounded-card` popup with blur; options with `rounded-xl` hover
- `recipe-import.tsx`'s trigger button style only (the dialog itself is Task 8)

- **Layout:** stacks to one column under `xl`, matching today's breakpoints.
- **Title field:** large borderless (`aria-label="Dish name"` kept).
- **Header buttons:** servings as a pill stepper; Optimize green.

- [ ] **Step 1:** Add the e2e test `long ingredient names stay inside the panel`:
  - seed a draft with a 60-character name
  - the row's `getBoundingClientRect().right` ≤ the panel's
  - also: the empty builder shows the add box and no overflow

  Run it and record the result.
- [ ] **Step 2:** Restyle.
- [ ] **Step 3:** Run the gate and read the `/optimize` screenshots. Then commit: `"Redesign the recipe builder"`

### Task 7: Optimizer chat

**Files:** Modify:
- `components/optimize/optimize-chat.tsx` (message list and input markup)
- `chat/pieces.tsx` (Shell, ActionButton, IconButton)
- `chat/comparison.tsx`
- `chat/recipe-list.tsx`

**Interfaces — Consumes:** `nutritionRings` and `NutritionRings` (`testId="rings-before"` and `"rings-now"`, size 88, no legend).

- **Bubbles:**
  - user: right, `bg-primary text-primary-foreground`, `rounded-[20px]` with a 6px corner on the tail side
  - assistant: left, `bg-muted`
  - action buttons are `secondary` pills under the bubble
- **Input:** frosted (`backdrop-blur-xl` over 72% canvas), sticky at the bottom of the chat column.
- **Before → Now:** keeps its heading and its rows of numbers, with the two small ring sets added above.

- [ ] **Step 1:** Restyle.
- [ ] **Step 2:** Run the gate. All 8 chat-command tests must still pass. Read the `/optimize/chat` screenshots, then commit: `"Redesign the optimizer chat with message bubbles and ring comparison"`

### Task 8: Import dialog

**Files:** Modify `components/optimize/recipe-import.tsx` (dialog markup and styles only).

- **The dialog:** a sheet with `rounded-panel`; the backdrop is `bg-black/40 backdrop-blur-sm`.
- **Badges:**
  - "Matched": secondary chip
  - "Check match": `bg-nutrient-carbs/15 text-foreground`
  - "Your pick": primary-tinted chip
- **Keep unchanged:** all texts and IDs (`#recipe-import-url`).

- [ ] **Step 1:** Restyle.
- [ ] **Step 2:** Run the gate, and screenshot the open dialog with the e2e import mock. Then commit: `"Redesign the recipe import dialog as a sheet"`

### Task 9: Dashboard and auth pages

**Files:** Modify:
- `components/dashboard/recipe-dashboard.tsx` (header, search and filter pills)
- `components/dashboard/recipe-cards.tsx` (featured card, grid cards, empty state)
- `app/auth/*/page.tsx`
- `components/{login,sign-up,forgot-password,update-password}-form.tsx`

- **Featured card:**
  - large `rounded-panel`, ingredient art at left, small rings (`testId="rings-featured"`, size 96) at right
  - fed from the recipe row's `calories_per_serving`, `protein_g_per_serving`, `carbohydrates_g_per_serving` and `fat_g_per_serving`; a `null` field renders as track only
- **Grid cards:** title, time, and protein and calories chips in nutrient colors.
- **Auth pages:** a centered `Card` on canvas, the wordmark "NutritionalNibbles" above it (text, semibold), and a green primary button. All labels are unchanged.

- [ ] **Step 1:** Restyle.
- [ ] **Step 2:** Run the gate and read the `/dashboard` and `/auth/login` screenshots. Then commit: `"Redesign the dashboard and sign-in pages"`

### Task 10: Whole-branch check

- [ ] **Step 1:** Run each check and confirm it passes:
  - `npm test`
  - `npm run test:db`
  - `npm run test:e2e`
  - `npx tsc --noEmit -p .`
  - `npx eslint app components lib e2e`
  - `npx next build`
  - `npx next build --webpack`
- [ ] **Step 2:** Run `npm run screenshots` for all pages, both widths, both themes, and read every image against the spec's Design tokens and Pages sections. Fix anything off-spec in this task.
- [ ] **Step 3:** Commit any fixes, then push `Refactor` (fast-forward) and update the PR description with a redesign section.
