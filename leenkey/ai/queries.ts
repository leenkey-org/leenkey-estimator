import "server-only";
import { displayItems } from "@/core/ai/conversation";
import { lastConversation, readLog } from "@/core/ai/log";
import type { AiContext } from "@/core/ai/tools/types";
import { offerFormPath } from "@/leenkey/offers/paths";
import { createClient } from "@/lib/supabase/server";
import { actionPreview } from "./previews";
import { shownListings } from "./shown";
import { toolsFor } from "./tools";
import type { ActionState, AssistantConversation, ChatItem } from "./types";

// The last conversation of the person with the assistant, as they see it
// again when they open it (L1-28): their messages, the answers, and the
// actions proposed with what became of them; those still waiting read their
// before and after again (the listing may have changed meanwhile); the
// listings a search showed (L2-06), read again from the log and checked.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Where a confirmed action leads: the form of the offer prepared (prefill_offer). */
export function actionHref(name: string, input: Record<string, unknown>): string | undefined {
  if (name !== "prefill_offer") return undefined;
  const listingId = input.listingId;
  return typeof listingId === "string" && UUID.test(listingId)
    ? offerFormPath(listingId)
    : undefined;
}

export async function assistantConversation(
  profile: { id: string; roles: readonly string[] },
  context: AiContext,
): Promise<{ ok: true; data: AssistantConversation } | { ok: false }> {
  const profileId = profile.id;
  const supabase = await createClient();
  const conversation = await lastConversation(supabase, profileId, context);
  if (!conversation.ok) return { ok: false };
  if (!conversation.data) return { ok: true, data: { conversationId: null, items: [] } };
  const log = await readLog(supabase, conversation.data.id);
  if (!log.ok) return { ok: false };

  const tools = toolsFor(context);
  const confirmable = (name: string) =>
    tools.some((tool) => tool.name === name && tool.requiresConfirmation);
  const shows = (name: string) => tools.some((tool) => tool.name === name && tool.show);
  const read = await Promise.all(
    displayItems(log.data, confirmable, shows).map(
      async (item, index): Promise<ChatItem | null> => {
        const id = `${conversation.data?.id}-${index}`;
        if (item.kind === "result") {
          // Shown as the tool shows it, then checked: the log is the person's to write.
          const tool = tools.find((candidate) => candidate.name === item.name);
          let shown: unknown = null;
          try {
            shown = tool?.show?.(item.result) ?? null;
          } catch {
            shown = null;
          }
          const listings = shownListings.safeParse(shown);
          return listings.success ? { id, kind: "listings", data: listings.data } : null;
        }
        if (item.kind !== "action") return { id, ...item };
        // An action that ran and failed reads as an error, as one refused.
        const state: ActionState =
          item.state === "done"
            ? "confirmed"
            : item.state === "confirmed" && isFailure(item.result)
              ? "error"
              : item.state;
        let preview = null;
        if (state === "pending") {
          const tool = tools.find((candidate) => candidate.name === item.name);
          const input = tool?.input.safeParse(item.input);
          if (tool?.preview && input?.success) {
            // A preview reads what would change, it never calls the model.
            const read = await tool.preview(input.data, {
              profileId,
              roles: profile.roles,
              context,
              stepCode: null,
            });
            const parsed = read.ok ? actionPreview.safeParse(read.data) : null;
            preview = parsed?.success ? parsed.data : null;
          }
        }
        return {
          id,
          kind: "action",
          toolCallId: item.toolCallId,
          name: item.name,
          state,
          preview,
          ...(state === "confirmed" ? { href: actionHref(item.name, item.input) } : {}),
        };
      },
    ),
  );
  const items = read.filter((item): item is ChatItem => item !== null);
  return { ok: true, data: { conversationId: conversation.data.id, items } };
}

/**
 * The output of a tool that writes, when nothing was written: { updated:
 * false } (the listing), { sent: false } (contact_advisor, create_case),
 * { prefilled: false } (prefill_offer, L2-06), { invited: false }
 * (propose_visit_slot, L3-02).
 */
export function isFailure(result: unknown): boolean {
  if (typeof result !== "object" || result === null) return false;
  return (
    ("updated" in result && result.updated === false) ||
    ("sent" in result && result.sent === false) ||
    ("prefilled" in result && result.prefilled === false) ||
    ("invited" in result && result.invited === false)
  );
}
