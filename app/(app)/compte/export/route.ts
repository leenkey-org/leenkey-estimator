import { NextResponse } from "next/server";
import { getProfile, getUser } from "@/core/auth/session";
import { loginPath } from "@/core/auth/next-path";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { createClient } from "@/lib/supabase/server";

// « Télécharger mes données » (L2-10, SPEC-V2 sections 19 and 21): what the
// account holds, as one JSON file, read by account_export with the session
// of the person (RLS of each table). Not behind the terms gate: a right of
// the person never waits behind new terms.

export const dynamic = "force-dynamic";

function today(): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

export async function GET(request: Request) {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.redirect(new URL(loginPath(ROUTES.account), request.url), 303);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("account_export");
  if (error || data === null) {
    console.error("[account] export failed", { user_id: profile.id, code: error?.code });
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 500 });
  }
  const user = await getUser();
  const body = {
    exported_at: new Date().toISOString(),
    account: { id: profile.id, email: user?.email ?? null, created_at: user?.created_at ?? null },
    ...(typeof data === "object" && !Array.isArray(data) ? data : {}),
  };
  console.info("[account] export", { user_id: profile.id });
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="leenkey-mes-donnees-${today()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
