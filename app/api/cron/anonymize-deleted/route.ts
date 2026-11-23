import { NextResponse, type NextRequest } from "next/server";
import { isCronRequest } from "@/core/cron/auth";
import { anonymizeDeletedAccounts } from "@/leenkey/account/anonymize";
import { sweepIdentityFiles } from "@/leenkey/buyers/identity-sweep";
import { createAdminClient } from "@/lib/supabase/admin";

// The anonymisation of the accounts closed 30 days ago (L2-10, SPEC-V2
// section 19): every Sunday at 2:00, called by pg_cron through pg_net with
// « Authorization: Bearer <CRON_SECRET> » (public.cron_call). Idempotent: an
// account is marked once every step is done, and stays due until then. Its
// counts go to the log, never a name nor an address. The same run removes
// the identity files left behind (DECISIONS.md 2026-11-23): those of the
// documents checked, refused or withdrawn whose deletion failed, those never
// declared; a failure there never stops the anonymisation.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(request: NextRequest) {
  if (!isCronRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const admin = createAdminClient();
    let identityFiles: Awaited<ReturnType<typeof sweepIdentityFiles>> | null = null;
    try {
      identityFiles = await sweepIdentityFiles(admin);
      console.info("[cron] identity files swept", identityFiles);
    } catch (error) {
      console.error("[cron] identity files sweep failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    const summary = await anonymizeDeletedAccounts(admin);
    console.info("[cron] anonymize-deleted", summary);
    return NextResponse.json({ ok: true, ...summary, identityFiles });
  } catch (error) {
    console.error("[cron] anonymize-deleted failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
