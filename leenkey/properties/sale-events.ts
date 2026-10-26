import "server-only";
import { createClient } from "@/lib/supabase/server";

// The events of a sale that only a screen knows (L1-23, SPEC-V2 section 9):
// the documents to prepare and the diagnostics seen, with the sale file
// (L3-04). The database ticks the other tasks itself, from the events it
// holds (supabase/migrations, sale engine). Declared with the session of the
// seller: sale_declare_event checks the account is active and the property
// theirs, and that the event is one a seller may declare.

export const DECLARED_SALE_EVENTS = [
  "documents.checklist_viewed",
  "documents.diagnostics_listed",
] as const;

export type DeclaredSaleEvent = (typeof DECLARED_SALE_EVENTS)[number];

export type DeclareResult =
  | { ok: true; ticked: boolean }
  | { ok: false; error: "forbidden" | "unavailable" };

/** Ticks the tasks this event completes; `ticked`: one was not done yet. */
export async function declareSaleEvent(
  propertyId: string,
  event: DeclaredSaleEvent,
): Promise<DeclareResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sale_declare_event", {
    p_property_id: propertyId,
    p_event: event,
  });
  if (error) {
    // 42501: not a property the account may change (or a suspended account).
    if (error.code === "42501") return { ok: false, error: "forbidden" };
    console.error("[properties] sale event failed", {
      entity_id: propertyId,
      event,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, ticked: data === true };
}
