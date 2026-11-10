import "server-only";
import { z } from "zod";
import type { AiTool } from "@/core/ai/tools/types";
import { hasEntitlement } from "@/leenkey/billing/entitlements";
import { propertyName } from "@/leenkey/properties/sheet";
import { createClient } from "@/lib/supabase/server";
import { CASE_SUBJECT_MAX, CASE_SUMMARY_MAX, CASE_SUMMARY_MIN } from "@/lib/validations/assistant";
import type { CasePreview } from "../previews";
import { PROPERTY_NOT_FOUND, sellerPropertyById } from "../seller-data";

// create_case (SPEC-V2 sections 5 and 12, L1-31): the handoff to a human for
// a seller without an adviser in their plan. The request, summed up for the
// team, becomes a case of the back office once the seller has read it and
// confirmed (ConfirmActionCard). The seller cannot write a case: the
// function SQL ai_create_case (security definer) checks the account, the
// property and the number of open requests itself, and writes the case and
// the result of the tool in one transaction. Never the service role here
// (CLAUDE.md section 8).

const input = z.object({
  propertyId: z.string().uuid().nullable(),
  subject: z.string().trim().min(3).max(CASE_SUBJECT_MAX),
  summary: z.string().trim().min(CASE_SUMMARY_MIN).max(CASE_SUMMARY_MAX),
});

type Input = z.infer<typeof input>;
type Output =
  | { sent: true; caseId: string }
  | { sent: false; answered: true }
  | { sent: false; error: string };

const HAS_ADVISOR =
  "The plan of this property includes a Leenkey advisor: nothing was sent. " +
  "Use contact_advisor for this property instead.";

export const TOO_MANY_REQUESTS =
  "The seller already has 5 requests the team has not closed yet: nothing was sent. " +
  "The team answers them by email; a new one can be sent once one is closed.";

export const createCaseTool: AiTool<Input, Output, CasePreview> = {
  name: "create_case",
  description:
    "Hand a request of the seller over to the Leenkey team (a person, not an advisor of a paid " +
    "plan): a short subject and a summary written for the team (the request, its context, what " +
    "the seller expects), in French, in the seller's voice. Only when the seller asks for a " +
    "person, or for a dispute or a problem the assistant cannot settle; for a property whose " +
    "plan includes an advisor, use contact_advisor instead. The seller reads the request and " +
    "must confirm before it is sent; the team answers by email.",
  input,
  inputSchema: {
    type: "object",
    properties: {
      propertyId: {
        type: ["string", "null"],
        description:
          "Id of the property of the seller the request is about (from get_my_properties or " +
          "the file of the seller); null when it is about no property (the account, the site).",
      },
      subject: {
        type: "string",
        description: `What the request is about, in a few words, plain text, ${CASE_SUBJECT_MAX} characters at most.`,
      },
      summary: {
        type: "string",
        description: `The request for the team, plain text, ${CASE_SUMMARY_MAX} characters at most.`,
      },
    },
    required: ["propertyId", "subject", "summary"],
    additionalProperties: false,
  },
  requiresConfirmation: true,
  contexts: ["seller"],
  async preview({ propertyId, subject, summary }, ctx) {
    if (propertyId === null) {
      return { ok: true, data: { kind: "case_request", propertyName: null, subject, summary } };
    }
    const found = await sellerPropertyById(ctx.profileId, propertyId);
    if (!found.ok) return { ok: false, error: "The property could not be read. Try again later." };
    if (!found.data) return { ok: false, error: PROPERTY_NOT_FOUND };
    if (await hasEntitlement(propertyId, "advisor")) return { ok: false, error: HAS_ADVISOR };
    return {
      ok: true,
      data: { kind: "case_request", propertyName: propertyName(found.data), subject, summary },
    };
  },
  async execute({ propertyId, subject, summary }, ctx) {
    if (!ctx.call) return { sent: false, error: "Not confirmed by the seller: nothing was sent." };
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("ai_create_case", {
      p_conversation_id: ctx.call.conversationId,
      p_tool_use_id: ctx.call.toolUseId,
      p_tool_name: ctx.call.name,
      p_subject: subject,
      p_summary: summary,
      p_property: propertyId ?? undefined,
    });
    if (!error) return { sent: true, caseId: data };
    if (error.code === "23505") return { sent: false, answered: true };
    if (error.code === "54000") return { sent: false, error: TOO_MANY_REQUESTS };
    if (error.code !== "42501" && error.code !== "22023") {
      console.error("[ai] case handoff failed", {
        user_id: ctx.profileId,
        entity_id: propertyId ?? undefined,
        code: error.code,
      });
    }
    return { sent: false, error: "The request could not be sent. Nothing was sent." };
  },
};
