// Helpers shared by every API route handler.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type Supabase = Awaited<ReturnType<typeof createClient>>;

/** JSON error response in the shape every endpoint uses: { error, details? }. */
export function jsonError(message: string, status: number, details?: string[]) {
  return NextResponse.json(
    { error: message, ...(details?.length ? { details } : {}) },
    { status },
  );
}

/**
 * Creates a request-scoped Supabase client and returns the signed-in user's
 * id (or null). Database calls through this client run as that user, so
 * row-level security applies.
 */
export async function getUserId(): Promise<{ supabase: Supabase; userId: string | null }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  return { supabase, userId: typeof id === "string" ? id : null };
}

/** Reads a JSON body, returning undefined if it isn't valid JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
