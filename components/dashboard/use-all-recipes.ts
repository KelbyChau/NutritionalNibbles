"use client";

import { useEffect, useState } from "react";
import {
  listRecipes,
  MAX_PAGE_SIZE,
  type RecipeCursor,
  type RecipeListItem,
} from "@/lib/recipes/queries";
import { createClient } from "@/lib/supabase/client";

/**
 * Starts from the first page the server rendered, then queries Supabase from
 * the browser for every remaining page, so the dashboard's search, filters and
 * sorts cover all recipes, not just the first page. Row-level security limits
 * the results to public recipes plus the signed-in user's own.
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
    listRecipes(createClient(), null, {
      scope: "all",
      limit: MAX_PAGE_SIZE,
      cursor: next,
      signal: controller.signal,
    }).then((page) => {
      if (controller.signal.aborted) return;
      if (page.error) {
        setError(page.error.message || "Could not load more recipes");
        return;
      }
      setRecipes((current) => {
        const seen = new Set(current.map((r) => r.id));
        return [...current, ...page.recipes.filter((r) => !seen.has(r.id))];
      });
      setNext(page.next); // a new cursor runs this effect again for the next page
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
