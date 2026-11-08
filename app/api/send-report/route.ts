import handler from "@/lib/legacy-api/send-report";
import { toRouteHandler } from "@/lib/legacy-api/adapter";
import { fr } from "@/lib/i18n/fr";
import { allowRequest, tooManyRequestsResponse } from "@/lib/rate-limit";

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
