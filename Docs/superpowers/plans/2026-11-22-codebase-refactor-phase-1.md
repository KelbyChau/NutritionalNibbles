# Codebase Refactor — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pin today's behavior with tests, then delete dead code, load the USDA catalog once per tab, and merge the duplicate amount parser, with no change a user can see.

**Architecture:** Characterization tests come first and record current outputs (values below were captured from the code on 2026-11-22). Each cleanup is then a small commit that keeps every test green. Phase 2 (file splits) is out of scope.

**Tech Stack:** Next.js 16.4.6, React, Supabase JS, Node 26 `node --test` (runs `.ts` by stripping types), pgTAP, Playwright (new dev dependency).

**Spec:** `docs/superpowers/specs/2026-11-22-codebase-refactor-design.md`

## Global Constraints

- Every feature keeps working exactly as today; no visual/wording changes. The one allowed visible change: the post-password-reset redirect goes to `/dashboard`.
- No numbers a user sees may change.
- Do not touch `/v2`, `components/landing/hero-paste.tsx`, or any database migration.
- Code imported by `node --test` must not use `@/` path aliases or TypeScript-only runtime syntax (parameter properties, enums, namespaces).
- Before using any Next.js API, read the matching guide in `node_modules/next/dist/docs/`.
- Gate for every commit: `npx tsc --noEmit -p .` clean, `npx eslint <changed files>` clean, `npm test` passes.

## Review Focus

1. Going from the builder to the chat and back must show the same foods and nutrition with the catalog cached: Task 6's cache test plus Task 5's builder→chat spec.
2. A failed catalog load followed by **Retry** must fetch again, not return the cached failure: Task 6 test `retries after a failure`.
3. Typing `1,5` as an amount in the builder must still show "Enter a positive amount", while the importer still reads `1,5` as 1.5: Task 7 tests.
4. Deleting dead files must not break `/v2` or any page build: Task 8 runs `next build`.
5. The browser tests must not disturb a dev server already running on port 3000: Task 5 uses port 3100 and a separate build folder.

---

### Task 1: `npm test` and nutrition characterization tests

**Files:**
- Modify: `package.json` (scripts)
- Create: `lib/nutrition.test.mjs`

**Interfaces:**
- Produces: `npm test` = `node --test "lib/**/*.test.mjs"`, used by every later task.

- [ ] **Step 1:** Add the script `"test": "node --test \"lib/**/*.test.mjs\""` to `package.json`.
- [ ] **Step 2: Write `lib/nutrition.test.mjs`**, importing from `./nutrition.ts`. Fixtures:
  - steak `{fdc_id:2727574, description:"Beef, top sirloin steak, raw", kcal 146, protein 22, carbs 0.218, fat 5.71, sugar null, sodium 42.8}`
  - butter `{fdc_id:790508, description:"Butter, stick, unsalted", kcal 717, protein null, carbs null, fat 82.2, sugar 0.58, sodium 11}`
  - broth `{fdc_id:171609, description:"Soup, chicken broth, low sodium, canned", kcal 16, protein 2, carbs 1.2, fat 0.6}`

  Use the real column names (`kcal_per_100g`, `total_sugars_g_per_100g`, `sodium_mg_per_100g`, …). Tests:
  - `parseAmount`: `"1 1/2"→1.5`, `"1/2"→0.5`, `" 3 "→3`, `""→null`, `"abc"→null`, `"1,5"→null`, `"1,000"→null`, `"1/0"→Infinity`, `"-2"→-2`.
  - `calculateNutrition` of [steak 400 g, butter 2 tbsp, broth 3/4 cup, steak with amount "", steak 2 bunch] at 2 servings:
    - `items.map(i=>i.grams)` deep-equals `[400, 28.375, 180, null, null]`
    - `items[3].issue === "Enter a positive amount"`
    - `items[4].issue === "Can't convert “bunch” to grams — enter a weight in grams"`
    - `counted === 3`; `perServing.protein === null`; `perServing.kcal ≈ 408.124375`
    - `known.perServing.protein ≈ 45.8`; `known.perServing.sodium ≈ 87.160625`
    - `known.counted` deep-equals `{kcal:3, protein:2, carbs:2, fat:3, satFat:0, fiber:0, sugar:1, sodium:2, cholesterol:0}`
    - `knownCalories` deep-equals `{total:816.24875, perServing:408.124375, counted:3}`
  - A food with no portion data, 250 ml → `grams === 250`.

  Compare floats with `Math.abs(a-b) < 1e-9`.
