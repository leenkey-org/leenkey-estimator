import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Sparkles, SquarePen } from "lucide-react";
import { ComingSoon } from "@/components/shared/coming-soon";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { requireProfile } from "@/core/auth/session";
import { AssistantChat } from "@/leenkey/ai/components/assistant-chat";
import { assistantConversation } from "@/leenkey/ai/queries";
import type { AssistantConversation } from "@/leenkey/ai/types";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: fr.assistant.metaTitle };

const t = fr.assistant;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { searchParams: Promise<{ bien?: string | string[]; nouvelle?: string | string[] }> };

// L1-28: the assistant on a page (SPEC-V2 8.13 and 12, DESIGN.md 12
// « Assistant », gabarit G6): the page of a phone (the button of the header
// of « Ma vente »), also open on a large screen. Its header, the last
// conversation of the seller (?nouvelle=1: a new one), the field at the
// bottom. ?bien=: the property a new conversation is about. The assistant of
// the buyer comes with lot 2.
export default async function AssistantPage({ searchParams }: Props) {
  const profile = await requireProfile();
  const params = await searchParams;
  const bien = typeof params.bien === "string" && UUID.test(params.bien) ? params.bien : null;
  const fresh = params.nouvelle === "1";
  const seller = profile.roles.includes("seller");
  const read = seller && !fresh ? await assistantConversation(profile.id, "seller") : null;
  const initial: AssistantConversation | null = !seller
    ? null
    : read === null
      ? { conversationId: null, items: [] }
      : read.ok
        ? read.data
        : null;

  return (
    <div className="mx-auto flex w-full max-w-200 flex-1 flex-col md:border-x md:border-lk-line">
      {/* A sticky header of 73 px, as a conversation (app/globals.css). */}
      <header
        data-sticky-subheader="conversation"
        className="sticky top-0 z-20 box-content flex h-18 items-center gap-3 border-b border-lk-line bg-lk-surface px-4 md:top-18"
      >
        <Link
          href={ROUTES.seller}
          aria-label={t.back}
          className={cn(
            iconButtonVariants({ variant: "stone" }),
            "inline-flex items-center justify-center",
          )}
        >
          <ChevronLeft aria-hidden="true" />
        </Link>
        <Sparkles aria-hidden="true" className="size-5 shrink-0 text-lk-blue" />
        <h1 className="min-w-0 flex-1 truncate text-lk-title font-semibold text-lk-ink">
          {t.name}
        </h1>
        {seller && initial && initial.items.length > 0 ? (
          <Link
            href={`${ROUTES.assistant}?nouvelle=1`}
            aria-label={t.newConversation}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-lk-label font-semibold text-lk-blue hover:bg-lk-stone-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid md:px-3"
          >
            <SquarePen aria-hidden="true" className="size-5 md:hidden" />
            <span aria-hidden="true" className="hidden md:inline">
              {t.newConversation}
            </span>
          </Link>
        ) : null}
      </header>
      {!seller ? (
        <ComingSoon title={t.comingTitle} text={t.comingSoon} className="px-4" />
      ) : initial ? (
        <AssistantChat
          key={initial.conversationId ?? "new"}
          layout="page"
          context="seller"
          propertyId={bien}
          initial={initial}
          className="bg-lk-bg"
        />
      ) : (
        <div className="px-4 py-6">
          <InlineAlert tone="danger">{t.unavailable}</InlineAlert>
        </div>
      )}
    </div>
  );
}
