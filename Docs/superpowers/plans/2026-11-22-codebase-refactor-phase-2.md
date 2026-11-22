# Codebase Refactor — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the four biggest files into focused ones, pull the chat's command reading into a pure tested module, and rename `FoundationFood` → `UsdaFood`, with no change a user can see.

**Architecture:**
- First, pin every chat command's reply with browser tests, since only servings, remove, undo and reset are covered today.
- Then extract `parseChatCommand`, which reads a message into a typed command, test-first. The component keeps carrying commands out, because that needs React state.
- Everything else is a pure move: code changes files, and imports point at the new files directly (no re-export barrel). The phase 1 tests and the browser tests are the gate for each move.

**Tech Stack:** Next.js 16.4.6, React, `node --test`, Playwright (from phase 1).

**Spec:** `Docs/superpowers/specs/2026-11-22-codebase-refactor-design.md` (Phase 2 section). Branch `refactor-phase-2`, stacked on `Refactor`.

## Global Constraints

- Every feature keeps working exactly as today. No visual, wording or number changes, and every chat reply text stays identical.
- Moves are moves: no logic changes in the same commit as a move.
- Code under `node --test` must not import `@/` paths at runtime (type-only imports are fine) or use TypeScript-only runtime syntax.
- Any new file that uses hooks, state, browser APIs or `motion` starts with `"use client"`.
- Gate for every commit: `npx tsc --noEmit -p .`, `npx eslint <changed files>`, `npm test`, `npm run test:e2e`.

## Review Focus

1. A moved component that loses `"use client"` crashes the page only at runtime. The browser tests must open the builder, chat, import dialog and dashboard after each move: covered by the four existing specs plus Task 1.
2. Circular imports between the new `chat/`, `builder/` and shared files can leave an export `undefined` at load time. Check with `npx next build` in Task 7.
3. The draft hand-off key `"nutritionalnibbles:optimize-draft"` and its shape must not change, or a builder → chat hand-off made before a deploy breaks. Task 4 keeps the constant byte-identical.
4. Combobox keyboard behavior (arrow keys, Enter, Escape) has no test. Task 4 moves it verbatim, and Task 1's `add` command test goes through it.
5. A chat message that matches no command must still get the help text, and the nutrient prompts ("make it lower in sodium") must still reach the Gemini path. Task 2 pins `{kind:"other"}` for both. The Gemini call itself isn't in e2e, so it's not exercised.

---

### Task 1: Pin every chat command in the browser

**Files:** Create: `e2e/chat-commands.spec.ts` (uses `e2e/helpers.ts`: `seedDraft`, `draftOf`, `waitForCatalog`).

- [ ] **Step 1: Write one test per command** on the steak + asparagus draft (2 servings). Send each message to the "Tell the optimizer what to change" box and assert the assistant reply. These pin the current text:

  | Message | Expected reply |
  |---|---|
  | `undo` (fresh chat) | `Nothing to undo.` |
  | `use half the steak` | `Changed beef (top sirloin steak, raw).`, then the steak shows `200 g` |
  | `change asparagus to 100 g` | `Asparagus (raw) is now 100 g.` |
  | `add 100 g spinach` | matches `/^Added 100 g spinach/i`; the recipe lists a new item tagged `New` |
  | `add 100 g spinach` again | matches `/is already in the recipe\. Change its amount instead of adding it again\./` |
  | `swap asparagus for broccoli` | matches `/^Swapped asparagus \(raw\) for broccoli/i`; the item is tagged `Swapped` |
  | `remove garlic` | `I don't see “garlic” in the recipe.` |
  | `make it 5 servings` | `Now 5 servings.` |
  | `hello there` | starts with `I can make these changes right now:` |
- [ ] **Step 2:** Run `npx playwright test e2e/chat-commands.spec.ts`. Expected: all pass on today's code. If one fails, the expected text is wrong: read the actual reply and fix the spec, not the app.
- [ ] **Step 3:** Commit: `"Pin every chat command's reply with browser tests"`

