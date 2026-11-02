import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";
import { InlineAlert } from "@/components/shared/inline-alert";
import { requireProfile } from "@/core/auth/session";
import { AssistantPageChat } from "@/leenkey/ai/components/assistant-page-chat";
import { AssistantPageHeader } from "@/leenkey/ai/components/assistant-page-header";
import { assistantConversation } from "@/leenkey/ai/queries";
import { fr } from "@/lib/i18n/fr";

export const metadata: Metadata = { title: fr.assistant.metaTitle };

const t = fr.assistant;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { searchParams: Promise<{ bien?: string | string[] }> };

// L1-28: the assistant on a page (SPEC-V2 8.13 and 12, DESIGN.md 12
// « Assistant », gabarit G6): the page of a phone (the button of the header
// of « Ma vente »), also open on a large screen. The last conversation of the
// seller, « Nouvelle conversation » in its header, the field at the bottom.
// ?bien=: the property a new conversation is about. The assistant of the
// buyer comes with lot 2.
export default async function AssistantPage({ searchParams }: Props) {
  const profile = await requireProfile();
  const { bien } = await searchParams;
  const propertyId = typeof bien === "string" && UUID.test(bien) ? bien : null;
  const seller = profile.roles.includes("seller");
  const read = seller ? await assistantConversation(profile.id, "seller") : null;

  return (
    <div className="mx-auto flex w-full max-w-200 flex-1 flex-col md:border-x md:border-lk-line">
      {read?.ok ? (
        <AssistantPageChat initial={read.data} propertyId={propertyId} />
      ) : (
        <>
          <AssistantPageHeader />
          {seller ? (
            <div className="px-4 py-6">
              <InlineAlert tone="danger">{t.unavailable}</InlineAlert>
            </div>
          ) : (
            <ComingSoon title={t.comingTitle} text={t.comingSoon} className="px-4" />
          )}
        </>
      )}
    </div>
  );
}
