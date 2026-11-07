"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { AssistantFab } from "@/components/shared/assistant-fab";
import { Button } from "@/components/shared/button";
import { Composer } from "@/components/shared/composer";
import { facadeScope } from "@/components/shared/facade-root";
import { IconButton } from "@/components/shared/icon-button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { MessageBubble } from "@/components/shared/message-bubble";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { VISITOR_MESSAGE_MAX } from "@/lib/validations/assistant";
import { readEvents, type StreamEvent } from "../stream-events";

const t = fr.visitorAssistant;

type Item = { id: string; kind: "user" | "assistant"; text: string };
type Saved = { conversationId: string | null; items: Item[] };
type ChatError = keyof typeof t.errors;

/** The conversation kept while the visitor goes from page to page (this tab only). */
const STORAGE_KEY = "lk-visitor-assistant";

function load(): Saved {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { conversationId: null, items: [] };
    const saved: unknown = JSON.parse(raw);
    if (
      typeof saved === "object" &&
      saved !== null &&
      "items" in saved &&
      Array.isArray(saved.items) &&
      "conversationId" in saved
    ) {
      const items = saved.items.filter(
        (item: unknown): item is Item =>
          typeof item === "object" &&
          item !== null &&
          "id" in item &&
          typeof item.id === "string" &&
          "kind" in item &&
          (item.kind === "user" || item.kind === "assistant") &&
          "text" in item &&
          typeof item.text === "string",
      );
      const id = saved.conversationId;
      return { conversationId: typeof id === "string" ? id : null, items };
    }
  } catch {
    // Storage closed (private window, blocked): a new conversation.
  }
  return { conversationId: null, items: [] };
}

function save(saved: Saved) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Not kept: the conversation lives as long as the page.
  }
}

const ERROR_OF: Record<string, ChatError> = { quota: "quota", busy: "busy" };

