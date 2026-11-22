// Browser-side client for GET /api/recipes. Type-only imports, so nothing
// server-side ends up in the client bundle.
import type { RecipeCursor, RecipePage } from "./queries";

/**
 * Fetches one page of recipes from GET /api/recipes, starting after `cursor`
 * (or from the newest recipe when cursor is null). Throws on any failure.
 */
export async function fetchRecipePage(
  cursor: RecipeCursor | null,
  { limit, signal }: { limit: number; signal?: AbortSignal },
): Promise<RecipePage> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    params.set("before", cursor.before);
    params.set("before_id", cursor.before_id);
  }

  const res = await fetch(`/api/recipes?${params}`, { signal });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || !Array.isArray(body.recipes)) {
    throw new Error(body?.error ?? `Could not load recipes (HTTP ${res.status})`);
  }
  return { recipes: body.recipes, next: body.next ?? null };
}
