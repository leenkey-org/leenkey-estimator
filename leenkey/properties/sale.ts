import "server-only";
import { toProgress } from "@/core/steps/progress";
import type { Progress } from "@/core/steps/types";
import { listConversations } from "@/leenkey/messaging/queries";
import { createClient } from "@/lib/supabase/server";
import type { SaleSituation, WaitingBuyer } from "./next-action";
import type { QueryResult } from "./queries";

// The sale of a property (L1-23, SPEC-V2 section 9), with the session of its
// seller: RLS gives them the progress and the tasks of their own properties
// only. The database keeps them up to date (supabase/migrations, sale engine).

function unavailable(what: string, propertyId: string, code: string | undefined) {
  console.error(`[properties] ${what} read failed`, { entity_id: propertyId, code });
  return { ok: false, error: "unavailable" } as const;
}

/** The steps of the plan of the sale, its current step and the tasks done; null: not theirs. */
export async function saleProgress(propertyId: string): Promise<QueryResult<Progress | null>> {
  const supabase = await createClient();
  const progress = await supabase
    .from("sale_progress")
    .select("plan, current_step_code")
    .eq("property_id", propertyId)
    .maybeSingle();
  if (progress.error) return unavailable("sale progress", propertyId, progress.error.code);
  if (!progress.data) return { ok: true, data: null };
  const [steps, done] = await Promise.all([
    supabase
      .from("sale_steps")
      .select(
        "code, position, title, description, owner, tasks:sale_step_tasks(id, code, title, required, auto_trigger, owner, position)",
      )
      .eq("plan", progress.data.plan),
    supabase
      .from("sale_task_status")
      .select("task_id, done_at")
      .eq("property_id", propertyId)
      .not("done_at", "is", null),
  ]);
  if (steps.error) return unavailable("sale steps", propertyId, steps.error.code);
  if (done.error) return unavailable("sale tasks", propertyId, done.error.code);
  return {
    ok: true,
    data: toProgress(
      { template: progress.data.plan, currentStepCode: progress.data.current_step_code },
      steps.data,
      done.data,
    ),
  };
}

/** What the next action of the sale is computed from (getNextAction); null: not theirs. */
export async function saleSituation(
  property: SaleSituation["property"],
): Promise<QueryResult<SaleSituation | null>> {
  const [progress, conversations] = await Promise.all([
    saleProgress(property.id),
    listConversations(),
  ]);
  if (!progress.ok || !conversations.ok) return { ok: false, error: "unavailable" };
  if (!progress.data) return { ok: true, data: null };
  // The conversations about this property where the buyer spoke last.
  const waitingBuyers: WaitingBuyer[] = conversations.data
    .filter(
      (conversation) =>
        conversation.role === "seller" &&
        conversation.propertyId === property.id &&
        !conversation.closed &&
        !conversation.lastMessageMine,
    )
    .map((conversation) => ({
      conversationId: conversation.id,
      firstName: conversation.counterpartFirstName,
      since: conversation.lastMessageAt,
    }));
  return { ok: true, data: { property, progress: progress.data, waitingBuyers } };
}
