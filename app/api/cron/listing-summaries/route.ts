import { NextResponse, type NextRequest } from "next/server";
import { isCronRequest } from "@/core/cron/auth";
import { summarizeListings } from "@/leenkey/listings/summary";
import { createAdminClient } from "@/lib/supabase/admin";

// The summaries of the listings asked for (L2-05, SPEC-V2 8.4 point 8 and
// section 19): every 5 minutes, called by pg_cron through pg_net with
// « Authorization: Bearer <CRON_SECRET> » (public.cron_call). Idempotent: a
// request is closed with its summary, and a listing changed meanwhile keeps
// its newer request. Its count goes to the log.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(request: NextRequest) {
  if (!isCronRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await summarizeListings(createAdminClient());
    console.info("[cron] listing-summaries", summary);
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[cron] listing-summaries failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
