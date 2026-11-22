# Codebase refactor: safety net first, then cleanup

Date: 2026-11-22 · Branch: `Refactor`

## Why

Make the code more efficient, both how fast pages load and how easy the code
is to change, and enjoy doing it. The one hard rule: **every feature keeps
working exactly as it does today.**

## Goals

- Tests that pin down today's behavior, written *before* anything moves,
  so "nothing broke" is something we check, not hope.
- Less code: delete what no page uses.
- Faster builder and chat pages: download the USDA food list once instead of
  on every page.
- Smaller, focused files instead of four 600–1,300 line ones (phase 2).

## Non-goals

- No visual or wording changes, no new features, no database/schema changes.
- No decision on the `/v2` landing page. The team is still comparing it
  against `/` (see its header comment), so it and `components/landing/hero-paste.tsx` stay.
- No move of food search to the server. The import matcher needs the whole
  catalog in the browser, so that would be a redesign, not a refactor.

## Anti-goals (a failure even if it "works")

- Any number a user sees changes: calories, macros, grams, servings math.
- A teammate's open branch becomes painful to merge.
- Tests that only test the new code's shape instead of today's behavior.

## Constraints

- Two branches touch the biggest files and aren't merged yet:
  - `UI-customizations` (animations) changes `optimize-chat.tsx`,
    `recipe-builder.tsx`, `shared.tsx` and `recipe-dashboard.tsx`.
  - `URL_parse` (PR #16) changes the builder, import and nutrition code.
    **`Refactor` was branched from `URL_parse`**, so it contains PR #16. PR #16 should
    merge first, or this PR will show its commits too.
- Tests run with what the repo already uses: `node --test` for `lib/`
  (see `lib/recipe-url/ingredient-lines.test.mjs`) and pgTAP for the database.
  Node imports `.ts` files directly, which means no path aliases (`@/`) in code under test.
- Next.js 16 (read `node_modules/next/dist/docs/` before touching framework APIs).

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (picked)** | Safety-net tests first, then delete dead code, remove duplication, and split big files, checked against tests at each step. Speed fixes folded in. | Most upfront work; the only way to honestly promise nothing broke. |
| B | Speed only: measure, fix the biggest wins. | Few files touched, few conflicts, but the code stays tangled. |
| C | Big restructure of state and data flow. | Most fun, highest risk, and it collides hardest with the open branches. |

Picked A, with B's speed wins folded in.

## Design

Two phases, each a separate PR.

### Phase 1 (now): only what the open branches don't touch

1. **Safety net**
   - `npm test`: runs every `lib/**/*.test.mjs` with `node --test`.
   - Unit tests for today's behavior:
     - `lib/nutrition.ts`: amounts, unit conversion including cup/spoon
       portions, partial subtotals, and per-serving math.
     - `lib/foundation-foods.ts`: display names, search ranking, exact match.
     - `lib/optimizer/nutrient-swaps.ts`: swap verification.
     - `lib/recipe-url/extract.ts` and `fetch-page.ts`: JSON-LD and microdata
       reading, and the private-address blocklist.
   - **Browser smoke tests** (`e2e/`, Playwright, `npm run test:e2e`, run against
     the local Supabase stack, with the recipe-import API mocked). They cover:
     - Add ingredients in the builder, change servings, and see the nutrition update.
     - Import a recipe, review it, and see the builder fill in.
     - In the chat: change servings, undo, and reset. The Before → Now table updates.
     - Sign up, log in, and save a recipe, which then shows on the dashboard.
2. **Delete dead code.** None of these files is reachable from any page:
   - `app/protected/` (starter page; login and sign-up now go to `/dashboard`).
     The one link left to it, the redirect after resetting a password
     (`components/update-password-form.tsx`), moves to `/dashboard` too.
     That's the only user-visible change, and it replaces a page of starter tutorial content.
   - `components/tutorial/*` (5 files)
   - `components/foundation-food-picker.tsx`
   - `components/hero.tsx`, `next-logo.tsx`, `supabase-logo.tsx`, `deploy-button.tsx`
   - `components/ui/checkbox.tsx`
3. **Catalog loaded once.** `useUsdaFoods` keeps the food list in a
   module-level cache shared by the builder and chat for the life of the tab.
   It also asks only for the columns the app reads (drops `release_date`).
   Retry still works, and the result for a user is identical.
4. **One amount parser.** `parseAmount` (nutrition) and `toNumber`
   (ingredient-lines) are near-duplicates. Keep one, with a test proving
   both old behaviors (including "1,5" and "1/0") are kept.

### Phase 2 (after PR #16 and the animations branch merge)

- Pull the chat's command handling (servings, undo, reset, remove/add/change,
  swaps) out of `optimize-chat.tsx` into a pure, tested module. Today it's
  locked inside the component, so it can't be unit-tested. The UI and the swap
  flow become their own files.
- Split `shared.tsx` into the catalog hook, the nutrition panel, ingredient
  art, and draft storage.
- Split `recipe-builder.tsx` and `recipe-dashboard.tsx` along the same lines.
- Rename `FoundationFood` → `UsdaFood`, since it covers SR Legacy foods too.

### Every step is checked with

`tsc --noEmit`, `eslint` on changed files, `npm test`, `npm run test:db`,
`npm run test:e2e`, and `next build`. Each step is a small commit. If a check
fails, the step is fixed or dropped, never committed.

## Left to the builder

- Exact test cases, as long as each pins a behavior that exists today.
- Exact file names inside the phase 2 splits.
- Playwright config details: port, timeouts, how the local stack is started.

## Calls I made (not discussed)

- Playwright as a dev dependency for the browser tests. Teammates only download
  its browser if they run `test:e2e`.
- `/v2` is kept (team decision pending). `/protected` is deleted, and the
  password-reset redirect goes to `/dashboard`.
- The 16.19 vs 16.18 rounding difference between the table and the panel is
  **left as is**, because fixing it changes visible numbers. It can be its own small change.
