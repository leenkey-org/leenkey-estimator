import { NextResponse, type NextRequest } from "next/server";
import { isCronRequest } from "@/core/cron/auth";
import { analyzeDocuments } from "@/leenkey/sale-file/analysis";
import { createAdminClient } from "@/lib/supabase/admin";

// The analysis of the documents of the sale files that wait for one (L3-05,
// SPEC-V2 15 and 19): every 5 minutes, called by pg_cron through pg_net with
// « Authorization: Bearer <CRON_SECRET> » (public.cron_call). Idempotent: a
// document is claimed before it is read (never two runs on the same one),
// and closed with its analysis or with why it has none. Three documents a
// run, read together, within the minute of the route (and the 55 seconds
// pg_net waits): a document the model did not finish in time is taken again
// by a later run. Its count goes to the log.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(request: NextRequest) {
  if (!isCronRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await analyzeDocuments(createAdminClient());
    console.info("[cron] analyze-documents", summary);
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[cron] analyze-documents failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