### Task 2: Read chat messages with a pure, tested parser

**Files:**
- Create: `components/optimize/chat/commands.ts`, `components/optimize/chat/commands.test.mjs`
- Modify: `package.json` (the `test` script also globs `components/**/*.test.mjs`), `components/optimize/optimize-chat.tsx` (`handle` and `findIngredient`, lines 274–290 and 443–673)

**Interfaces — Produces:**
```ts
export type ChatCommand =
  | { kind: "undo" }
  | { kind: "reset" }
  | { kind: "servings"; servings: number }            // clamped to 1–24
  | { kind: "remove"; target: string }
  | { kind: "swap"; target: string; replacement: string; lighter: boolean }
  | { kind: "scale"; target: string; factor: number } // may be ≤ 0 → caller removes
  | { kind: "setAmount"; target: string; amount: string; unit: string | null } // unit lowercased, "cups"→"cup"
  | { kind: "add"; text: string }                     // text after "add "
  | { kind: "other"; text: string };                  // goals, nutrient prompts, help
export function parseChatCommand(message: string): ChatCommand | null; // null when blank after trim
export function findIngredient<T extends { name: string }>(ingredients: T[], term: string): T | undefined;
```
`findIngredient` is today's in-component `findIngredient` (lines 274–290), unchanged except that it takes the list as a parameter. The regexes are copied verbatim from `handle`.

- [ ] **Step 1: Write `commands.test.mjs`.** Cases:
  - `"  "→null`
  - `"Undo"→undo`; `"reset please"→reset` (prefix match, as today); `"start over"→reset`
  - `"4 servings"`, `"serves 4"`, `"make it 4 servings"` → `{servings:4}`; `"99 servings"→24`; `"0 servings"→1`
  - `"take out the garlic"→{remove,"the garlic"}`
  - `"swap rice for something lighter"→{swap,"rice","something lighter",lighter:true}`; `"replace cream with greek yogurt"→lighter:false`
  - `"use 25% less pasta"→0.75`; `"half the butter"→0.5`; `"double the beef"→2`; `"use 100% less salt"→0`
  - `"change chicken to 300 g"→{setAmount,"chicken","300","g"}`; `"set milk to 2 cups"→unit "cup"`; `"change egg to 3"→unit null`
  - `"add 100 g spinach"→{add,"100 g spinach"}`
  - `"make it lower in sodium"→other`; `"hello"→other`

  For `findIngredient`, use today's matching rules: read lines 274–290 first. The tests cover a prefix like "the "/"my ", a partial word, and no match → `undefined`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement `commands.ts` with no runtime imports.
- [ ] **Step 4:** Run `npm test`. Expected: pass.
- [ ] **Step 5:** Rewrite `handle` as `const command = parseChatCommand(text); if (!command) return; switch (command.kind) { … }`. Each case keeps its current body and reply text. The `other` case keeps today's order: `promptGoals` → mentioned goal → "suggest/ideas" → help text. Delete the in-component `findIngredient`.
- [ ] **Step 6:** Run `npx tsc --noEmit -p .`, `npm test`, and `npm run test:e2e` (including Task 1). Expected: all pass.
- [ ] **Step 7:** Commit: `"Read chat messages with a pure, tested command parser"`

### Task 3: Move the chat's pieces out of `optimize-chat.tsx`

**Files:** Create in `components/optimize/chat/`:
- `comparison.tsx`: `Comparison`, `perServingComparison`
- `pieces.tsx`: `Shell`, `ActionButton`, `IconButton`
- `suggestions.ts`: `chatSuggestions`
- `swap-text.ts`: `formatChange`, `describeChanges`, `builtInGoal`, `lower`, `formatAmount`

Modify `optimize-chat.tsx` to import them. Export the shared types (`Action`, `Message`, `Suggestion`, `NutrientSwapAction`) from `chat/types.ts`.

