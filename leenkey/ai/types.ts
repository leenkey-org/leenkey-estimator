import type { ActionPreview } from "./previews";

// The conversation with the assistant as the browser shows it (L1-28).

export type ActionState = "pending" | "confirmed" | "declined" | "superseded" | "error";

export type ChatItem =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "assistant"; text: string }
  | {
      id: string;
      kind: "action";
      toolCallId: string;
      name: string;
      state: ActionState;
      /** Before and after, read when the action waits for the person; null once answered. */
      preview: ActionPreview | null;
    };

export type AssistantConversation = { conversationId: string | null; items: ChatItem[] };
