# NutritionalNibbles redesign: Apple-style, Health-app data

Date: 2026-11-22 · Branch: `Refactor` (on top of the refactor; the owner asked
for one branch)

## Why

Make NutritionalNibbles look grand and professional, following Apple's design
principles: clarity, deference to content, depth, generous space, precise
type, restrained color, motion that explains. **Every feature keeps
working.** The browser tests from the refactor prove it page by page.

## Direction (picked: A)

- **Public pages** (landing, sign-in): an apple.com *product page*. Near-white
  canvas, very large tight headlines, a frosted navigation bar, full-width
  sections, and lots of space.
- **App screens** (builder, chat, dashboard): Apple's *Health and Fitness apps*.
  Soft rounded panels on light gray, one signature color per nutrient,
  Activity-style rings, and big confident numbers. Dark mode matches.

**The one memorable element: nutrition rings.** A recipe's calories,
protein, carbs and fat show as concentric rings. They're the landing hero and
the top of the app's nutrition panel, and they animate only when the numbers
change, so the motion shows what an edit did. Everything else is quiet.

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (picked)** | apple.com product pages for public pages + Health app for the app screens | Two registers to keep consistent; the best fit for a nutrition product |
| B | apple.com minimalism everywhere, one accent | Elegant, but dense app screens feel sparse and nutrients lose quick color coding |
| C | visionOS glass layers | Most dramatic; glass hurts legibility on data screens and heavy blur is slow on phones |

## Design tokens

**Color.** Light mode (dark mode in brackets):

| Role | Value | Notes |
|---|---|---|
| Canvas (app background) | `#F5F5F7` (`#000000`) | Apple's light gray / true black |
| Surface (panels, cards) | `#FFFFFF` (`#1C1C1E`) | raised panels, second level `#F2F2F4` (`#2C2C2E`) |
| Ink | `#1D1D1F` (`#F5F5F7`) | primary text |
| Secondary ink | `#6E6E73` (`#98989D`) | captions, units; ≥ 4.5:1 on surface |
| Hairline | `#D2D2D7` (`#38383A`) | separators only, never boxes around everything |
| Action | `#0B7A3E` (`#30D158`) | NutritionalNibbles green: buttons, links, focus; white text ≥ 4.5:1 in light mode |

**Nutrient colors** (rings, chips, chart marks; tuned from Apple's system
colors):

| Nutrient | Light | Dark |
|---|---|---|
| Calories | `#FF2D55` | `#FF375F` |
| Protein | `#5856D6` | `#5E5CE6` |
| Carbs | `#FF9500` | `#FF9F0A` |
| Fat | `#30B0C7` | `#64D2FF` |
| Sodium / sugar | Secondary ink with a small colored dot | no extra hues |

Nutrient colors are only used for nutrient data, never for decoration.

**Type.** The system font, which is San Francisco on Apple devices:
- **Stack:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", var(--font-inter), system-ui, sans-serif`
- **Other devices:** Inter (`next/font`) is the fallback, replacing Geist.
- **Numbers:** `ui-rounded` (SF Pro Rounded) with tabular figures, the Health-app look.
- **Removed:** Instrument Serif. The serif `font-display` class is replaced by a `display` sans style.

Scale (desktop / mobile):

| Style | Size | Weight | Letter spacing |
|---|---|---|---|
| Hero | 80 / 48 px, 1.05 line height | semibold | −0.02em |
| Section title | 48 / 34 px | semibold | −0.015em |
| Panel title | 22 px | semibold | |
| Big number | 56 px, rounded | bold | |
| Body | 17 px, 1.47 line height | | |
| Caption | 13 px | | |

- Sentence case everywhere. No all-caps labels. Body lines under 80 characters.

**Shape and depth:**
- **Radius follows hierarchy:**
  - page panels 28px
  - cards 20px
  - rows and inputs 12px
  - buttons and chips fully rounded
- **Shadows:** soft and only on raised panels: `0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)`. Dark mode separates layers by surface color instead.
- **Frosted glass is used in two places only:** the sticky nav and the chat input bar (`backdrop-filter: saturate(180%) blur(20px)` over 72% canvas).

**Motion:**
- Ring fills and number changes ease in about 600 ms, when the data changes.
- Panels open and close with a spring.
- One landing sequence: the hero rings fill once on load.
- No scroll-triggered fades on every section.
- `prefers-reduced-motion` turns all of it off.

