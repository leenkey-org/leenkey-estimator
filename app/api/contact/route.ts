import handler from "@/lib/legacy-api/contact";
import { toRouteHandler } from "@/lib/legacy-api/adapter";
import { frSiteContact } from "@/lib/i18n/sections/site/contact";
import { allowRequest, tooManyRequestsResponse } from "@/lib/rate-limit";

// The texts of the site this module shows (lib/i18n/sections/site, P-06).
const site = { contact: frSiteContact } as const;

// V1 endpoint kept at the same path (L1-01); 5 messages an hour per address
// (L1-38), refused with 429 before anything is sent.
const route = toRouteHandler(handler);

export async function POST(request: Request): Promise<Response> {
  if (!(await allowRequest("contact", request.headers))) {
    return tooManyRequestsResponse(site.contact.tooMany);
  }
  return route(request);
}
export const OPTIONS = route;
export const GET = route;
