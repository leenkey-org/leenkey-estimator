import { photoUrl } from "@/leenkey/properties/photo-files";
import { sheetHref } from "@/leenkey/properties/sheet";
import { firstContactFrom } from "@/leenkey/billing/orders";
import { NBSP, formatDateShort, formatRooms } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { ConversationSummary } from "./types";

// What the messaging shows of a conversation, as plain values (unit-tested):
// title, other party, subtitle, preview, links, groups of the list.

const t = fr.messaging;
const SEPARATOR = `${NBSP}· `;

type Kind = Pick<ConversationSummary, "propertyType" | "rooms" | "city">;
type Party = Pick<ConversationSummary, "role" | "counterpartFirstName"> &
  Partial<Pick<ConversationSummary, "kind">>;

/** « Appartement 3 p · Savigny-sur-Orge », « Terrain · Étampes » (docs/DESIGN.md 10.5). */
export function conversationTitle({ propertyType, rooms, city }: Kind): string {
  const type = fr.propertyType[propertyType ?? "autre"];
  const withRooms = propertyType !== "terrain" && rooms !== null && rooms > 0;
  const kind = withRooms ? `${type} ${formatRooms(rooms, "short")}` : type;
  return city ? `${kind}${SEPARATOR}${city}` : kind;
}

/**
 * The other party: their first name, or « l'acquéreur », « le vendeur »;
 * « Mon conseiller Leenkey » for the adviser (L1-34).
 */
export function counterpartName({ kind, role, counterpartFirstName }: Party): string {
  if (kind === "advisor") return t.advisor.name;
  return counterpartFirstName ?? (role === "seller" ? t.someone.buyer : t.someone.seller);
}

/**
 * The header of an open conversation: the property and « Avec Thomas »; for
 * the adviser (SPEC 13, ConversationHeader), « Mon conseiller Leenkey », the
 * plan of the property and « Réponse sous 24 h », or the property once closed.
 */
export function conversationHeading(
  conversation: Party &
    Kind &
    Pick<
      ConversationSummary,
      "buyerFinancingStatus" | "listingTitle" | "closed" | "plan" | "advisorOrderedAt"
    > & {
      kind: ConversationSummary["kind"];
    },
  now: Date = new Date(),
): { title: string; subtitle: string } {
  if (conversation.kind === "advisor") {
    const property = conversation.listingTitle ?? conversationTitle(conversation);
    if (conversation.closed || !conversation.plan) {
      return { title: t.advisor.name, subtitle: property };
    }
    // Before the end of the withdrawal, no « within 24 h » (SPEC 11).
    const from = conversation.advisorOrderedAt
      ? firstContactFrom(new Date(conversation.advisorOrderedAt), false)
      : null;
    const delay =
      from && from.getTime() > now.getTime()
        ? t.advisor.from(formatDateShort(from, now))
        : t.advisor.reply;
    return { title: t.advisor.name, subtitle: `${fr.plan[conversation.plan]}${SEPARATOR}${delay}` };
  }
  return { title: conversationTitle(conversation), subtitle: conversationSubtitle(conversation) };
}

/**
 * « Avec Thomas »; for the seller, with the exact label of the financing of
 * the buyer (FinancingBadge): « Avec Thomas · Justificatif vérifié » (SPEC 8.6).
 */
export function conversationSubtitle(
  conversation: Party & Pick<ConversationSummary, "buyerFinancingStatus">,
): string {
  const name = counterpartName(conversation);
  const financing = conversation.buyerFinancingStatus;
  return conversation.role === "seller" && financing
    ? t.thread.withFinancing(name, fr.financingStatus[financing])
    : t.thread.with(name);
}

/** The last message on one line: « Vous : Bonjour… » when the viewer wrote it. */
export function messagePreview({
  lastMessageBody,
  lastMessageMine,
}: Pick<ConversationSummary, "lastMessageBody" | "lastMessageMine">): string {
  const text = lastMessageBody.replace(/\s+/g, " ").trim();
  return lastMessageMine ? `${t.list.you} ${text}` : text;
}

/**
 * Where the title of a conversation leads: the page of the property for the
 * seller, the listing for the buyer while it is online.
 */
export function propertyHref(
  conversation: Pick<ConversationSummary, "role" | "propertyId" | "listingSlug" | "listingStatus"> &
    Partial<Pick<ConversationSummary, "kind">>,
): string | null {
  // The adviser: the plan of the property (L1-34).
  if (conversation.kind === "advisor") return `/vendeur/formule?bien=${conversation.propertyId}`;
  if (conversation.role === "seller") return sheetHref(conversation.propertyId);
  const { listingSlug, listingStatus } = conversation;
  return listingSlug && listingStatus === "published" ? `/annonce/${listingSlug}` : null;
}

/**
 * Name of the way back to what the conversation is about (DECISIONS
 * 2026-10-26): « Voir mon bien » for the seller, « Voir l'annonce » for the
 * buyer.
 */
export function propertyHrefLabel(
  conversation: Pick<ConversationSummary, "role"> & Partial<Pick<ConversationSummary, "kind">>,
): string {
  if (conversation.kind === "advisor") return t.advisor.plan;
  return conversation.role === "seller" ? t.thread.property : t.thread.listing;
}

/** The thumbnail of a property: its main photo through /img, or facade.svg. */
export function coverSrc(coverPath: string | null): string | null {
  return coverPath ? photoUrl(coverPath) : null;
}

export type ConversationGroup = {
  key: string;
  /** null: a single list, without a heading. */
  title: string | null;
  /** The property on each line: not under the heading of that property. */
  showProperty: boolean;
  conversations: ConversationSummary[];
};

/**
 * Groups of the list (SPEC 8.6): one list, unless the account sells several
 * properties or sells and buys; then one group per property sold (its
 * listing title), then the listings it contacted. Most recent first.
 */
export function groupConversations(list: readonly ConversationSummary[]): ConversationGroup[] {
  const selling = list.filter((conversation) => conversation.role === "seller");
  const buying = list.filter((conversation) => conversation.role === "buyer");
  const properties = [...new Set(selling.map((conversation) => conversation.propertyId))];
  if (list.length === 0) return [];
  if (properties.length <= 1 && (selling.length === 0 || buying.length === 0)) {
    return [{ key: "all", title: null, showProperty: true, conversations: [...list] }];
  }
  const groups: ConversationGroup[] = properties.map((propertyId) => {
    const conversations = selling.filter((conversation) => conversation.propertyId === propertyId);
    return {
      key: propertyId,
      title: conversations[0].listingTitle ?? conversationTitle(conversations[0]),
      showProperty: false,
      conversations,
    };
  });
  if (buying.length > 0) {
    groups.push({ key: "buying", title: t.list.buying, showProperty: true, conversations: buying });
  }
  return groups;
}

/** The first message of a buyer, from a listing (`visite=1`: about a visit). */
export function newConversationPath(listingId: string, { visit = false } = {}): string {
  const params = new URLSearchParams({ annonce: listingId });
  if (visit) params.set("visite", "1");
  return `/messages/nouveau?${params.toString()}`;
}
