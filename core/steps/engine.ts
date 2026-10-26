import "server-only";
import { createClient } from "@/lib/supabase/server";

// The events of the steps engine (SPEC-V2 section 9, L1-23). The database
// ticks the tasks from the events it holds (a listing online, six photos, a
// first contact) and moves the current step itself, in the same transaction.
// What only a screen knows is declared here, with the session of the user:
// sale_declare_event checks that the entity is theirs and the event one they
// may declare.

/** The events a screen declares (the documents to prepare, lot 3). */
export const DECLARED_EVENTS = [
  "documents.checklist_viewed",
  "documents.diagnostics_listed",
] as const;

export type DeclaredEvent = (typeof DECLARED_EVENTS)[number];

export type EmitResult =
  | { ok: true; ticked: boolean }
  | { ok: false; error: "forbidden" | "unavailable" };

/** Ticks the tasks of the entity this event completes; `ticked`: one was not done yet. */
export async function emitEvent(entityId: string, event: DeclaredEvent): Promise<EmitResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sale_declare_event", {
    p_property_id: entityId,
    p_event: event,
  });
  if (error) {
    // 42501: not an entity the account may change.
    if (error.code === "42501") return { ok: false, error: "forbidden" };
    console.error("[steps] event failed", { entity_id: entityId, event, code: error.code });
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, ticked: data === true };
}
