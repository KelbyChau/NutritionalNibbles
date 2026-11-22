// The recipe handed from the builder to the chat page (and back).
// Kept in sessionStorage (this tab only). `original` is the recipe as it was
// when Optimize was pressed; `current` is the latest edited version.

import type { Ingredient } from "./shared";

export type OptimizeDraft = {
  title: string;
  servings: number;
  original: Ingredient[];
  current: Ingredient[];
  /** Set once the recipe is saved, so saving again updates it. */
  savedId?: string | null;
};

const DRAFT_KEY = "nutritionalnibbles:optimize-draft";

export function saveDraft(draft: OptimizeDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage blocked (private window etc.): the chat page shows its empty state.
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage blocked: nothing to clear.
  }
}

export function loadDraft(): OptimizeDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as OptimizeDraft;
    return Array.isArray(d.current) && Array.isArray(d.original) ? d : null;
  } catch {
    return null;
  }
}