- [ ] **Step 1:** Move the code verbatim and add `"use client"` to the `.tsx` files.
- [ ] **Step 2:** Run the gate. Expected: all pass; `optimize-chat.tsx` is ≤ 750 lines.
- [ ] **Step 3:** Commit: `"Split the optimizer chat into focused files"`

### Task 4: Split `shared.tsx`

**Files:** Create in `components/optimize/`:
- `draft.ts`: `OptimizeDraft`, `saveDraft`, `clearDraft`, `loadDraft`, `DRAFT_KEY`, unchanged
- `ingredients.ts`: `useUsdaFoods`, `makeIngredient`, `ingredientWithFood`, `alreadyAddedMessage`, `ingredientOptions`
- `combobox.tsx`: `Combobox`
- `nutrition-panel.tsx`: `NutritionPanel`, `factRows`, `formatCalories`, `fmtNutrient`

`shared.tsx` keeps `GoalKey`, `goals`, `Ingredient`, `BUTTER`, `SHADOW`, `IngredientArt`, `Stat`, and whatever it re-exports today (`AnimatedNumber`, `fmtCount`). Modify every importer (`optimize-chat.tsx`, `recipe-builder.tsx`, `recipe-import.tsx`, `changes.ts`, `chat/*`) to import from the new files.

- [ ] **Step 1:** Run `git grep -n 'from "./shared"\|optimize/shared"'` to list the importers.
- [ ] **Step 2:** Move the code verbatim, then fix the imports.
- [ ] **Step 3:** Run the gate, plus `git grep -c "nutritionalnibbles:optimize-draft"`. Expected: all pass, and the key appears exactly once (in `draft.ts`).
- [ ] **Step 4:** Commit: `"Split the shared optimize helpers into focused files"`

### Task 5: Split the builder and the dashboard

**Files:**
- Create:
  - `components/optimize/builder/stage.tsx`: `Stage`, `spots`, `sampleIngredients`
  - `components/optimize/builder/ingredient-list.tsx`: `IngredientCard`, `AddIngredient`
  - `components/dashboard/recipe-cards.tsx`: `FeaturedRecipe`, `RecipeCard`, `EmptyState`, `cardExit`, `fmt`
- Modify:
  - `recipe-builder.tsx` and `recipe-dashboard.tsx` import the moved pieces
  - the dashboard's duplicate `BUTTER` constant is replaced by the import from `shared.tsx`, which is the same string

- [ ] **Step 1:** Move the code verbatim and add `"use client"` where needed. Confirm the two `BUTTER` strings are identical before replacing.
- [ ] **Step 2:** Run the gate. Expected: all pass.
- [ ] **Step 3:** Commit: `"Split the recipe builder and dashboard into focused files"`

### Task 6: Rename `FoundationFood` → `UsdaFood`

**Files:** Every file that uses the type. Find them with `git grep -l "\bFoundationFood\b" -- app components lib e2e`.

- [ ] **Step 1:** Rename the type in `lib/foundation-foods.ts` and replace each use, whole words only. The file name `lib/foundation-foods.ts` stays as is (not in the spec).
- [ ] **Step 2:** Run the gate. `git grep -n "\bFoundationFood\b"` should return no hits.
- [ ] **Step 3:** Commit: `"Rename FoundationFood to UsdaFood (it covers SR Legacy too)"`

### Task 7: Whole-branch check and PR

- [ ] **Step 1:** Run each check and confirm it passes:
  - `npm test`
  - `npm run test:db`
  - `npm run test:e2e`
  - `npx tsc --noEmit -p .`
  - `npx eslint app components lib e2e`
  - `npx next build` (Turbopack, what Vercel runs)
  - `npx next build --webpack`
- [ ] **Step 2:** Line counts: none of `optimize-chat.tsx`, `shared.tsx`, `recipe-builder.tsx`, `recipe-dashboard.tsx` is over 750 lines.
- [ ] **Step 3:** Push `refactor-phase-2` and give the PR link. Its base is `Refactor` until that merges, then `main`.
