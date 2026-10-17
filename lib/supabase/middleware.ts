import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

// Session refresh in the middleware (Edge runtime), as recommended by
// @supabase/ssr: the auth cookies are renewed before any Server Component
// reads them (Server Components cannot write cookies).

/** Any Supabase auth cookie (session, possibly in chunks, or PKCE verifier). */
export function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => /^sb-.+-auth-token/.test(cookie.name));
}

/**
 * Refreshes the session and returns the user id (null when signed out) with
 * the response to send on, which carries the refreshed cookies and the
 * forwarded request headers.
 */
export async function updateSession(
  request: NextRequest,
  forwardedHeaders: (request: NextRequest) => Headers,
): Promise<{ response: NextResponse; userId: string | null }> {
  let response = NextResponse.next({ request: { headers: forwardedHeaders(request) } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !hasAuthCookie(request)) return { response, userId: null };

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request: { headers: forwardedHeaders(request) } });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });
  // getUser() checks the token with Supabase Auth (getSession() would trust the cookie).
  const { data } = await supabase.auth.getUser();
  return { response, userId: data.user?.id ?? null };
}
