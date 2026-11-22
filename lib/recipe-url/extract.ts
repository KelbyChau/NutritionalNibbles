// Pull a recipe out of a web page's HTML.
//
// Most recipe sites embed their recipe as schema.org "Recipe" data inside a
// <script type="application/ld+json"> tag (it's what Google uses for recipe
// cards), so that is what we read first. Older sites mark up the page itself
// with itemprop="recipeIngredient" (microdata); that is the fallback.

export type ScrapedRecipe = {
  title: string;
  servings: number | null; // null when the page doesn't say
  ingredients: string[]; // one line each, as written on the page
  image: string | null;
  sourceUrl: string;
};

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

export function extractRecipe(html: string, sourceUrl: string): ScrapedRecipe | null {
  return fromJsonLd(html, sourceUrl) ?? fromMicrodata(html, sourceUrl);
}

// ---- JSON-LD ------------------------------------------------------------------

function fromJsonLd(html: string, sourceUrl: string): ScrapedRecipe | null {
  const scripts = html.matchAll(
    /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const [, body] of scripts) {
    let data: Json;
    try {
      data = JSON.parse(body.trim());
    } catch {
      continue; // Some sites ship broken JSON-LD; try the next block.
    }
    const recipe = findRecipe(data);
    if (!recipe) continue;
    const ingredients = toList(recipe.recipeIngredient ?? recipe.ingredients)
      .map(cleanText)
      .filter(Boolean);
    if (!ingredients.length) continue;
    return {
      title: cleanText(asText(recipe.name)) || pageTitle(html),
      servings: parseServings(recipe.recipeYield),
      ingredients,
      image: imageUrl(recipe.image, sourceUrl),
      sourceUrl,
    };
  }
  return null;
}

// The Recipe can be the top object, inside an array, or inside "@graph"
// (Yoast/WordPress sites), sometimes nested a level deeper.
function findRecipe(data: Json, depth = 0): JsonObject | null {
  if (depth > 6 || data === null || typeof data !== "object") return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipe(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const type = data["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.some((t) => typeof t === "string" && /^(schema:)?Recipe$/i.test(t))) return data;
  for (const key of ["@graph", "mainEntity", "mainEntityOfPage", "itemListElement", "item"]) {
    const found = findRecipe(data[key] ?? null, depth + 1);
    if (found) return found;
  }
  return null;
}

function toList(value: Json | undefined): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap((v) => toList(v));
  if (typeof value === "object") return toList(value.text ?? value.name ?? null);
  // A few sites put every ingredient in one string separated by newlines.
  return String(value).split(/\r?\n/);
}

function asText(value: Json | undefined): string {
  if (value == null) return "";
  if (Array.isArray(value)) return asText(value[0]);
  if (typeof value === "object") return asText(value.text ?? value.name ?? null);
  return String(value);
}

// recipeYield shows up as 4, "4", "4 servings", "Serves 4-6", ["4", "4 servings"]...
export function parseServings(value: Json | undefined): number | null {
  const values = Array.isArray(value) ? value : [value ?? null];
  for (const v of values) {
    const text = typeof v === "number" ? String(v) : typeof v === "string" ? v : "";
    const n = text.match(/\d+/);
    if (n && Number(n[0]) > 0) return Number(n[0]);
  }
  return null;
}

function imageUrl(value: Json | undefined, base: string): string | null {
  const raw = asImage(value);
  if (!raw) return null;
  try {
    const url = new URL(raw, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function asImage(value: Json | undefined): string {
  if (value == null) return "";
  if (Array.isArray(value)) return asImage(value[0]);
  if (typeof value === "object") return asImage(value.url ?? value.contentUrl ?? null);
  return String(value);
}

// ---- Microdata fallback -------------------------------------------------------

function fromMicrodata(html: string, sourceUrl: string): ScrapedRecipe | null {
  const ingredients = [
    ...html.matchAll(
      /<(\w+)\b[^>]*itemprop\s*=\s*["'](?:recipeIngredient|ingredients)["'][^>]*>([\s\S]*?)<\/\1>/gi,
    ),
  ]
    .map((m) => cleanText(m[2]))
    .filter(Boolean);
  if (!ingredients.length) return null;
  const yieldTag =
    html.match(/<[^>]*itemprop\s*=\s*["']recipeYield["'][^>]*content\s*=\s*["']([^"']*)["']/i) ??
    html.match(/<(\w+)\b[^>]*itemprop\s*=\s*["']recipeYield["'][^>]*>([\s\S]*?)<\/\1>/i);
  return {
    title: pageTitle(html),
    servings: parseServings(yieldTag ? cleanText(yieldTag[yieldTag.length - 1]) : null),
    ingredients,
    image: null,
    sourceUrl,
  };
}

function pageTitle(html: string) {
  const og = html.match(/<meta\b[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']*)["']/i);
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  // "Best Lasagna Recipe | Some Site" → "Best Lasagna Recipe"
  return cleanText(og?.[1] ?? title?.[1] ?? "").split(/\s+[|–—-]\s+/)[0];
}

// ---- Text cleanup --------------------------------------------------------------

const entities: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", deg: "°",
  frac12: "½", frac14: "¼", frac34: "¾", frac13: "⅓", frac23: "⅔", frac18: "⅛",
  ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…",
};

export function cleanText(value: string) {
  return decodeEntities(
    value
      .replace(/<[^>]*>/g, " ") // some sites put <a>/<strong> inside ingredient lines
      .replace(/\s+/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(s: string) {
  // Twice, for sites that double-encode ("&amp;frac12;").
  for (let i = 0; i < 2; i++) {
    s = s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (match, code: string) => {
      if (code[0] === "#") {
        const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
        return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
      }
      return entities[code.toLowerCase()] ?? match;
    });
  }
  return s;
}
