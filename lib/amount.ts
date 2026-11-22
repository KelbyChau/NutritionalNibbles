// Reads an amount as typed in a recipe: "2", "2.5", "1/2", "1 1/2".
// Shared by the nutrition math and the recipe importer. No imports, so
// Node's test runner can load it from either side.
export function parseAmount(amount: string): number | null {
  const a = amount.trim();
  if (!a) return null;
  const mixed = a.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return +mixed[1] + +mixed[2] / +mixed[3];
  const frac = a.match(/^(\d+)\/(\d+)$/);
  if (frac) return +frac[1] / +frac[2];
  const n = Number(a);
  return Number.isFinite(n) ? n : null;
}
