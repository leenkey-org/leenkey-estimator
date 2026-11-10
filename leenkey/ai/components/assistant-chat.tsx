"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { Composer } from "@/components/shared/composer";
import { ChangeBlock, ConfirmActionCard } from "@/components/shared/confirm-action-card";
import { InlineAlert } from "@/components/shared/inline-alert";
import { MessageBubble } from "@/components/shared/message-bubble";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { ASSISTANT_MESSAGE_MAX, type AssistantContext } from "@/lib/validations/assistant";
import { confirmToolCall, declineToolCall } from "../actions";
import { actionPreview, type ActionPreview } from "../previews";
import { readEvents, type StreamEvent } from "../stream-events";
import { CaseRequestForm } from "./case-request-form";
import type { ActionState, AssistantConversation, ChatItem } from "../types";

const t = fr.assistant;

type ChatError = "unavailable" | "refused" | "quota" | "auth" | "conditions" | "cut";

const gapFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

/** What a change proposed by the assistant will do: before and after. */
function ActionContent({ preview, unknown }: { preview: ActionPreview | null; unknown: string }) {
  if (!preview) return <p className="text-lk-compact text-lk-ink-2">{unknown}</p>;
  if (preview.kind === "case_request") {
    return (
      <>
        {preview.propertyName ? (
          <p className="text-lk-caption text-lk-ink-3">{t.action.property(preview.propertyName)}</p>
        ) : null}
        <ChangeBlock label={t.action.request.subject} tone="before">
          {preview.subject}
        </ChangeBlock>
        <ChangeBlock label={t.action.request.message} tone="after">
          {preview.summary}
        </ChangeBlock>
      </>
    );
  }
  const property = (
    <p className="text-lk-caption text-lk-ink-3">{t.action.property(preview.propertyName)}</p>
  );
  if (preview.kind === "advisor_handoff") {
    return (
      <>
        {property}
        <ChangeBlock label={t.action.handoff.message} tone="after">
          {preview.summary}
        </ChangeBlock>
      </>
    );
  }
  if (preview.kind === "listing_description") {
    return (
      <>
        {property}
        <ChangeBlock label={t.action.before} tone="before">
          {preview.before}
        </ChangeBlock>
        <ChangeBlock label={t.action.after} tone="after">
          {preview.after}
        </ChangeBlock>
      </>
    );
  }
  return (
    <>
      {property}
      <div className="grid grid-cols-2 gap-2">
        <ChangeBlock label={t.action.before} tone="before">
          {formatPrice(preview.beforeEuros * 100)}
        </ChangeBlock>
        <ChangeBlock label={t.action.after} tone="after">
          <span className="font-semibold">{formatPrice(preview.afterEuros * 100)}</span>
        </ChangeBlock>
      </div>
      {preview.valuationEuros !== null ? (
        <p className="text-lk-caption text-lk-ink-2">
          {t.action.valuation(formatPrice(preview.valuationEuros * 100))}
          {preview.gapPercent !== null
            ? ` · ${t.action.gap(`${gapFormat.format(preview.gapPercent)} %`)}`
            : null}
        </p>
      ) : null}
    </>
  );
}

const ERROR_OF: Record<string, ChatError> = {
  quota: "quota",
  auth: "auth",
  conditions: "conditions",
};

/**
 * The conversation with the assistant (SPEC-V2 section 12, DESIGN.md 12
 * « Assistant », gabarit G6): the messages of the person on the right, the
 * answers in blue tint on the left, written as they stream; the changes
 * proposed as ConfirmActionCard, before and after, « Confirmer » or
 * « Annuler »; then the turn goes on. Its field at the bottom (Composer).
 */
