// Ingredient helpers for the recipe builder (/optimize).
//
export type IngredientInfo = { name: string; emoji: string; image?: string };

// Match named foods before broader families. Word boundaries avoid matches
// like pineapple picking up the apple illustration.
const ingredientArtwork = [
  ["sweet-potato", /\bsweet potatoes?$/i],
  ["cauliflower-rice", /\b(?:riced cauliflower|cauliflower rice)$/i],
  ["peanut-butter", /\bpeanut butter$/i],
  ["chicken", /^chicken(?: (?:breasts?|thighs?|drumsticks?|wings?))?$|\bchicken (?:breasts?|thighs?|drumsticks?|wings?)$/i],
  ["beef", /^beef$|\b(?:ground beef|beef steaks?|steaks?)$/i],
  ["salmon", /\bsalmon(?: fillets?)?$/i],
  ["eggs", /\b(?:eggs?|egg whites?|egg yolks?)$/i],
  ["cheese", /\b(?:cheese|parmesan|mozzarella|cheddar|feta|gouda|ricotta)$/i],
  ["dairy", /\b(?:milk|yogurt|cream)$/i],
  ["butter", /^(?:(?:un)?salted )?butter$/i],
  ["olive-oil", /\bolive oil$/i],
  ["rice", /^(?!.*\bcauliflower\b).*\brice$/i],
  ["pasta", /\b(?:pasta|spaghetti|fettuccine|linguine|penne|macaroni|noodles?)$/i],
  ["bread", /\bbread$/i],
  ["potatoes", /\bpotato(?:es)?$/i],
  ["tomato", /\btomato(?:es)?$/i],
  ["broccoli", /\bbroccoli(?: florets?)?$/i],
  ["onion", /\bonions?$/i],
  ["carrot", /\bcarrots?$/i],
  ["garlic", /\bgarlic(?: (?:cloves?|bulbs?))?$/i],
  ["lemon", /\blemons?$/i],
  ["mushrooms", /\bmushrooms?$/i],
  ["bell-pepper", /\b(?:bell|sweet) peppers?$/i],
  ["avocado", /\bavocados?$/i],
  ["spinach", /\bspinach(?: leaves)?$/i],
  ["tofu", /\btofu$/i],
  ["shrimp", /\bshrimp(?:s)?$/i],
  ["ground-turkey", /\b(?:ground turkey|turkey ground)$/i],
  ["oats", /\b(?:oats?|oatmeal|oat flakes)$/i],
  ["black-beans", /\bblack (?:turtle )?beans?$/i],
  ["chickpeas", /\b(?:chickpeas?|garbanzo beans?|bengal gram)$/i],
  ["mixed-berries", /^(?:(?:fresh|frozen|mixed|assorted) )*(?:berry mix|berries)$/i],
  ["blueberries", /\bblueberr(?:y|ies)$/i],
  ["strawberries", /\bstrawberr(?:y|ies)$/i],
  ["raspberries", /\braspberr(?:y|ies)$/i],
  ["blackberries", /\bblackberr(?:y|ies)$/i],
  ["banana", /\bbananas?$/i],
  ["apple", /\bapples?$/i],
  ["orange", /\boranges?$/i],
  ["lentils", /\blentils?$/i],
  ["kidney-beans", /\bkidney beans?$/i],
  ["edamame", /\b(?:edamame|green soybeans?)$/i],
  ["quinoa", /\bquinoa$/i],
  ["lime", /\blimes?$/i],
  ["corn", /\bcorn(?: kernels?| on the cob)?$/i],
  ["cucumber", /\bcucumbers?$/i],
  ["lettuce", /\blettuce$/i],
  ["asparagus", /\basparagus(?: spears?)?$/i],
  ["zucchini", /\b(?:zucchini|courgettes?)$/i],
  ["tuna", /\btuna(?: steaks?| fillets?)?$/i],
  ["pork-chop", /\bpork chops?$/i],
  ["tortilla", /\btortillas?$/i],
  ["flour", /\bflour$/i],
  ["almonds", /\balmonds?$/i],
  ["basil", /\bbasil$/i],
  ["rosemary", /\brosemary$/i],
] as const;

