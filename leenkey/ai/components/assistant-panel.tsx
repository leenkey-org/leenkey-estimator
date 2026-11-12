"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { AssistantFab } from "@/components/shared/assistant-fab";
import { Button } from "@/components/shared/button";
import { facadeScope } from "@/components/shared/facade-root";
import { IconButton } from "@/components/shared/icon-button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Skeleton } from "@/components/shared/skeleton";
import { useSpace } from "@/leenkey/navigation/components/space-context";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { frAssistant } from "@/lib/i18n/sections/assistant";
import { cn } from "@/lib/utils";
import { loadAssistantConversation } from "../actions";
import type { AssistantConversation } from "../types";
import { AssistantChat } from "./assistant-chat";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { assistant: frAssistant } as const;

const t = fr.assistant;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The property of the page, for a new conversation: its sheet, or « Ma vente » with ?bien=. */
export function pageProperty(pathname: string, bien: string | null): string | null {
  const match = /^\/vendeur\/biens\/([^/]+)/.exec(pathname);
  const id = match?.[1] ?? (pathname === ROUTES.seller ? bien : null);
  return id && UUID.test(id) ? id : null;
}

type Loaded =
  | { status: "idle" | "loading" | "error" }
  | { status: "ready"; conversation: AssistantConversation };

/**
 * The assistant of the seller on a large screen (L1-28, DESIGN.md 10.5):
 * AssistantFab at the bottom right of the pages of the seller space opens a
 * panel on the right, as the notifications (420 px, page dimmed, from the
 * right in 220 ms): « Assistant Leenkey », « Nouvelle conversation », the
 * last conversation. Below 768 px, the button of the header opens the page
 * /assistant instead.
 */
export function AssistantPanel({ roles }: { roles: readonly string[] }) {
  const space = useSpace(roles);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Loaded>({ status: "idle" });
  const [chat, setChat] = useState(0);

  if (space !== "seller" || !roles.includes("seller") || pathname === ROUTES.assistant) {
    return null;
  }

  async function load() {
    setLoaded({ status: "loading" });
    const result = await loadAssistantConversation().catch(() => null);
    setLoaded(result?.ok ? { status: "ready", conversation: result.data } : { status: "error" });
  }

  // Read again at each opening: the panel forgets its content once closed,
  // and the conversation may have gone on meanwhile (an answer, the page).
  const change = (next: boolean) => {
    setOpen(next);
    if (next) {
      setChat((current) => current + 1);
      void load();
    }
  };

  const startOver = () => {
    setLoaded({ status: "ready", conversation: { conversationId: null, items: [] } });
    setChat((current) => current + 1);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={change}>
      <DialogPrimitive.Trigger asChild>
        <AssistantFab aria-haspopup="dialog">{t.name}</AssistantFab>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-lk-ink/40 duration-220 ease-out-lk",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            "motion-reduce:animate-none",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            facadeScope,
            "fixed inset-0 z-50 flex flex-col bg-lk-bg outline-none",
            "md:left-auto md:w-105 md:border-l md:border-lk-line",
            "duration-220 ease-out-lk data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
            "motion-reduce:animate-none",
          )}
        >
          <div className="flex h-18 shrink-0 items-center gap-3 border-b border-lk-line bg-lk-surface px-4">
            <DialogPrimitive.Close asChild>
              <IconButton icon={X} variant="outline" size="sm" aria-label={t.close} />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className="min-w-0 flex-1 text-lk-title font-semibold text-lk-ink">
              {t.name}
            </DialogPrimitive.Title>
            <Button
              variant="ghost"
              size="sm"
              onClick={startOver}
              disabled={loaded.status !== "ready"}
            >
              {t.newConversation}
            </Button>
          </div>
          {loaded.status === "ready" ? (
            <AssistantChat
              key={chat}
              layout="panel"
              context="seller"
              propertyId={pageProperty(pathname, searchParams.get("bien"))}
              initial={loaded.conversation}
            />
          ) : loaded.status === "error" ? (
            <div className="px-4 py-6">
              <InlineAlert
                tone="danger"
                action={
                  <Button variant="ghost" size="sm" onClick={() => void load()}>
                    {t.errors.retry}
                  </Button>
                }
              >
                {t.errors.unavailable}
              </InlineAlert>
            </div>
          ) : (
            <div aria-busy="true" className="flex flex-col gap-3 px-4 py-4">
              <Skeleton className="h-16 w-3/4 self-end" />
              <Skeleton className="h-24 w-4/5" />
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