- [ ] **Step 3:** Run `npm test`. Expected: all pass, including the existing `ingredient-lines` tests. These tests describe existing code, so they pass at once. If any fails, the fixture is wrong, not the code: recheck it against the values above.
- [ ] **Step 4:** Commit: `git add package.json lib/nutrition.test.mjs && git commit -m "Pin today's nutrition math with tests and add npm test"`

### Task 2: Food names and search tests

**Files:** Create: `lib/foundation-foods.test.mjs`

- [ ] **Step 1: Write tests** importing from `./foundation-foods.ts`:
  - `foodLabel` / `foodName` pairs:

    | Description | `foodLabel` | `foodName` |
    |---|---|---|
    | "Syrups, maple" | "Maple syrup" | "Maple syrup" |
    | "Spices, pepper, black" | "Black pepper" | "Black pepper" |
    | "Fish, salmon, Atlantic, farmed, raw" | "Atlantic salmon (farmed, raw)" | "Atlantic salmon" |
    | "Chicken, breast, boneless, skinless, raw" | "Chicken Breast (boneless, skinless, raw)" | "Chicken Breast" |
    | "Oil, olive, extra virgin" | "Olive oil (extra virgin)" | "Olive oil" |
    | "Salad dressing, italian dressing, commercial, regular" | "Italian dressing (commercial, regular)" | "Italian dressing" |
    | "Apples, raw, with skin" | "Apples (raw, with skin)" | "Apples" |
    | "Butter, salted" | "Butter (salted)" | "Butter" |
  - `foodSuggestions` over the fixture list
    - list: `[1 "Eggs, whole, raw" foundation, 2 "Eggplant, raw" foundation, 3 "Egg, white, raw" sr_legacy, 4 "Syrups, maple" sr_legacy, 5 "Chicken, breast, raw" foundation, 6 "Chickpeas, canned" sr_legacy]`
    - ids by query: `"egg"→[1,3,2]`, `"chick"→[5,6]`, `"maple syrup"→[4]`, `""→[]`, `"zzz"→[]`
  - `exactFood`: `"maple syrup"→4`, `"Eggs, whole, raw"→1`, `"egg"→undefined`.
- [ ] **Step 2:** Run `npm test`. Expected: pass.
- [ ] **Step 3:** Commit: `"Pin food display names and search ranking with tests"`

### Task 3: Swap verification tests

**Files:** Create: `lib/optimizer/nutrient-swaps.test.mjs`

- [ ] **Step 1: Write tests** importing from `./nutrient-swaps.ts`:
  - `promptGoals`:
    - `"make it lower in sodium"` → `[{target:"sodium",direction:"lower"}]`
    - `"more protein and less fat"` → `[protein higher, fat lower]`
    - `"less sugar please"` → `[sugar lower]`
    - `"cut down on carbs"` → `[carbs lower]`
    - `"sodium"` → `[]`
  - `evaluateSwap` with salted butter `{fdc_id:173410, kcal 717, protein 0.85, carbs 0.06, fat 81.11, sugar 0.06, sodium 643}` → unsalted (same, `fdc_id:173430`, sodium 11), 30 g → 30 g, `same_weight`, 2 servings, goal sodium lower, `recipe {sodium:184}`:
    - `changes` deep-equals `[{target:"sodium", perServing:-94.8}]` (float-close)
    - `score ≈ 0.5152173913043478`
    - `sideEffects` is `[]`
  - Same input with original and replacement swapped → `null`. Replacement equal to original → `null`. `grams: 300` → `null`.
  - `AMOUNT_LIMITS` deep-equals `{same_weight:{min:1,max:1}, same_volume:{min:0.5,max:2}, prepared_equivalent:{min:0.25,max:4}}`.
- [ ] **Step 2:** Run `npm test`. Expected: pass.
- [ ] **Step 3:** Commit: `"Pin swap verification with tests"`

### Task 4: Recipe page reading tests

