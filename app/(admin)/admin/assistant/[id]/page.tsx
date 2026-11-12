import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { InlineAlert } from "@/components/shared/inline-alert";
import { requireAdmin } from "@/core/auth/session";
import { adminAiConversation } from "@/leenkey/admin/assistant/queries";
import { adminMetadata } from "@/leenkey/admin/metadata";
import { formatDateTime, formatInteger } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { assistantHref } from "@/lib/validations/admin-assistant";
import { AdminPage } from "../../_components/admin-page";

const t = fr.adminAssistant;

export const generateMetadata = adminMetadata({ title: t.detailMetaTitle });

type Props = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// L1-30d: one conversation of the log of the assistant, read by the team
// (SPEC-V2 17): who, about which listing, each message with the model and
// its tokens; for a suggestion or a draft, what the model was given.
export default async function AdminAssistantConversationPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const result = await adminAiConversation(id);
  const back = (
    <Link
      href={assistantHref({ tab: "journal" })}
      className="inline-flex min-h-11 items-center gap-1 text-lk-secondary font-semibold text-lk-blue"
    >
      <ChevronLeft aria-hidden="true" className="size-4" />
      {t.detail.back}
    </Link>
  );
  if (!result.ok) {
    return (
      <AdminPage title={t.title} titleOnMobile back={back}>
        <InlineAlert tone="danger">{t.journal.error}</InlineAlert>
      </AdminPage>
    );
  }
  if (!result.data) notFound();
  const conversation = result.data;
  const now = new Date();
  const facts = [
    {
      label: t.detail.account,
      value:
        conversation.context === "visitor"
          ? t.journal.visitor
          : (conversation.name ?? t.journal.noName),
      href: conversation.profileId ? `/admin/utilisateurs/${conversation.profileId}` : null,
    },
    { label: t.detail.reference, value: conversation.reference, href: null },
    { label: t.detail.started, value: formatDateTime(conversation.createdAt, now), href: null },
  ].filter((fact) => fact.value);

  return (
    <AdminPage
      title={t.journal.kinds[conversation.kind] ?? conversation.kind}
      titleOnMobile
      back={back}
    >
      <section className="flex flex-col gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-5">
        <p className="text-lk-caption font-semibold text-lk-ink-2">
          {t.journal.context[conversation.context]}
        </p>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label} className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-lk-caption text-lk-ink-3">{fact.label}</dt>
              <dd className="text-lk-label font-semibold break-words text-lk-ink">
                {fact.href ? (
                  <Link
                    href={fact.href}
                    className="text-lk-blue underline-offset-2 hover:underline"
                  >
                    {fact.value}
                  </Link>
                ) : (
                  fact.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {conversation.limited ? <InlineAlert tone="info">{t.detail.limited}</InlineAlert> : null}
      {conversation.entries.length === 0 ? (
        <p className="text-lk-secondary text-lk-ink-3">{t.detail.empty}</p>
      ) : (
        <ol aria-label={t.detail.list} className="flex flex-col gap-3">
          {conversation.entries.map((entry) => (
            <li
              key={entry.id}
              className={cn(
                "flex flex-col gap-1 rounded-lk-md border px-4 py-3",
                entry.role === "assistant"
                  ? "border-lk-blue-line bg-lk-blue-tint"
                  : "border-lk-line bg-lk-surface",
              )}
            >
              <p className="text-lk-caption font-semibold text-lk-ink-2">
                {entry.request ? t.detail.roles.request : t.detail.roles[entry.role]} ·{" "}
                {formatDateTime(entry.createdAt, now)}
              </p>
              {entry.text ? (
                <p
                  // A long request scrolls in its box: reachable by the keyboard, named.
                  tabIndex={entry.request ? 0 : undefined}
                  role={entry.request ? "region" : undefined}
                  aria-label={entry.request ? t.detail.roles.request : undefined}
                  className={cn(
                    "text-lk-secondary whitespace-pre-line break-words text-lk-ink",
                    entry.request && "max-h-64 overflow-y-auto text-lk-caption text-lk-ink-2",
                  )}
                >
                  {entry.text}
                </p>
              ) : null}
              {entry.model ? (
                <p className="text-lk-caption text-lk-ink-3">
                  {t.detail.tokens(
                    entry.model,
                    formatInteger(entry.inputTokens ?? 0),
                    formatInteger(entry.outputTokens ?? 0),
                  )}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </AdminPage>
  );
}
