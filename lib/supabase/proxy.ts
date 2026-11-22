import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  let signedIn = Boolean(user);

  // Local testing only: `npm run local` sets LOCAL_DEMO_EMAIL/PASSWORD to the
  // first seeded account (supabase/seed.sql), so visitors who aren't signed
  // in, or are only an anonymous guest, are signed in as that demo user.
  // Never set for the shared project, and only against a local database.
  const demoEmail = process.env.LOCAL_DEMO_EMAIL;
  const demoPassword = process.env.LOCAL_DEMO_PASSWORD;
  const isLocalDb = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  );
  if (
    demoEmail &&
    demoPassword &&
    isLocalDb &&
    (!user || user.is_anonymous === true)
  ) {
    const { data: signIn } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
    });
    if (signIn.user) signedIn = true;
  }

  if (
    request.nextUrl.pathname !== "/" &&
    !request.nextUrl.pathname.startsWith("/optimize") &&
    !request.nextUrl.pathname.startsWith("/dashboard") &&
    !signedIn &&
    // API routes (e.g. future AI endpoints) should check sign-in themselves and
    // return JSON errors, so API callers aren't redirected to the login page.
    !request.nextUrl.pathname.startsWith("/api/") &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
