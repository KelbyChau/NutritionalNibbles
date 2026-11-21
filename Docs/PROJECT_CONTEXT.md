# NutritionalNibbles — Project Context for AI Assistants

> **Purpose:** This file gives teammates and AI coding assistants a shared understanding of the product. It describes **what we want to build**, not how the code must be organized. Read the actual repository before making implementation assumptions.

## Project at a glance

- **Name:** NutritionalNibbles
- **Repository:** https://github.com/KelbyChau/NutritionalNibbles
- **Project:** An AI-assisted recipe nutrition optimizer built by a team of three for a 24-hour hackathon.
- **Core promise:** Help people adapt meals they already enjoy to better fit their macronutrient goals, without unnecessarily sacrificing the dish's taste, texture, or identity.

## Problem we are solving

People who want to eat more protein, fewer calories, or otherwise adjust their macros often have to manually look up ingredients, calculate nutrition, and experiment with substitutions. Many tools either track what someone ate or suggest an entirely different recipe. We want to make improving an **existing favorite recipe** straightforward, understandable, and practical.

## Intended user experience

1. **Provide a recipe.** The user enters recipe text with ingredients, amounts, servings, and any cooking instructions they have.
2. **Review interpretation.** The application identifies ingredients and quantities; the user can fix mistakes or fill in missing details.
3. **See the original nutrition.** Display estimated calories, protein, carbohydrates, and fat, ideally per serving.
4. **Choose a goal.** Initially support higher protein, fewer calories, fewer carbohydrates, or less fat.
5. **Get a revised version.** AI suggests practical ingredient/quantity substitutions and updates cooking instructions where necessary.
6. **Compare and understand.** Show original versus revised nutritional estimates and explain what changed, why, and whether the chosen goal was achieved.

This sequence describes the **experience**, not a required number of pages, steps, or API calls.

## What makes the product valuable

- **Improve a familiar meal, not replace it.** Preserve the dish's recognizable character whenever feasible.
- **Practical substitutions.** Ingredient swaps must be reasonable to purchase, prepare, and cook, not just theoretically healthier.
- **Transparent explanations.** Explain changes in plain language, including likely taste or texture tradeoffs.
- **Understandable comparisons.** Make it easy to see whether an optimization actually improved the requested macro.
- **User control.** Users can correct ingredients, serving sizes, and uncertain interpretation rather than accepting guesses.

## Quality and trust requirements

- Nutrition figures are **estimates**, not medical advice or lab measurements.
- Do not present invented AI-generated nutrition numbers as facts. Use reliable ingredient nutrition information and consistent calculations wherever feasible.
- Account for serving sizes and measurement units; distinguish raw versus cooked ingredients when relevant.
- Flag uncertain ingredient matches or missing amounts for user review instead of silently claiming precision.
- Do not claim an optimization met a goal unless the comparison supports that claim.
- Treat dietary restrictions or allergies carefully; avoid asserting a substitution is safe when the data is uncertain.
- Handle failures and incomplete inputs gracefully, especially during a live demo.

## Scope for the 24-hour hackathon

**Priority: one complete, demonstrable journey** from recipe input through an understandable before-and-after comparison.

Core outcomes:
- Enter a recipe and understand its ingredients.
- Review/correct quantities and servings.
- Estimate baseline macros.
- Select one macro goal.
- Generate a workable revised recipe and updated instructions.
- Re-estimate macros and explain the changes.
- Present clear before-and-after results.

Possible enhancements **only if time permits:** accounts, saved recipes/history, exact numeric targets, multiple goals at once, photo or URL input, and more sophisticated visualizations.

Not needed for the initial demo: a mobile-native app, a custom-trained model, grocery purchasing, a full meal planner, or long-term nutrition tracking.

## Example scenario (illustrative only)

Someone enters a creamy chicken pasta recipe and chooses **higher protein**. The application interprets the listed ingredients, lets them correct any quantities, provides estimated original macros, suggests modifications that aim to keep the dish recognizably creamy chicken pasta, updates preparation instructions, and shows the estimated difference per serving. Any sample macro figures in demos should be labeled as illustrative unless actually calculated from the supported ingredients.

## Guidance for teammates and AI models

- **Use this file as product intent, not proof that any feature already exists.** Inspect the repository to learn its current implementation.
- **Do not assume or invent finalized technical decisions.** This document deliberately does **not** prescribe frameworks, endpoints, database tables, schemas, file/folder structure, UI layout, or service integrations.
- Preserve the product's core purpose and user-facing behavior when suggesting changes.
- Prefer the smallest working implementation that supports the complete demo; avoid premature complexity.
- Before changing existing code, understand the team's current conventions and avoid unrelated rewrites.
- If a technical choice is not documented in the code or explicitly agreed by the team, present it as a proposal rather than an established fact.
- Keep this context updated when the team changes **product requirements**; document implementation decisions separately.

## Success criterion

A person can enter a familiar recipe, choose a macro goal, receive understandable and practical changes, and see a credible before-and-after nutrition comparison that explains whether the goal was met.
