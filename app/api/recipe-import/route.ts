import { extractRecipe } from "@/lib/recipe-url/extract";
import { fetchRecipePage, ImportError, parseRecipeUrl } from "@/lib/recipe-url/fetch-page";

// POST { url } → { recipe: { title, servings, ingredients[], image, sourceUrl } }
// Only reads the page; matching ingredients to USDA foods and the review step
// happen in the browser (components/optimize/recipe-import.tsx).
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { url?: unknown };
    const url = parseRecipeUrl(body.url);
    const { html, finalUrl } = await fetchRecipePage(url);
    const recipe = extractRecipe(html, finalUrl);
    if (!recipe)
      throw new ImportError(
        "Couldn’t find a recipe on that page. Try the page for a single recipe (not a list or search page).",
        422,
      );
    return Response.json({ recipe });
  } catch (error) {
    if (error instanceof ImportError)
      return Response.json({ error: error.message }, { status: error.status });
    console.error("recipe-import failed", error);
    return Response.json({ error: "Something went wrong importing that recipe." }, { status: 500 });
  }
}