export function AssistantChat({
  context,
  propertyId,
  initial,
  layout,
  className,
}: {
  context: AssistantContext;
  /** The property the conversation is about, for a new conversation. */
  propertyId: string | null;
  initial: AssistantConversation;
  /**
   * panel: the thread scrolls inside the panel, and the page behind is read
   * again after a change; page: the thread scrolls with the page, the field
   * kept at the bottom.
   */
  layout: "panel" | "page";
  className?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<ChatItem[]>(initial.items);
  const [conversationId, setConversationId] = useState(initial.conversationId);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const [answering, setAnswering] = useState<string | null>(null);
  /** « Écrire à un conseiller », at the daily limit: the request written by the person. */
  const [request, setRequest] = useState<"closed" | "open" | "sent">("closed");
  const requesting = request === "open";
  const next = useRef(0);
  const writing = useRef<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const errorId = `${useId()}-error`;
  /** The request of the stream, stopped when the conversation is closed (the turn goes on, logged). */
  const pending = useRef<AbortController | null>(null);
  /** What the stream of this turn wrote, removed when the model declines. */
  const written = useRef<string[]>([]);

  const newId = () => `local-${(next.current += 1)}`;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [items, reading, error]);

  useEffect(() => () => pending.current?.abort(), []);

  // The request sent or given up: the field of the conversation is back, with the focus.
  const wasRequesting = useRef(false);
  useEffect(() => {
    if (wasRequesting.current && !requesting) field.current?.focus();
    wasRequesting.current = requesting;
  }, [requesting]);

  const setState = (toolCallId: string, state: ActionState) =>
    setItems((current) =>
      current.map((item) =>
        item.kind === "action" && item.toolCallId === toolCallId ? { ...item, state } : item,
      ),
    );

  function onEvent(event: StreamEvent) {
    if (event.type === "conversation") {
      setConversationId(event.id);
    } else if (event.type === "text") {
      setReading(false);
      const id = writing.current;
      if (id) {
        setItems((current) =>
          current.map((item) =>
            item.id === id && item.kind === "assistant"
              ? { ...item, text: item.text + event.delta }
              : item,
          ),
        );
      } else {
        const created = newId();
        writing.current = created;
        written.current.push(created);
        setItems((current) => [...current, { id: created, kind: "assistant", text: event.delta }]);
      }
    } else if (event.type === "tool") {
      writing.current = null;
      setReading(true);
    } else if (event.type === "confirm") {
      writing.current = null;
      setReading(false);
      const preview = actionPreview.safeParse(event.preview);
      setItems((current) => [
        ...current,
        {
          id: newId(),
          kind: "action",
          toolCallId: event.toolCallId,
          name: event.name,
          state: "pending",
          preview: preview.success ? preview.data : null,
        },
      ]);
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

  /** One turn streamed; "rejected": refused before the stream (nothing written by the server). */
  async function stream(body: Record<string, unknown>): Promise<"streamed" | "rejected"> {
    setStreaming(true);
    setError(null);
    writing.current = null;
    written.current = [];
    const controller = new AbortController();
    pending.current = controller;
    let ended = false;
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const data: unknown = await response.json().catch(() => null);
        const code =
          typeof data === "object" && data !== null && "error" in data ? String(data.error) : "";
        setError(response.status === 401 ? "auth" : (ERROR_OF[code] ?? "unavailable"));
        return "rejected";
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
      // Cut without its end (the connection lost): said, never silent.
      if (!ended) setError("unavailable");
      return "streamed";
    } catch {
      if (!controller.signal.aborted) setError("unavailable");
      return "streamed";
    } finally {
      writing.current = null;
      setReading(false);
      setStreaming(false);
    }
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || streaming || answering) return;
    const before = items;
    setDraft("");
    // A change left waiting: the person wrote instead (nothing changes).
    setItems((current) => [
      ...current.map((item) =>
        item.kind === "action" && item.state === "pending"
          ? { ...item, state: "superseded" as const }
          : item,
      ),
      { id: newId(), kind: "user", text: message },
    ]);
    field.current?.focus();
    const outcome = await stream({
      context,
      conversationId,
      ...(conversationId ? {} : { propertyId }),
      message,
    });
    // Refused before anything was written (the limit of the day): as before, the text kept.
    if (outcome === "rejected") {
      setItems(before);
      setDraft(message);
    } else {
      // The assistant answers again: what was said of a request sent has been read.
      setRequest("closed");
    }
  }

  async function answer(toolCallId: string, confirm: boolean) {
    if (!conversationId || answering || streaming) return;
    setAnswering(toolCallId);
    setError(null);
    const result = await (confirm ? confirmToolCall : declineToolCall)({
      conversationId,
      toolCallId,
    }).catch(() => null);
    setAnswering(null);
    // The card gives way to its state: the focus goes back to the field.
    field.current?.focus();
    if (!result) {
      setError("unavailable");
      return;
    }
    if (!result.ok) {
      if (result.error === "not_found") setState(toolCallId, "superseded");
      else setError(ERROR_OF[result.error] ?? "unavailable");
      return;
    }
    setState(toolCallId, result.data.outcome);
    // The page behind the panel shows the change.
    if (result.data.outcome === "confirmed" && layout === "panel") router.refresh();
    if (result.data.remaining === 0) await stream({ context, conversationId, resume: true });
  }

  const errorText = error ? t.errors[error] : null;

  return (
    <div className={cn("flex flex-1 flex-col", layout === "panel" && "min-h-0", className)}>
      <div
        role="log"
        aria-label={t.thread}
        aria-busy={streaming || undefined}
        className={cn(
          "flex flex-1 flex-col gap-3 px-4 py-4",
          layout === "panel" && "overflow-y-auto",
        )}
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
          items.map((item) => {
            if (item.kind === "user") {
              return (
                <MessageBubble key={item.id} mine meta={t.you}>
                  {item.text}
                </MessageBubble>
              );
            }
            if (item.kind === "assistant") {
              return (
                <MessageBubble key={item.id} mine={false} tone="assistant" meta={t.name}>
                  {item.text}
                </MessageBubble>
              );
            }
            // Sent to a person, the adviser of the plan or the team: its own words.
            const handoff =
              item.name === "contact_advisor"
                ? t.action.handoff
                : item.name === "create_case"
                  ? t.action.request
                  : null;
            const title = handoff
              ? handoff.title
              : item.name === "update_listing_price"
                ? t.action.priceTitle
                : t.action.descriptionTitle;
            const states = handoff ? handoff.states : t.action.states;
            return (
              <ConfirmActionCard
                key={item.id}
                title={title}
                state={item.state}
                busy={answering === item.toolCallId}
                stateText={item.state === "pending" ? undefined : states[item.state]}
                confirmLabel={handoff ? handoff.confirm : t.action.confirm}
                cancelLabel={t.action.cancel}
                onConfirm={() => void answer(item.toolCallId, true)}
                onCancel={() => void answer(item.toolCallId, false)}
                className="max-w-[min(100%,40rem)]"
              >
                {item.state === "pending" || (item.state === "confirmed" && item.preview) ? (
                  <ActionContent
                    preview={item.preview}
                    unknown={handoff ? handoff.unknown : t.action.unknown}
                  />
                ) : null}
              </ConfirmActionCard>
            );
          })
        )}
        {reading ? <p className="text-lk-caption text-lk-ink-3">{t.reading}</p> : null}
        {streaming && !reading && items.at(-1)?.kind !== "assistant" ? (
          <p className="text-lk-caption text-lk-ink-3">{t.writing}</p>
        ) : null}
        <div ref={end} />
      </div>
      <div className={cn("shrink-0", layout === "page" && "sticky bottom-0 z-20")}>
        <div className="flex flex-col gap-2 border-t border-lk-line bg-lk-surface px-3 pt-2.5">
          {errorText ? (
            <InlineAlert
              tone={error === "quota" || error === "cut" ? "warning" : "danger"}
              action={
                error === "quota" && request === "closed" ? (
                  <button
                    type="button"
                    onClick={() => setRequest("open")}
                    className="cursor-pointer font-semibold underline underline-offset-2 hover:no-underline"
                  >
                    {t.errors.quotaAction}
                  </button>
                ) : null
              }
            >
              <span id={errorId}>{errorText}</span>
            </InlineAlert>
          ) : null}
          {requesting ? (
            <CaseRequestForm
              conversationId={conversationId}
              propertyId={propertyId}
              initialMessage={draft}
              onClose={() => setRequest("closed")}
              onSent={() => {
                setDraft("");
                setRequest("sent");
              }}
            />
          ) : null}
          {request === "sent" ? <InlineAlert tone="success">{t.request.sent}</InlineAlert> : null}
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
        {/* The request is written in its own field: one field, one « Envoyer », at a time. */}
        {requesting ? null : (
          <Composer
            value={draft}
            onValueChange={setDraft}
            onSend={() => send(draft)}
            sending={streaming}
            label={t.field}
            sendLabel={t.send}
            maxLength={ASSISTANT_MESSAGE_MAX}
            errorId={errorText ? errorId : undefined}
            textareaRef={field}
            className="border-t-0"
          />
        )}
      </div>
    </div>
  );
}
