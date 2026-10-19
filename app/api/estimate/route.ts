import { recordEstimation } from "@/leenkey/estimator/record";
import { toRouteHandler } from "@/lib/legacy-api/adapter";
import handler from "@/lib/legacy-api/estimate";

// V1 endpoint kept at the same path, request and answer (L1-01). L1-13b: the
// analysis is also kept (estimations), and the answer gains two fields, its
// estimationId and, for an anonymous visitor, its claimToken.
const legacy = toRouteHandler(handler);

export async function POST(request: Request): Promise<Response> {
  const payload: unknown = await request
    .clone()
    .json()
    .catch(() => null);
  const [response, recorded] = await Promise.all([legacy(request), recordEstimation(payload)]);
  if (response.status !== 200 || !recorded) return response;
  // The V1 answer, { ref, analyse }.
  const body = (await response.json()) as Record<string, unknown>;
  return Response.json(
    { ...body, estimationId: recorded.id, claimToken: recorded.claimToken },
    { status: 200, headers: response.headers },
  );
}

export const OPTIONS = legacy;
export const GET = legacy;
