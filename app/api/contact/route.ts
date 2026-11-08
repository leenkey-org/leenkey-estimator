import handler from "@/lib/legacy-api/contact";
import { toRouteHandler } from "@/lib/legacy-api/adapter";
import { fr } from "@/lib/i18n/fr";
import { allowRequest } from "@/lib/rate-limit";

// V1 endpoint kept at the same path (L1-01); 5 messages an hour per address
// (L1-38), refused with 429 before anything is sent.
const route = toRouteHandler(handler);

export async function POST(request: Request): Promise<Response> {
  if (!(await allowRequest("contact", request.headers))) {
    return Response.json(
      { error: fr.auth.errors.tooManyRequests },
      { status: 429, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }
  return route(request);
}
export const OPTIONS = route;
export const GET = route;