**Files:**
- Modify: `lib/recipe-url/fetch-page.ts:15-22` (`ImportError`)
- Create: `lib/recipe-url/extract.test.mjs`, `lib/recipe-url/fetch-page.test.mjs`

- [ ] **Step 1:** Rewrite `ImportError` without a parameter property: declare `status: number` as a field and assign it in the constructor `(message: string, status = 400)`. Same behavior; Node can now load the file.
- [ ] **Step 2: Write `extract.test.mjs`** with these HTML fixtures:
  - **JSON-LD inside `@graph`:**
    - name `"Tomato &amp; Basil Soup"`, `recipeYield ["4","4 servings"]`
    - ingredients `["1 &frac12; cups <b>tomatoes</b>","2 tbsp olive oil"]`, image `{url:"/img/soup.jpg"}`, page `https://ex.com/r/soup`
    - expected: `{title:"Tomato & Basil Soup", servings:4, ingredients:["1 ½ cups tomatoes","2 tbsp olive oil"], image:"https://ex.com/img/soup.jpg", sourceUrl:"https://ex.com/r/soup"}`
  - **Microdata:**
    - `<title>Grandma's Pie - Blog</title>`, `recipeYield` "Serves 6-8", ingredients `"2 cups flour"` (`itemprop="recipeIngredient"`) and `"1 egg"` (`itemprop="ingredients"`)
    - expected: `{title:"Grandma's Pie", servings:6, ingredients:["2 cups flour","1 egg"], image:null}`
  - A page with no recipe → `null`.
  - A broken JSON-LD block followed by a valid one whose `recipeIngredient` is `"a\nb"` → ingredients `["a","b"]`.
- [ ] **Step 3: Write `fetch-page.test.mjs`:**
  - `isPrivateAddress` is true for: `127.0.0.1, 10.1.2.3, 172.16.0.1, 192.168.1.1, 169.254.169.254, 100.64.0.1, 0.0.0.0, 224.0.0.1, ::1, fe80::1, fd00::1, ::ffff:127.0.0.1`
  - It is false for: `172.32.0.1, 8.8.8.8, 2606:4700::1`
  - `parseRecipeUrl`:
    - `"allrecipes.com/x"` → `"https://allrecipes.com/x"`
    - throws `ImportError` with message `"Only http and https links can be imported."` for `"ftp://a.com"`
    - `"Links with a username or password aren’t supported."` for `"https://u:p@a.com"`
    - `"Paste a recipe link first."` for `" "`
    - `"That doesn’t look like a web link."` for `"not a url ::"`
  - No network calls in these tests.
- [ ] **Step 4:** Run `npm test` and `npx tsc --noEmit -p .`. Expected: both clean.
- [ ] **Step 5:** Commit: `"Pin recipe page reading and link checks with tests"`

### Task 5: Browser smoke tests

**Files:**
- Modify: `package.json` (devDependency `@playwright/test`, script `"test:e2e": "playwright test"`), `next.config.ts`, `.gitignore`
- Create: `playwright.config.ts`, `e2e/helpers.ts`, `e2e/builder.spec.ts`, `e2e/import.spec.ts`, `e2e/chat.spec.ts`, `e2e/account.spec.ts`

**Interfaces:**
- Produces: `npm run test:e2e`. It needs Docker and the local stack (`npm run local` once, or `npx supabase@3.2.0 start`).

- [ ] **Step 1:** `npm i -D @playwright/test` (pin the version installed) and `npx playwright install chromium`.
- [ ] **Step 2:** In `next.config.ts`, add `distDir: process.env.NEXT_DIST_DIR ?? ".next"`, and add `/.next-e2e/` to `.gitignore`.
- [ ] **Step 3: `playwright.config.ts`**
  - `baseURL http://localhost:3100`, chromium only
  - `webServer`:
    - command `npx next dev --webpack -p 3100`, `reuseExistingServer: false`
    - env: `NEXT_DIST_DIR=.next-e2e`, plus `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` read at config time from `npx supabase@3.2.0 status -o json` (`API_URL`, `PUBLISHABLE_KEY`)
  - Fail with "Start the local database first: npm run local" if that command fails.
  - Never point at the shared project.
- [ ] **Step 4: `e2e/helpers.ts`:**
  - `seedDraft(page, draft)`: writes `sessionStorage["nutritionalnibbles:optimize-draft"]` on `/optimize`.
  - Food fixtures: steak `2727574` and asparagus `168389` (asparagus is an SR Legacy food).
