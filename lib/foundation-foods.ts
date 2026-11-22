export type FoundationFood = {
  fdc_id: number;
  description: string;
  kcal_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  total_sugars_g_per_100g?: number | null;
  sodium_mg_per_100g?: number | null;
  // Which USDA catalog it came from. Only used to rank search results;
  // both catalogs share one search field.
  source?: "foundation" | "sr_legacy";
};

// USDA names start with a category: "Syrups, maple", "Spices, paprika".
// Shown as-is, the card's big heading would just say "Syrups". For these
// categories we put the food first, the way people say it.

// Read naturally when flipped: "Syrups, maple" → "Maple syrup".
const flipCategories: Record<string, string> = {
  syrups: "syrup", sugars: "sugar", oil: "oil", vinegar: "vinegar", flour: "flour",
  "wheat flour": "wheat flour", cheese: "cheese", milk: "milk", cream: "cream",
  yogurt: "yogurt", beans: "beans", "lima beans": "lima beans", peppers: "peppers",
  rice: "rice", sauce: "sauce", soup: "soup", gravy: "gravy", "salad dressing": "dressing",
  puddings: "pudding", cake: "cake", pie: "pie", cookies: "cookies", crackers: "crackers",
  bread: "bread", rolls: "rolls", muffins: "muffins", bagels: "bagels", pancakes: "pancakes",
  noodles: "noodles", "ice creams": "ice cream", frostings: "frosting",
  // USDA sometimes uses the singular: "Syrup, Cane", "Sugar, turbinado".
  syrup: "syrup", sugar: "sugar", oils: "oil", pepper: "pepper",
};
// The category adds nothing: "Spices, paprika" → "Paprika".
const dropCategories = new Set([
  "spices", "nuts", "seeds", "fish", "mollusks", "crustaceans", "game meat", "candies",
  "leavening agents", "beverages", "snacks", "alcoholic beverage", "frozen novelties",
]);
// In these, a one-word variety after the food goes in front of it:
// "Fish, salmon, Atlantic" → "Atlantic salmon", "Spices, pepper, black" → "Black pepper".
const varietyCategories = new Set(["spices", "nuts", "fish", "mollusks", "crustaceans", "game meat"]);
// Food nouns that already end a name, so "Italian dressing" doesn't become "Italian dressing dressing".
const endsWithFood = new Set([...Object.values(flipCategories).map(n => n.split(" ").pop()!), "crackers", "biscuits", "chips", "bars"]);
// Words that describe a state, not a kind, so they never move into the name.
const stateWords = /^(raw|cooked|canned|dried|dry|frozen|fresh|fluid|prepared|unprepared|plain|regular|whole|all types|ready-to-serve)$/i;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function foodLabel(description: string) {
  // A comma inside an existing parenthetical is part of the name.
  const parts = description.trim().split(/,\s*(?![^()]*\))/);
  const [name, ...details] = parts;
  if (!details.length) return name;
  const category = name.toLowerCase();
  // "pumpkin seeds (pepitas)" → name part "pumpkin seeds", note "pepitas" joins the details,
  // so the label never ends up with two sets of parentheses.
  const [, kind, note] = details[0].match(/^(.*?)\s*(?:\((.*)\))?$/)!;
  const next = details[1];

  let heading = name;
  let rest = details;
  if (category in flipCategories && !stateWords.test(kind)) {
    const noun = flipCategories[category];
    const last = kind.toLowerCase().split(" ").pop()!;
    heading = capitalize(kind) + (endsWithFood.has(last) || last === noun ? "" : " " + noun);
    rest = [...(note ? [note] : []), ...details.slice(1)];
  } else if (dropCategories.has(category)) {
    const variety = varietyCategories.has(category) && !kind.includes(" ") && next &&
      !next.includes(" ") && !stateWords.test(next) ? next : "";
    heading = capitalize(variety ? variety.toLowerCase() + " " + kind : kind);
    rest = [...(note ? [note] : []), ...details.slice(variety ? 2 : 1)];
  } else if (category === "chicken") {
    const cut = details.find(detail => /^(breast|thigh|drumstick|wing)$/i.test(detail));
    if (cut) {
      heading = name + " " + capitalize(cut);
      rest = details.filter(detail => detail !== cut);
    }
  }
  return rest.length ? heading + " (" + rest.join(", ") + ")" : heading;
}

// The name without the "(…)" details: "Olive oil (extra virgin)" → "Olive oil".
export function foodName(description: string) {
  return foodLabel(description).replace(/\s*\(.*\)$/, "");
}

const words = (name: string) => name.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/** `exclude` holds fdc_ids to leave out, such as foods already in the recipe. */
export function foodSuggestions(
  foods: FoundationFood[],
  query: string,
  exclude?: ReadonlySet<number>,
) {
  const terms = words(query);
  if (!terms.length) return [];
  const matches: { food: FoundationFood; rank: number[] }[] = [];
  for (const food of foods) {
    if (exclude?.has(food.fdc_id)) continue;
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
