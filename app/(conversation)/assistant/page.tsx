import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InlineAlert } from "@/components/shared/inline-alert";
import { requireProfile } from "@/core/auth/session";
import { listingFacts } from "@/leenkey/ai/buyer-data";
import { AssistantPageChat } from "@/leenkey/ai/components/assistant-page-chat";
import { AssistantPageHeader } from "@/leenkey/ai/components/assistant-page-header";
import { assistantPageContext } from "@/leenkey/ai/page-context";
import { assistantConversation } from "@/leenkey/ai/queries";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { frAssistant } from "@/lib/i18n/sections/assistant";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { assistant: frAssistant } as const;

export const metadata: Metadata = { title: fr.assistant.metaTitle };

const t = fr.assistant;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Param = string | string[] | undefined;
type Props = { searchParams: Promise<{ bien?: Param; annonce?: Param; contexte?: Param }> };

const uuid = (value: Param) => (typeof value === "string" && UUID.test(value) ? value : null);

// L1-28: the assistant on a page (SPEC-V2 8.13 and 12, DESIGN.md 12
// « Assistant », gabarit G6): the page of a phone (the button of the header
// of « Ma vente », of the home of a buyer), also open on a large screen. The
// last conversation of the person in the context of the page, « Nouvelle
// conversation » in its header, the field at the bottom.
// The context (L2-06): the buyer's with ?annonce= (a listing they are
// reading) or ?contexte=acquereur, for an account that buys; otherwise the
// seller's for an account that sells (?bien=: the property a new
// conversation is about), the buyer's for one that only buys. An account
// with neither role has no assistant here.
export default async function AssistantPage({ searchParams }: Props) {
  const profile = await requireProfile();
  const params = await searchParams;
  const listingId = uuid(params.annonce);
  const context = assistantPageContext(profile.roles, {
    listing: listingId !== null,
    buyer: params.contexte === "acquereur",
  });
  if (!context) {
    redirect(profile.roles.includes("admin") ? ROUTES.adminAssistant : ROUTES.account);
  }

  const [read, listing] = await Promise.all([
    assistantConversation(profile, context),
    context === "buyer" && listingId ? listingFacts(listingId) : null,
  ]);
  // The listing the buyer came from, while it is online.
  const viewed = listing?.ok ? listing.data : null;
  const back =
    context === "buyer"
      ? viewed
        ? { href: `${ROUTES.listing}/${viewed.slug}`, label: t.buyer.backToListing }
        : { href: ROUTES.buyer, label: t.buyer.back }
      : undefined;

  return (
    <div className="mx-auto flex w-full max-w-200 flex-1 flex-col md:border-x md:border-lk-line">
      {read.ok ? (
        <AssistantPageChat
          context={context}
          initial={read.data}
          propertyId={context === "seller" ? uuid(params.bien) : null}
          listingId={viewed?.listingId ?? null}
          back={back}
        />
      ) : (
        <>
          <AssistantPageHeader back={back} />
          <div className="px-4 py-6">
            <InlineAlert tone="danger">{t.unavailable}</InlineAlert>
          </div>
        </>
      )}
    </div>
  );
}
