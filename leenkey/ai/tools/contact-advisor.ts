import "server-only";
import { z } from "zod";
import type { AiTool } from "@/core/ai/tools/types";
import { hasEntitlement } from "@/leenkey/billing/entitlements";
import { propertyName } from "@/leenkey/properties/sheet";
import { createClient } from "@/lib/supabase/server";
import type { HandoffPreview } from "../previews";
import { PROPERTY_NOT_FOUND, sellerPropertyById } from "../seller-data";
import { withProperty } from "./shared";

// contact_advisor (SPEC-V2 section 12, L1-34): the summary of the seller's
// question, posted in the conversation with their adviser once they have
// read it and confirmed (ConfirmActionCard). Only for a property whose plan
// includes the adviser (has_entitlement, never a plan name); the database
// checks it again, and writes the message and the result of the tool in one
// transaction (ai_advisor_handoff).

/** Long enough for a question and its context, short enough to read before confirming. */
export const HANDOFF_SUMMARY_MAX = 1500;

const input = z.object({
  propertyId: z.string().uuid(),
  summary: z.string().trim().min(1).max(HANDOFF_SUMMARY_MAX),
});

type Input = z.infer<typeof input>;
type Output =
  | { sent: true; conversationId: string }
  | { sent: false; answered: true }
  | { sent: false; error: string };

const NO_ADVISOR =
  "The plan of this property does not include a Leenkey advisor: nothing was sent. " +
  "The seller can see the plans on the page of their plan.";

export const contactAdvisorTool: AiTool<Input, Output, HandoffPreview> = {
  name: "contact_advisor",
  description:
    "Send the seller's question to their Leenkey advisor, in the conversation with the advisor of " +
    "one property: a short summary written for the advisor (the question, its context, what the " +
    "seller expects), in French, in the seller's voice. Only when the plan of the property " +
    "includes an advisor (get_upgrade_context: advisorIncluded). The seller reads the summary " +
    "and must confirm before it is sent.",
  input,
  inputSchema: withProperty(
    {
      summary: {
        type: "string",
        description: `The summary of the question for the advisor, plain text, ${HANDOFF_SUMMARY_MAX} characters at most.`,
      },
    },
    ["summary"],
  ),
  requiresConfirmation: true,
  contexts: ["seller"],
  async preview({ propertyId, summary }, ctx) {
    const found = await sellerPropertyById(ctx.profileId, propertyId);
    if (!found.ok) return { ok: false, error: "The property could not be read. Try again later." };
    if (!found.data) return { ok: false, error: PROPERTY_NOT_FOUND };
    if (!(await hasEntitlement(propertyId, "advisor"))) return { ok: false, error: NO_ADVISOR };
    return {
      ok: true,
      data: { kind: "advisor_handoff", propertyName: propertyName(found.data), summary },
    };
  },
  async execute({ propertyId, summary }, ctx) {
    if (!ctx.call) return { sent: false, error: "Not confirmed by the seller: nothing was sent." };
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("ai_advisor_handoff", {
      p_conversation_id: ctx.call.conversationId,
      p_tool_use_id: ctx.call.toolUseId,
      p_tool_name: ctx.call.name,
      p_property: propertyId,
      p_summary: summary,
    });
    if (!error) return { sent: true, conversationId: data };
    if (error.code === "23505") return { sent: false, answered: true };
    if (error.code === "22023") return { sent: false, error: NO_ADVISOR };
    if (error.code !== "42501") {
      console.error("[ai] advisor handoff failed", {
        user_id: ctx.profileId,
        entity_id: propertyId,
        code: error.code,
      });
    }
    return { sent: false, error: "The question could not be sent. Nothing was sent." };
  },
};
