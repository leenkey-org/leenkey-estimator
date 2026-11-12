"use client";

import { useState } from "react";
import { SquarePen } from "lucide-react";
import { frAssistant } from "@/lib/i18n/sections/assistant";
import type { AssistantConversation } from "../types";
import { AssistantChat } from "./assistant-chat";
import { AssistantPageHeader } from "./assistant-page-header";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { assistant: frAssistant } as const;

const t = fr.assistant;

/**
 * The page /assistant of a seller: its header with « Nouvelle conversation »
 * (an icon on a phone, its words from 768 px), which starts over in the
 * browser, and the conversation. The conversation is never read again by the
 * server while the page is open: a confirmation does not reload it.
 */
export function AssistantPageChat({
  initial,
  propertyId,
}: {
  initial: AssistantConversation;
  propertyId: string | null;
}) {
  const [start, setStart] = useState({ key: 0, conversation: initial });
  return (
    <>
      <AssistantPageHeader
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
        context="seller"
        propertyId={propertyId}
        initial={start.conversation}
        className="bg-lk-bg"
      />
    </>
  );
}
