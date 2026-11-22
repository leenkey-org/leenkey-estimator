"use client";

import { useState } from "react";
import { SquarePen } from "lucide-react";
import { frAssistant } from "@/lib/i18n/sections/assistant";
import type { AssistantContext } from "@/lib/validations/assistant";
import type { AssistantConversation } from "../types";
import { AssistantChat } from "./assistant-chat";
import { AssistantPageHeader } from "./assistant-page-header";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { assistant: frAssistant } as const;

const t = fr.assistant;

/**
 * The page /assistant of a seller or of a buyer: its header with « Nouvelle conversation »
 * (an icon on a phone, its words from 768 px), which starts over in the
 * browser, and the conversation. The conversation is never read again by the
 * server while the page is open: a confirmation does not reload it.
 */
export function AssistantPageChat({
  context,
  initial,
  propertyId,
  listingId = null,
  topic = null,
  back,
}: {
  context: AssistantContext;
  initial: AssistantConversation;
  propertyId: string | null;
  /** The listing a buyer came from. */
  listingId?: string | null;
  /** What the buyer came to ask about: the documents shared with them (L3-07). */
  topic?: "documents" | null;
  back?: { href: string; label: string };
}) {
  const [start, setStart] = useState({ key: 0, conversation: initial });
  return (
    <>
      <AssistantPageHeader
        back={back}
        action={
          <button
            type="button"
            aria-label={t.newConversation}
            onClick={() =>
              setStart((current) => ({
                key: current.key + 1,
                conversation: { conversationId: null, items: [] },
              }))
            }
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-lk-label font-semibold text-lk-blue hover:bg-lk-stone-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid md:px-3"
          >
            <SquarePen aria-hidden="true" className="size-5 md:hidden" />
            <span aria-hidden="true" className="hidden md:inline">
              {t.newConversation}
            </span>
          </button>
        }
      />
      <AssistantChat
        key={start.key}
        layout="page"
        context={context}
        propertyId={propertyId}
        listingId={listingId}
        topic={topic}
        initial={start.conversation}
        className="bg-lk-bg"
      />
    </>
  );
}
