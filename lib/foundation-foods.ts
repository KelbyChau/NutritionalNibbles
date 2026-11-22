export type FoundationFood = {
  fdc_id: number;
  description: string;
  kcal_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
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
  return foods.filter(food => {
    const tokens = words(food.description);
    return terms.every(term => tokens.some(token => token.startsWith(term)));
  }).sort((a, b) => {
    const starts = (food: FoundationFood) =>
      Number(food.description.toLowerCase().startsWith(query.toLowerCase()));
    return starts(b) - starts(a) || a.description.localeCompare(b.description) || a.fdc_id - b.fdc_id;
  }).slice(0, 6);
}

export function exactFood(foods: FoundationFood[], name: string) {
  const normalized = name.trim().toLowerCase();
  const matches = foods.filter(food => food.description.toLowerCase() === normalized ||
    foodLabel(food.description).toLowerCase() === normalized);
  return matches.length === 1 ? matches[0] : undefined;
}
