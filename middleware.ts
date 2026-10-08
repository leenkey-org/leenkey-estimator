import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized, isExemptPath } from "@/core/auth/basic-auth";
import { appEnv } from "@/lib/env";

export function middleware(request: NextRequest) {
  const env = appEnv();
  const user = process.env.PREPROD_USER;
  const password = process.env.PREPROD_PASSWORD;

  if (
    env === "staging" &&
    user &&
    password &&
    !isExemptPath(request.nextUrl.pathname) &&
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

  const response = NextResponse.next();
  if (env !== "production") response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  // Everything except Next.js build assets and image optimisation.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
