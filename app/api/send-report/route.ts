import handler from "@/lib/legacy-api/send-report";
import { toRouteHandler } from "@/lib/legacy-api/adapter";

// V1 endpoint kept at the same path (L1-01).
const route = toRouteHandler(handler);

export const POST = route;
export const OPTIONS = route;
export const GET = route;
