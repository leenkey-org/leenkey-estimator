import { NextResponse, type NextRequest } from "next/server";
import { isCronRequest } from "@/core/cron/auth";
import { sendNotificationEmails } from "@/leenkey/notifications/send-emails";
import { createAdminClient } from "@/lib/supabase/admin";

// The notification emails waiting (SPEC-V2 sections 10 and 19, L1-22): every
// 5 minutes, called by pg_cron through pg_net with « Authorization: Bearer
// <CRON_SECRET> » (public.cron_call). Idempotent: an email is claimed before
// it leaves. Its summary goes to the log.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(request: NextRequest) {
  if (!isCronRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await sendNotificationEmails(createAdminClient());
    console.info("[cron] send-notification-emails", summary);
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[cron] send-notification-emails failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
