import "server-only";
import { displayItems } from "@/core/ai/conversation";
import { lastConversation, readLog } from "@/core/ai/log";
import type { AiContext } from "@/core/ai/tools/types";
import { createClient } from "@/lib/supabase/server";
import { actionPreview } from "./previews";
import { toolsFor } from "./tools";
import type { ActionState, AssistantConversation, ChatItem } from "./types";

// The last conversation of the person with the assistant, as they see it
// again when they open it (L1-28): their messages, the answers, and the
// actions proposed with what became of them; those still waiting read their
// before and after again (the listing may have changed meanwhile).

export async function assistantConversation(
  profileId: string,
  context: AiContext,
): Promise<{ ok: true; data: AssistantConversation } | { ok: false }> {
  const supabase = await createClient();
  const conversation = await lastConversation(supabase, profileId, context);
  if (!conversation.ok) return { ok: false };
  if (!conversation.data) return { ok: true, data: { conversationId: null, items: [] } };
  const log = await readLog(supabase, conversation.data.id);
  if (!log.ok) return { ok: false };

  const tools = toolsFor(context);
  const confirmable = (name: string) =>
    tools.some((tool) => tool.name === name && tool.requiresConfirmation);
  const items = await Promise.all(
    displayItems(log.data, confirmable).map(async (item, index): Promise<ChatItem> => {
      const id = `${conversation.data?.id}-${index}`;
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
          // A preview reads what would change, it never calls the model (no roles needed).
          const read = await tool.preview(input.data, {
            profileId,
            roles: [],
            context,
            stepCode: null,
          });
          const parsed = read.ok ? actionPreview.safeParse(read.data) : null;
          preview = parsed?.success ? parsed.data : null;
        }
      }
      return { id, kind: "action", toolCallId: item.toolCallId, name: item.name, state, preview };
    }),
  );
  return { ok: true, data: { conversationId: conversation.data.id, items } };
}

/** The output of a tool that writes, when nothing was written ({ updated: false }). */
export function isFailure(result: unknown): boolean {
  return (
    typeof result === "object" && result !== null && "updated" in result && result.updated === false
  );
}
