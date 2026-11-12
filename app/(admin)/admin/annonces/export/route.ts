import { getProfile } from "@/core/auth/session";
import { listingsCsv } from "@/leenkey/admin/listings-csv";
import { adminListings } from "@/leenkey/admin/queries";
import { frAdminListings } from "@/lib/i18n/sections/adminListings";
import { siteUrl } from "@/lib/site";
import { parseAdminListingsQuery } from "@/lib/validations/admin";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminListings: frAdminListings } as const;

// « Exporter CSV » of /admin/annonces (L1-30d, SPEC-V2 17, DESIGN.md 12.12):
// the listings of the list as filtered (same status and search, same limit),
// as a file. A route handler: a server action cannot answer with a file.
// For the team only: without a session, the middleware sends to the sign-in
// page like every /admin page; a signed-in account without the admin role
// gets a 404. The reads go through the admin's session (SQL functions, RLS).
// Not written in audit_log: a read of what the list shows, like the list.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) {
    return new Response(null, { status: 404 });
  }
  const filter = parseAdminListingsQuery(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  const list = await adminListings(filter);
  if (!list.ok) {
    return new Response(fr.adminListings.error, {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
  return new Response(listingsCsv(list.data.rows, siteUrl(), list.data.limited), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fr.adminListings.csv.fileName(day)}"`,
      // Names of sellers: never in a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
