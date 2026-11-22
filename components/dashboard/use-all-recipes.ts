"use client";

import { useEffect, useState } from "react";
import { fetchRecipePage } from "@/lib/recipes/api-client";
import type { RecipeCursor, RecipeListItem } from "@/lib/recipes/queries";
import { MAX_PAGE_SIZE } from "@/lib/recipes/validation";

/**
 * Starts from the first page the server rendered, then loads every remaining
 * page from GET /api/recipes in the background, so the dashboard's search,
 * filters and sorts cover all recipes, not just the first page.
 */
export function useAllRecipes(
  initialRecipes: RecipeListItem[],
  initialNext: RecipeCursor | null,
) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [next, setNext] = useState(initialNext);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // A server re-render (e.g. router.refresh()) sends a new first page: start over.
  const [source, setSource] = useState(initialRecipes);
  if (source !== initialRecipes) {
    setSource(initialRecipes);
    setRecipes(initialRecipes);
    setNext(initialNext);
    setError(null);
  }

  useEffect(() => {
    if (!next) return;
    const controller = new AbortController();
    fetchRecipePage(next, { limit: MAX_PAGE_SIZE, signal: controller.signal })
      .then((page) => {
        if (controller.signal.aborted) return;
        setRecipes((current) => {
          const seen = new Set(current.map((r) => r.id));
          return [...current, ...page.recipes.filter((r) => !seen.has(r.id))];
        });
        setNext(page.next); // a new cursor runs this effect again for the next page
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Could not load more recipes");
      });
    return () => controller.abort();
  }, [next, attempt]);

  return {
    recipes,
    loadingMore: next !== null && error === null,
    loadMoreError: error,
    retry() {
      setError(null);
      setAttempt((n) => n + 1);
    },
  };
}
