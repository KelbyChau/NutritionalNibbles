export type FoundationFood = {
  fdc_id: number;
  description: string;
  kcal_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  // Which USDA catalog it came from. Only used to rank search results;
  // both catalogs share one search field.
  source?: "foundation" | "sr_legacy";
};

export function foodLabel(description: string) {
  // A comma inside an existing parenthetical is part of the name.
  const parts = description.trim().split(/,\s*(?![^()]*\))/);
  const [name, ...details] = parts;
  if (!details.length) return name;
  const cut = /^chicken$/i.test(name)
    ? details.find(detail => /^(breast|thigh|drumstick|wing)$/i.test(detail))
    : undefined;
  const heading = cut ? name + " " + cut[0].toUpperCase() + cut.slice(1) : name;
  return heading + " (" + details.join(", ") + ")";
}

const words = (name: string) => name.toLowerCase().match(/[a-z0-9]+/g) ?? [];

export function foodSuggestions(foods: FoundationFood[], query: string) {
  const terms = words(query);
  if (!terms.length) return [];
  const matches: { food: FoundationFood; rank: number[] }[] = [];
  for (const food of foods) {
    const tokens = words(food.description);
    // Every typed word must start a word in the name ("chick" finds chicken).
    if (!terms.every(term => tokens.some(token => token.startsWith(term)))) continue;
    // Best first: whole words typed ("egg" → Egg, not Eggplant), the name starts
    // with the first word, Foundation before SR Legacy, then plainer (shorter) names.
    const whole = terms.every(term =>
      tokens.some(token => token === term || token === term + "s" || token === term + "es"));
    matches.push({
      food,
      rank: [
        Number(!whole),
        Number(!tokens[0]?.startsWith(terms[0]!)),
        Number(food.source === "sr_legacy"),
        food.description.length,
      ],
    });
  }
  return matches.sort((a, b) => {
    for (let i = 0; i < a.rank.length; i++) if (a.rank[i] !== b.rank[i]) return a.rank[i] - b.rank[i];
    return a.food.description.localeCompare(b.food.description) || a.food.fdc_id - b.food.fdc_id;
  }).slice(0, 6).map(m => m.food);
}

export function exactFood(foods: FoundationFood[], name: string) {
  const normalized = name.trim().toLowerCase();
  const matches = foods.filter(food => food.description.toLowerCase() === normalized ||
    foodLabel(food.description).toLowerCase() === normalized);
  return matches.length === 1 ? matches[0] : undefined;
}