## Pages

**Landing (`/`).** Product-page rhythm, centered:
```
[ frosted nav: NutritionalNibbles · How it works · Create a recipe · Saved recipes · Sign in ]
            Know what's in every recipe.
   Paste a link or add ingredients. See the nutrition, then make it better.
            [ Create a recipe ]   See how it works
                  (( rings for a sample dish ))
                  Lemon chicken & asparagus · per serving
---------------------------------------------------------------- canvas
  How it works: three real steps (numbered, because it is a sequence)
  Add or import → see the nutrition → ask for a lighter version
================================================================ black band
  The swap showcase: before/after rings + "Salted butter → unsalted, −95 mg sodium"
---------------------------------------------------------------- canvas
  Closing call to action + footer
```

**Builder (`/optimize`).** The same three areas as today, restyled:
- the ingredient list on the left (white panel, rows with ingredient art)
- the plate in the middle (a large white circular plate on the canvas)
- nutrition on the right: rings, then an Apple-style nutrition list with hairlines between rows

The header holds the title field (large, borderless), servings as a pill
stepper, and Import, Save and Optimize as pills (Optimize is the green one).

**Chat (`/optimize/chat`).**
- **Messages:** your messages sit right in green bubbles, the assistant's left in gray bubbles (Messages-style). Suggested actions sit under each bubble as small pills.
- **Input:** frosted at the bottom.
- **Right column:** "Before → Now" as a pair of small ring sets plus a delta list, the recipe card below it, then the nutrition panel.

**Dashboard (`/dashboard`).** An App Store "Today"-style featured card
(large, with ingredient art and rings), then a responsive grid of recipe
cards (title, time, protein and calories as colored chips). Search and filter
are pills.

**Auth pages.** A centered card on the canvas with the wordmark above, large
inputs and one green button.

**Import dialog.** A sheet-style modal (large radius, dimmed blurred
backdrop). Match badges become colored chips: green "Matched", orange "Check
match".

## Goals

- Every page above restyled to these tokens, light and dark, down to phone width.
- Reusable pieces: `NutritionRings`, `Pill`/`Button` variants, `Panel`, and
  updated `components/ui/*` primitives, so pages stay consistent.

## Non-goals

- No feature, route, data or database changes. No new copy in chat replies:
  every assistant reply stays word for word.
- No Apple logos, icons, product images or Apple font files. The system
  font stack only names SF, which the device already has.
- `/v2` gets the new look only through the shared landing pieces it reuses;
  no extra work on it.

## Anti-goals

- Anything a user could do before that breaks or moves out of reach.
- A generic "SaaS card kit" look: identical cards with one radius and gray
  shadows everywhere. Hierarchy comes from space, type and surface, not boxes.
- Color used as decoration. Color means a nutrient, an action, or a state.

## Constraints

- Next.js 16.4.6 (read `node_modules/next/dist/docs/` before framework APIs),
  Tailwind with shadcn-style HSL variables in `app/globals.css`, and `motion` for animation.
- **Browser tests use accessible names** ("Add an ingredient", "Estimated
  nutrition", "Your recipe", "Tell the optimizer what to change", button
  names) **and one class selector** (`.font-display.text-5xl` for the calorie
  number). Accessible names stay the same. The class selector gets replaced
  by a stable `data-testid="calories-value"`. Tests change only in selectors,
  never in what they check.
- Contrast ≥ 4.5:1 for text, visible keyboard focus everywhere.

## How it's checked

For each page:
- the full browser test suite (12 tests)
- typecheck and lint
- both production builds
- screenshots at 1440 px and 390 px, light and dark, reviewed against this doc before moving on

## Calls made while writing this (check these)

- **A full ring = 100% of the daily value per serving,** using the same daily
  values the nutrition panel already shows (`dailyValues` in `lib/nutrition.ts`).
  - Over 100% shows as a full ring plus the number; no extra laps.
  - The existing macro split (protein/carbs/fat % of calories) stays as text under the rings.
- **The landing sample dish is fixed data:** two foods, computed with the app's own `calculateNutrition`, so its numbers are real.
- **The landing's second link is "See how it works"** (scrolls down), not an import shortcut. Opening the import dialog from the landing page would be a new feature.
- **The theme switch stays** (light, dark, system), now as a small pill.

## Left to the builder

- Exact component file names.
- The precise spring and easing values.
- The sample dish and copy details on the landing page, within the content above.