// Some USDA labels put the food variety inside the preparation notes.
const artworkWithVarietyNotes = [
  ["ground-turkey", /^turkey\s*\(ground\b/i],
  ["oats", /^cereals?\s*\(oats?\b/i],
  ["edamame", /^soybeans?\s*\(green\b/i],
  ["zucchini", /^squash\s*\([^)]*\bzucchini\b/i],
  ["pork-chop", /^pork\s*\(.*\bchops?\b/i],
] as const;

export function ingredientImage(name: string) {
  const displayName = name.trim();
  const label = displayName.split("(")[0].trim();
  const match =
    artworkWithVarietyNotes.find(([, pattern]) => pattern.test(displayName)) ??
    ingredientArtwork.find(([, pattern]) => pattern.test(label));
  return `/ingredients/${match?.[0] ?? "bowl"}.webp`;
}

export const commonIngredients: IngredientInfo[] = [
  { name: "Chicken breast", emoji: "🍗" },
  { name: "Chicken thigh", emoji: "🍗" },
  { name: "Beef steak", emoji: "🥩" },
  { name: "Ground beef", emoji: "🥩" },
  { name: "Ground turkey", emoji: "🦃" },
  { name: "Salmon", emoji: "🐟" },
  { name: "Shrimp", emoji: "🍤" },
  { name: "Tofu", emoji: "🧈" },
  { name: "Eggs", emoji: "🥚" },
  { name: "Egg whites", emoji: "🥚" },
  { name: "Greek yogurt", emoji: "🥛" },
  { name: "Milk", emoji: "🥛" },
  { name: "Heavy cream", emoji: "🥛" },
  { name: "Butter", emoji: "🧈" },
  { name: "Olive oil", emoji: "🫒" },
  { name: "Cheddar cheese", emoji: "🧀" },
  { name: "Parmesan", emoji: "🧀" },
  { name: "Mozzarella", emoji: "🧀" },
  { name: "Cottage cheese", emoji: "🧀" },
  { name: "Pasta", emoji: "🍝" },
  { name: "Rice", emoji: "🍚" },
  { name: "Cauliflower rice", emoji: "🥦" },
  { name: "Bread", emoji: "🍞" },
  { name: "Tortillas", emoji: "🫓" },
  { name: "Flour", emoji: "🌾" },
  { name: "Oats", emoji: "🌾" },
  { name: "Sugar", emoji: "🍬" },
  { name: "Honey", emoji: "🍯" },
  { name: "Potatoes", emoji: "🥔" },
  { name: "Sweet potatoes", emoji: "🍠" },
  { name: "Broccoli", emoji: "🥦" },
  { name: "Spinach", emoji: "🥬" },
  { name: "Lettuce", emoji: "🥬" },
  { name: "Tomatoes", emoji: "🍅" },
  { name: "Onion", emoji: "🧅" },
  { name: "Garlic", emoji: "🧄" },
  { name: "Bell pepper", emoji: "🫑" },
  { name: "Carrots", emoji: "🥕" },
  { name: "Mushrooms", emoji: "🍄" },
  { name: "Avocado", emoji: "🥑" },
  { name: "Corn", emoji: "🌽" },
  { name: "Black beans", emoji: "🫘" },
  { name: "Chickpeas", emoji: "🫘" },
  { name: "Lentils", emoji: "🫘" },
  { name: "Banana", emoji: "🍌" },
  { name: "Berries", emoji: "🫐" },
  { name: "Lemon", emoji: "🍋" },
  { name: "Peanut butter", emoji: "🥜" },
  { name: "Almonds", emoji: "🥜" },
  { name: "Basil", emoji: "🌿" },
  { name: "Rosemary", emoji: "🌿" },
  { name: "Chili", emoji: "🌶️" },
  { name: "Soy sauce", emoji: "🥢" },
  { name: "Salt", emoji: "🧂" },
  { name: "Black pepper", emoji: "🧂" },
];

const byName = new Map(commonIngredients.map((i) => [i.name.toLowerCase(), i]));

export function lookupIngredient(name: string): IngredientInfo {
  const key = name.trim().toLowerCase();
  const exact = byName.get(key);
  if (exact) return { ...exact, name: name.trim() };
  // Loose match so "boneless chicken breasts" still gets the chicken emoji.
  const loose = commonIngredients.find(
    (i) =>
      key.includes(i.name.toLowerCase()) ||
      key.includes(i.name.toLowerCase().replace(/e?s$/, "")),
  );
  return {
    name: name.trim(),
    emoji: loose?.emoji ?? "🥣",
    image: loose?.image,
  };
}

const UNITS =
  "g|grams?|kg|ml|l|liters?|cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|cloves?|slices?|cans?|pinch(?:es)?|handfuls?";

const unitAliases: Record<string, string> = {
  gram: "g",
  grams: "g",
  liter: "l",
  liters: "l",
  cups: "cup",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  ounce: "oz",
  ounces: "oz",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  cloves: "clove",
  slices: "slice",
  cans: "can",
  pinches: "pinch",
  handfuls: "handful",
};

export type ParsedIngredient = {
  name: string;
  amount: string; // kept as typed ("1/2", "1.5"); empty when not given
  unit: string;
};

// "200g chicken breast", "1 1/2 cups of milk", "2 eggs", "salt"
export function parseIngredient(input: string): ParsedIngredient | null {
  let rest = input.trim().replace(/^add\s+/i, "");

  const amountMatch = rest.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*/);
  const amount = amountMatch?.[1] ?? "";
  rest = rest.slice(amountMatch?.[0].length ?? 0);

  const unitMatch = rest.match(
    new RegExp(`^(${UNITS})\\.?(?:\\s+of)?\\s+`, "i"),
  );
  const unitRaw = (unitMatch?.[1] ?? "").toLowerCase();
  rest = rest.slice(unitMatch?.[0].length ?? 0);

  // Nothing left, or only a unit ("100 g"): no ingredient name was given.
  if (!rest.trim() || new RegExp(`^(${UNITS})\\.?$`, "i").test(rest.trim()))
    return null;
  return {
    name: cleanName(rest),
    amount,
    unit: unitAliases[unitRaw] ?? unitRaw,
  };
}

function cleanName(s: string) {
  const t = s.trim().replace(/\s+/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function formatAmount(i: { amount: string; unit: string }) {
  if (!i.amount) return i.unit || "To taste";
  return i.unit ? `${i.amount} ${i.unit}` : i.amount;
}
