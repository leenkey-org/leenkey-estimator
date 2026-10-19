import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized, isExemptPath } from "@/core/auth/basic-auth";
import { loginPath } from "@/core/auth/next-path";
import { isProtectedPath } from "@/leenkey/auth/routes";
import { appEnv } from "@/lib/env";
import { updateSession } from "@/lib/supabase/middleware";

// Same value as PATH_HEADER in core/auth/session.ts (server-only module).
const PATH_HEADER = "x-lk-path";

/** Static files and APIs: no session to refresh. */
function needsSession(pathname: string): boolean {
  if (pathname.startsWith("/api/")) return false;
  return !/\.[a-z0-9]+$/i.test(pathname);
}

export async function middleware(request: NextRequest) {
  const env = appEnv();
  const user = process.env.PREPROD_USER;
  const password = process.env.PREPROD_PASSWORD;
  const { pathname, search } = request.nextUrl;

  if (
    env === "staging" &&
    user &&
    password &&
    !isExemptPath(pathname) &&
    !isAuthorized(request.headers.get("authorization"), user, password)
  ) {
    return new NextResponse("Authentification requise.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Leenkey preprod", charset="UTF-8"',
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  let response: NextResponse;
  if (needsSession(pathname)) {
    const session = await updateSession(request, (current) => {
      const headers = new Headers(current.headers);
      headers.set(PATH_HEADER, `${pathname}${search}`);
      return headers;
    });
    response = session.response;
    if (!session.userId && isProtectedPath(pathname)) {
      const redirect = NextResponse.redirect(
        new URL(loginPath(`${pathname}${search}`), request.url),
      );
      for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
      response = redirect;
    }
  } else {
    // The path header is ours only: never one sent by the client.
    const headers = new Headers(request.headers);
    headers.delete(PATH_HEADER);
    response = NextResponse.next({ request: { headers } });
  }

  if (env !== "production") response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  // Everything except Next.js build assets and image optimisation.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
