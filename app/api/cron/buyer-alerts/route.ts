import { NextResponse, type NextRequest } from "next/server";
import { isCronRequest } from "@/core/cron/auth";
import { sendAlertDigests } from "@/leenkey/alerts/send-digest";
import { createAdminClient } from "@/lib/supabase/admin";

// The daily digest of the buyer alerts and the similar listings after a sale
// (L3-06, SPEC-V2 sections 16 and 19): every day at 5:00 UTC, called by
// pg_cron through pg_net with « Authorization: Bearer <CRON_SECRET> »
// (public.cron_call). Idempotent: the alerts of a buyer are claimed before
// their email leaves, a listing sold is told once per buyer. Its summary
// goes to the log.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(request: NextRequest) {
  if (!isCronRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await sendAlertDigests(createAdminClient());
    console.info("[cron] buyer-alerts", summary);
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[cron] buyer-alerts failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