/** The conversation of a visitor with the assistant of the site, its field at the bottom. */
function VisitorChat({ initial, onChange }: { initial: Saved; onChange(saved: Saved): void }) {
  const [items, setItems] = useState<Item[]>(initial.items);
  const [conversationId, setConversationId] = useState(initial.conversationId);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const next = useRef(0);
  const writing = useRef<string | null>(null);
  const written = useRef<string[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const request = useRef<AbortController | null>(null);
  const errorId = `${useId()}-error`;

  const newId = () => `local-${Date.now()}-${(next.current += 1)}`;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [items, error]);

  useEffect(() => {
    if (!streaming) onChange({ conversationId, items });
  }, [conversationId, items, streaming, onChange]);

  useEffect(() => () => request.current?.abort(), []);

  function onEvent(event: StreamEvent) {
    if (event.type === "conversation") {
      setConversationId(event.id);
    } else if (event.type === "text") {
      const id = writing.current;
      if (id) {
        setItems((current) =>
          current.map((item) =>
            item.id === id ? { ...item, text: item.text + event.delta } : item,
          ),
        );
      } else {
        const created = newId();
        writing.current = created;
        written.current.push(created);
        setItems((current) => [...current, { id: created, kind: "assistant", text: event.delta }]);
      }
    } else if (event.type === "done") {
      if (event.reason === "length" || event.reason === "limit") setError("cut");
    } else if (event.type === "error") {
      if (event.error === "refused") {
        // The text written before the model declined is not an answer.
        const dropped = new Set(written.current);
        setItems((current) => current.filter((item) => !dropped.has(item.id)));
      }
      setError(event.error === "refused" ? "refused" : "unavailable");
    }
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || streaming) return;
    const before = items;
    setDraft("");
    setItems((current) => [...current, { id: newId(), kind: "user", text: message }]);
    field.current?.focus();
    setStreaming(true);
    setError(null);
    writing.current = null;
    written.current = [];
    const controller = new AbortController();
    request.current = controller;
    let ended = false;
    try {
      const response = await fetch("/api/ai/visitor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, message }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const data: unknown = await response.json().catch(() => null);
        const code =
          typeof data === "object" && data !== null && "error" in data ? String(data.error) : "";
        setError(ERROR_OF[code] ?? "unavailable");
        // Refused before anything was written: as before, the text kept.
        setItems(before);
        setDraft(message);
        return;
      }
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const { events, rest } = readEvents(buffer + value);
        buffer = rest;
        for (const event of events) {
          if (event.type === "done" || event.type === "error") ended = true;
          onEvent(event);
        }
      }
      if (!ended) setError("unavailable");
    } catch {
      if (!controller.signal.aborted) setError("unavailable");
    } finally {
      writing.current = null;
      setStreaming(false);
    }
  }

  const errorText = error ? t.errors[error] : null;
  const contactAction = error === "quota" || error === "busy" || error === "refused";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        role="log"
        aria-label={t.thread}
        aria-busy={streaming || undefined}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {items.length === 0 ? (
          <div className="flex flex-col gap-4">
            <p className="text-lk-compact text-lk-ink-2">{t.intro}</p>
            <div className="flex flex-col items-start gap-2">
              <p className="text-lk-caption font-semibold text-lk-ink-3">{t.suggestionsLabel}</p>
              <ul className="flex flex-wrap gap-2">
                {t.suggestions.map((suggestion) => (
                  <li key={suggestion}>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={streaming}
                      onClick={() => void send(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          items.map((item) =>
            item.kind === "user" ? (
              <MessageBubble key={item.id} mine meta={t.you}>
                {item.text}
              </MessageBubble>
            ) : (
              <MessageBubble key={item.id} mine={false} tone="assistant" meta={t.name}>
                {item.text}
              </MessageBubble>
            ),
          )
        )}
        {streaming && items.at(-1)?.kind !== "assistant" ? (
          <p className="text-lk-caption text-lk-ink-3">{t.writing}</p>
        ) : null}
        <div ref={end} />
      </div>
      <div className="shrink-0">
        <div className="flex flex-col gap-2 border-t border-lk-line bg-lk-surface px-3 pt-2.5">
          {errorText ? (
            <InlineAlert
              tone={error === "unavailable" ? "danger" : "warning"}
              action={
                contactAction ? (
                  <Link
                    href={ROUTES.contact}
                    className="font-semibold underline underline-offset-2 hover:no-underline"
                  >
                    {t.errors.contact}
                  </Link>
                ) : null
              }
            >
              <span id={errorId}>{errorText}</span>
            </InlineAlert>
          ) : null}
          <nav aria-label={t.next.label} className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={ROUTES.valuation}>{t.next.valuation}</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href={ROUTES.pricing}>{t.next.plans}</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href={ROUTES.sellerSignUp}>{t.next.signUp}</Link>
            </Button>
          </nav>
          <p className="text-lk-micro text-lk-ink-3">
            {t.disclaimer}{" "}
            <Link
              href={ROUTES.aiPolicy}
              className="underline underline-offset-2 hover:no-underline"
            >
              {t.howItWorks}
            </Link>
          </p>
        </div>
        <Composer
          value={draft}
          onValueChange={setDraft}
          onSend={() => send(draft)}
          sending={streaming}
          label={t.field}
          sendLabel={t.send}
          maxLength={VISITOR_MESSAGE_MAX}
          errorId={errorText ? errorId : undefined}
          textareaRef={field}
          className="border-t-0"
        />
      </div>
    </div>
  );
}

/**
 * The assistant of the public site (DECISIONS.md 2026-11-07): « Une
 * question ? » at the bottom right of the pages that show it (above the tabs
 * of a phone), a panel on the right from 768 px, the whole screen below;
 * the conversation kept from page to page in the tab (sessionStorage).
 */
export function VisitorAssistant() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<Saved>({ conversationId: null, items: [] });
  const [chat, setChat] = useState(0);

  const change = (next: boolean) => {
    if (next) {
      setSaved(load());
      setChat((current) => current + 1);
    }
    setOpen(next);
  };

  // Stable: the conversation calls it after each answer.
  const keep = useCallback((next: Saved) => {
    setSaved(next);
    save(next);
  }, []);

  const startOver = () => {
    keep({ conversationId: null, items: [] });
    setChat((current) => current + 1);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={change}>
      <DialogPrimitive.Trigger asChild>
        {/* On a phone, a round button above the tabs (its name read, not
            shown), not to cover the page; with its name from 768 px. */}
        <AssistantFab
          aria-haspopup="dialog"
          className="inline-flex w-12 justify-center gap-0 px-0 bottom-[calc(3.625rem+max(1.375rem,env(safe-area-inset-bottom))+0.75rem)] right-4 md:right-6 md:bottom-6 md:w-auto md:gap-2 md:px-4.5"
        >
          <span className="sr-only md:not-sr-only">{t.open}</span>
        </AssistantFab>
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
              {t.title}
            </DialogPrimitive.Title>
            <Button
              variant="ghost"
              size="sm"
              onClick={startOver}
              disabled={saved.items.length === 0}
            >
              {t.newConversation}
            </Button>
          </div>
          <VisitorChat key={chat} initial={saved} onChange={keep} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
