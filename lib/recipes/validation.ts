// Checks untrusted request input for the recipe endpoints. No HTTP or database code.

export type Ingredient = {
  name: string;
  quantity: number | null;
  unit: string | null;
  raw_line: string | null;
  needs_review: boolean;
};

export type NewRecipe = {
  title: string;
  description: string | null;
  cuisine: string | null;
  dietary_tags: string[];
  prep_minutes: number;
  cook_minutes: number;
  servings: number;
  ingredients: Ingredient[];
  instructions: string[];
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function optionalString(v: unknown, field: string, max: number, errors: string[]) {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") {
    errors.push(`${field} must be a string`);
    return null;
  }
  const t = v.trim();
  if (t.length > max) errors.push(`${field} must be at most ${max} characters`);
  return t || null;
}

function minutes(v: unknown, field: string, errors: string[]) {
  if (v === undefined || v === null) return 0;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 10_000) {
    errors.push(`${field} must be a whole number from 0 to 10000`);
    return 0;
  }
  return v;
}

/** Validates an untrusted request body for POST /api/recipes. */
export function parseNewRecipe(
  body: unknown,
): { ok: true; value: NewRecipe } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isObject(body)) return { ok: false, errors: ["Body must be a JSON object"] };

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) errors.push("title is required");
  if (title.length > 200) errors.push("title must be at most 200 characters");

  const servings = body.servings;
  if (
    typeof servings !== "number" ||
    !Number.isInteger(servings) ||
    servings < 1 ||
    servings > 1000
  ) {
    errors.push("servings is required and must be a whole number from 1 to 1000");
  }

  const ingredients: Ingredient[] = [];
  if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
    errors.push("ingredients must be a non-empty array");
  } else if (body.ingredients.length > 100) {
    errors.push("ingredients can have at most 100 items");
  } else {
    body.ingredients.forEach((raw, i) => {
      if (!isObject(raw)) {
        errors.push(`ingredients[${i}] must be an object`);
        return;
      }
      const name = typeof raw.name === "string" ? raw.name.trim() : "";
      if (!name || name.length > 200) {
        errors.push(`ingredients[${i}].name is required (max 200 characters)`);
      }
      const q = raw.quantity;
      if (q != null && (typeof q !== "number" || !Number.isFinite(q) || q < 0)) {
        errors.push(`ingredients[${i}].quantity must be a number >= 0 or null`);
      }
      ingredients.push({
        name,
        quantity: typeof q === "number" ? q : null,
        unit: optionalString(raw.unit, `ingredients[${i}].unit`, 50, errors),
        raw_line: optionalString(raw.raw_line, `ingredients[${i}].raw_line`, 500, errors),
        // A missing amount is flagged for the user to review rather than guessed.
        needs_review: raw.needs_review === true || typeof q !== "number",
      });
    });
  }

  const instructions: string[] = [];
  if (body.instructions !== undefined && body.instructions !== null) {
    if (!Array.isArray(body.instructions) || body.instructions.length > 100) {
      errors.push("instructions must be an array of at most 100 strings");
    } else {
      body.instructions.forEach((s, i) => {
        if (typeof s !== "string" || s.length > 2000) {
          errors.push(`instructions[${i}] must be a string (max 2000 characters)`);
        } else if (s.trim()) {
          instructions.push(s.trim());
        }
      });
    }
  }

  const tags: string[] = [];
  if (body.dietary_tags !== undefined && body.dietary_tags !== null) {
    if (
      !Array.isArray(body.dietary_tags) ||
      body.dietary_tags.length > 20 ||
      body.dietary_tags.some((t) => typeof t !== "string" || t.length > 50)
    ) {
      errors.push("dietary_tags must be an array of at most 20 short strings");
    } else {
      tags.push(...(body.dietary_tags as string[]).map((t) => t.trim()).filter(Boolean));
    }
  }

  const value: NewRecipe = {
    title,
    description: optionalString(body.description, "description", 2000, errors),
    cuisine: optionalString(body.cuisine, "cuisine", 100, errors),
    dietary_tags: tags,
    prep_minutes: minutes(body.prep_minutes, "prep_minutes", errors),
    cook_minutes: minutes(body.cook_minutes, "cook_minutes", errors),
    servings: typeof servings === "number" ? servings : 1,
    ingredients,
    instructions,
  };

  return errors.length ? { ok: false, errors } : { ok: true, value };
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RecipeScope = "all" | "mine" | "public";

export type ListOptions = {
  scope: RecipeScope;
  limit: number;
  before: string | null;
};

/** Validates the query string for GET /api/recipes. */
export function parseListOptions(
  params: URLSearchParams,
): { ok: true; value: ListOptions } | { ok: false; error: string } {
  const scope = params.get("scope") ?? "all";
  if (scope !== "all" && scope !== "mine" && scope !== "public") {
    return { ok: false, error: "scope must be all, mine, or public" };
  }

  const limit = Number(params.get("limit") ?? 50);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return { ok: false, error: "limit must be a whole number from 1 to 100" };
  }

  const before = params.get("before");
  if (before && Number.isNaN(Date.parse(before))) {
    return { ok: false, error: "before must be an ISO timestamp" };
  }

  return { ok: true, value: { scope, limit, before } };
}
