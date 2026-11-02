import "server-only";
import type { AiTool } from "@/core/ai/tools/types";
import { listConversations } from "@/leenkey/messaging/queries";
import { propertyConversations } from "@/leenkey/properties/dashboard";
import { fr } from "@/lib/i18n/fr";
import { PROPERTY_NOT_FOUND, sellerPropertyById } from "../seller-data";
import { parisDay, propertyInput, propertyInputSchema, type PropertyInput } from "./shared";

// summarize_contacts (SPEC-V2 section 12): the buyers who contacted the
// seller about a property: their first name, the status of their financing
// as the seller sees it (never amounts nor documents, CLAUDE.md section 7),
// their last activity. Not the messages themselves.

const CONTACTS_MAX = 20;

export const summarizeContactsTool: AiTool<PropertyInput, unknown> = {
  name: "summarize_contacts",
  description:
    "List the buyers who contacted the seller about one property (20 most recent): first name, " +
    "status of their financing (declared information, document provided or document checked by " +
    "Leenkey; never amounts), day of the last message, who wrote last, unread, closed.",
  input: propertyInput,
  inputSchema: propertyInputSchema,
  requiresConfirmation: false,
  contexts: ["seller"],
  async execute({ propertyId }, ctx) {
    const found = await sellerPropertyById(ctx.profileId, propertyId);
    if (!found.ok) return { error: "unavailable" };
    if (!found.data) return { error: PROPERTY_NOT_FOUND };
    const conversations = await listConversations();
    if (!conversations.ok) return { error: "unavailable" };
    const contacts = propertyConversations(conversations.data, propertyId);
    return {
      total: contacts.length,
      contacts: contacts.slice(0, CONTACTS_MAX).map((conversation) => ({
        firstName: conversation.counterpartFirstName,
        financing: fr.financingStatus[conversation.buyerFinancingStatus ?? "not_provided"],
        lastMessageOn: parisDay(conversation.lastMessageAt),
        lastMessageBy: conversation.lastMessageMine ? "the seller" : "the buyer",
        unread: conversation.unread,
        closed: conversation.closed,
      })),
    };
  },
};
