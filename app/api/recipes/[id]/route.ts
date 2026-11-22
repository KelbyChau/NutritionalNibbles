import { NextResponse, type NextRequest } from "next/server";
import { getUserId, jsonError } from "@/lib/http";
import { deleteRecipe } from "@/lib/recipes/queries";
import { UUID_RE } from "@/lib/recipes/validation";

/**
 * DELETE /api/recipes/[id] — delete one of the signed-in user's private recipes.
 * Missing, someone else's, and public recipes all return 404, so the response
 * doesn't reveal which it was.
 */
export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return jsonError("Invalid recipe id", 400);

  const { supabase, userId } = await getUserId();
  if (!userId) return jsonError("Sign in to delete a recipe", 401);

  const { deletedId, error } = await deleteRecipe(supabase, userId, id);
  if (error) {
    console.error("DELETE /api/recipes/[id]", error);
    return jsonError("Could not delete recipe", 500);
  }
  if (!deletedId) return jsonError("Recipe not found", 404);

  return NextResponse.json({ deleted: deletedId });
}
