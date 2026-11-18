import { getProfile } from "@/core/auth/session";
import { isUuid } from "@/leenkey/messaging/queries";
import { visitIcs } from "@/leenkey/visits/ics";
import { visitDetail } from "@/leenkey/visits/queries";
import { frVisits } from "@/lib/i18n/sections/visits";
import { absoluteUrl } from "@/lib/site";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { visits: frVisits } as const;

const t = fr.visits.visit;

// L3-02: the calendar file of a confirmed visit (SPEC-V2 14), for its buyer
// and the seller of the property, with the exact address (both may read it:
// visit_address). A file: a route handler (CLAUDE.md section 14).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, profile] = await Promise.all([params, getProfile()]);
  if (!profile || !isUuid(id)) return new Response(null, { status: 404 });
  const result = await visitDetail(id, profile.id);
  if (!result.ok) return new Response(null, { status: 503 });
  const visit = result.data;
  if (!visit || visit.status !== "confirmed") return new Response(null, { status: 404 });
  const place = visit.address
    ? `${visit.address.line}, ${visit.address.postalCode} ${visit.address.city}`
    : (visit.listing?.city ?? "");
  const body = visitIcs({
    id: visit.id,
    startsAt: visit.startsAt,
    endsAt: visit.endsAt,
    summary: t.icsSummary(visit.listing?.title ?? t.property),
    location: place,
    description: t.icsDescription,
    url: absoluteUrl(`/visites/${visit.id}`),
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="visite-leenkey.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