- [ ] **Step 5: Specs.** Each asserts what a user sees:
  - `builder.spec.ts`: type `200g asparagus` in the "Add an ingredient" box and pick the first suggestion. The ingredient list shows it, and Estimated Nutrition shows non-zero calories. Clicking "More servings" lowers the per-serving calories.
  - `import.spec.ts`:
    - Mock `**/api/recipe-import` with a recipe of title "E2E Cake", 2 servings, and ingredients `["2 tbsp salted butter","1 cup all-purpose flour","1 tbsp salted butter"]`.
    - Paste `example.com/cake`, without `https://`. The review footer contains "2 lines are the same food, so they’re combined into one ingredient." and "2 ingredients will be added".
    - Confirm. The builder shows title "E2E Cake", 2 ingredients, and heading "New Recipe".
  - `chat.spec.ts`: seed the steak + asparagus draft and open `/optimize/chat`.
    - Send `3 servings`. The servings shows 3, and the Before → Now calories row changes.
    - `undo` (the Undo button) restores the previous recipe. `reset` returns to the original.
    - Going "Edit ingredients" → back keeps the same nutrition (catalog cache).
  - `account.spec.ts`:
    - Sign up `e2e-<timestamp>@example.invalid` / `test-password-123` and land on `/dashboard`.
    - Save a recipe from the builder. It shows on `/dashboard`.
    - Log in from a new context and see it.
    - Clean up with `docker exec supabase_db_nutritionalnibbles psql … delete from auth.users where email like 'e2e-%@example.invalid'` in `afterAll`.
- [ ] **Step 6:** Run `npm run test:e2e`. Expected: 4 files pass. If one fails, read the failure: the app is correct today, so fix the spec, not the app.
- [ ] **Step 7:** Commit: `"Add browser smoke tests for the main flows"`

### Task 6: Load the USDA catalog once per tab

**Files:**
- Create: `lib/usda-catalog.ts`, `lib/usda-catalog.test.mjs`
- Modify: `components/optimize/shared.tsx` (`useUsdaFoods`, around lines 104–150)

**Interfaces:**
- Produces:
  - `USDA_FOOD_COLUMNS = "fdc_id, description, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, total_sugars_g_per_100g, sodium_mg_per_100g"`
  - `loadUsdaCatalog(client: CatalogClient): Promise<FoundationFood[]>`: one shared promise per module. Foundation rows first, then SR Legacy pages of 1000 in `fdc_id` order, tagged `source`. A rejected load clears the cache.
  - `CatalogClient`: the minimal structural type of the Supabase client methods used (`from(table).select(cols, opts?).order(col).range(a,b)`).
- Consumes: `FoundationFood` from `./foundation-foods`. Use a relative import, no `@/`.

- [ ] **Step 1: Write `lib/usda-catalog.test.mjs`.** Use a fake client that records calls and returns 2 foundation rows, a count of 1500 and 2 legacy pages. Tests:
  - `loads foundation then legacy, tagged`: the result's ids are in order and the `source` tags are right.
  - `fetches once`: two `await loadUsdaCatalog(fake)` calls make one set of requests. Count `from()` calls: 1 foundation + 1 count + 2 pages = 4 total.
  - `asks only for the needed columns`: every `select` gets `USDA_FOOD_COLUMNS`, except the count query (`"fdc_id"`, `{count:"exact", head:true}`).
  - `retries after a failure`: the first call's fake returns `{error}`, so the promise rejects with `"Catalog unavailable"`. The second call refetches and resolves.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement `lib/usda-catalog.ts`. Move the existing loading logic from `useUsdaFoods` and keep its order and tagging. Export a `resetUsdaCatalog()` for tests only if needed.
- [ ] **Step 4:** Change `useUsdaFoods` to call `loadUsdaCatalog(createClient())`. Keep its return shape `{ foods, status, retry }` and its status strings ("Loading USDA ingredients…", "Couldn’t load USDA ingredients.") unchanged.
- [ ] **Step 5:** Run `npm test`, `npx tsc --noEmit -p .`, and `npm run test:e2e`. Expected: all pass.
- [ ] **Step 6:** Commit: `"Load the USDA food list once per tab and only the columns we use"`

