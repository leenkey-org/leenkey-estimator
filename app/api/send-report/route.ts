import handler from "@/lib/legacy-api/send-report";
import { toRouteHandler } from "@/lib/legacy-api/adapter";
import { frAuth } from "@/lib/i18n/sections/auth";
import { allowRequest, tooManyRequestsResponse } from "@/lib/rate-limit";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { auth: frAuth } as const;

// V1 endpoint kept at the same path (L1-01); 5 reports an hour per address
// (L1-38), refused with 429 before any email leaves.
const route = toRouteHandler(handler);

export async function POST(request: Request): Promise<Response> {
  if (!(await allowRequest("report", request.headers))) {
    return tooManyRequestsResponse(fr.auth.errors.tooManyRequests);
  }
  return route(request);
}
export const OPTIONS = route;
export const GET = route;