### Task 7: One amount parser

**Files:**
- Create: `lib/amount.ts`
- Modify: `lib/recipe-url/ingredient-lines.ts:82-90` (`toNumber`), `lib/nutrition.ts:372-381` (`parseAmount` moves out), `tsconfig.json`
- Test: `lib/recipe-url/ingredient-lines.test.mjs`

**Interfaces:**
- Produces: `toNumber(amount: string): number | null`. Same signature, now built on `parseAmount` from `../nutrition.ts`.

- [ ] **Step 1: Add the test `toNumber keeps reading decimal commas`:**
  - `"1,5"→1.5`, `"1,000"→1`, `"1/0"→null`, `"1 1/2"→1.5`, `""→null`, `"abc"→null`, `"-2"→-2`
  - `parseAmount("1,5")` is still `null` (this is already in Task 1)
- [ ] **Step 2:** Run `npm test`. Expected: pass, because it pins current behavior.
- [ ] **Step 3:** Move `parseAmount` unchanged from `lib/nutrition.ts` into a new dependency-free `lib/amount.ts`.
  - `lib/nutrition.ts` re-exports it (`export { parseAmount } from "./amount.ts"`), so no caller changes.
  - Make `toNumber` replace the first comma with a dot, call `parseAmount`, and return `null` unless the result is finite.
  - Node's test runner only resolves runtime imports that include the extension, so both files import `"./amount.ts"` / `"../amount.ts"`. Add `"allowImportingTsExtensions": true` to `tsconfig.json`; this is allowed because it already has `"noEmit": true`.
- [ ] **Step 4:** Run `npm test` and `npx tsc --noEmit -p .`. Expected: clean. The only behavior change is `"1 1/0"`, from `Infinity` to `null`, which can't be typed meaningfully.
- [ ] **Step 5:** Commit: `"Read import amounts with the same parser as the nutrition math"`

### Task 8: Delete dead code

**Files:**
- Delete:
  - `app/protected/` (`layout.tsx`, `page.tsx`)
  - `components/tutorial/` (5 files)
  - `components/foundation-food-picker.tsx`, `components/hero.tsx`, `components/next-logo.tsx`, `components/supabase-logo.tsx`, `components/deploy-button.tsx`, `components/ui/checkbox.tsx`
- Modify: `components/update-password-form.tsx:39` (`"/protected"` → `"/dashboard"`)

- [ ] **Step 1:** Run `git grep -n -E "protected|tutorial/|foundation-food-picker|next-logo|supabase-logo|deploy-button|components/hero\"|ui/checkbox" -- app components lib proxy.ts`. Expected: only the files being deleted and `update-password-form.tsx:39`.
- [ ] **Step 2:** Delete the files and change the redirect.
- [ ] **Step 3:** Run `npx tsc --noEmit -p .`, `npm test`, `npm run test:e2e`, and `npx next build --webpack`. Expected: all clean. The build lists `/v2` and no `/protected`.
- [ ] **Step 4:** If `@radix-ui/react-checkbox` is now unused (check `git grep`), remove it from `package.json` with `npm uninstall`.
- [ ] **Step 5:** Commit: `"Remove starter-template and unused components; send password resets to the dashboard"`

### Task 9: Whole-branch check

- [ ] **Step 1:** Run on a fresh checkout state:
  - `npm test`
  - `npm run test:db`
  - `npm run test:e2e`
  - `npx tsc --noEmit -p .`
  - `npx eslint app components lib e2e`
  - `npx next build --webpack`

  Expected: all pass. Repo-wide lint warnings that already exist on `main` are listed, not fixed.
- [ ] **Step 2:** Compare against `main`: `git diff --stat origin/main...HEAD -- app components lib`. Apart from tests and deletions, these are the only changes:
  - `shared.tsx` (`useUsdaFoods`)
  - `ingredient-lines.ts` (`toNumber`), `nutrition.ts` and `amount.ts` (the shared parser)
  - `fetch-page.ts` (`ImportError`)
  - `update-password-form.tsx`
  - `next.config.ts` and `tsconfig.json`
- [ ] **Step 3:** Push `Refactor` and give the PR link. Note in the PR that it must merge after PR #16, which it was branched from.
