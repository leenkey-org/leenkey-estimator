import "server-only";
import type { z } from "zod";
import { logResult } from "@/core/ai/log";
import type { AiTool, ToolInputSchema } from "@/core/ai/tools/types";
import { alertSummary } from "@/leenkey/alerts/presentation";
import { createClient } from "@/lib/supabase/server";
import { ALERT_NAME_MAX, ALERTS_MAX, alertNameSchema, hasCriterion } from "@/lib/validations/alert";
import type { SearchFilters } from "@/lib/validations/search";
import type { Json } from "@/types/database";
import type { AlertCreationPreview } from "../previews";
import { searchQueryOf, searchRequest, searchRequestSchema } from "../search-request";

// create_alert (SPEC-V2 sections 12 and 16, L3-06): the search the buyer
// describes, in the words search_listings takes, is kept as an alert under a
// name once they have read its name and its criteria and confirmed
// (ConfirmActionCard). The criteria are read as the search page reads its
// address (search-request.ts): an alert is always a search the site can
// show. Written with the session of the buyer (RLS: their own alerts, an
// active account; the trigger of `alerts` refuses the sixth). Never the
// service role here (CLAUDE.md section 8).
//
// The insert does not write the log of the assistant: the result is logged
// here once the alert is created, once per call (unique index); a call
// answered meanwhile (another tab) takes its alert back.

const input = searchRequest.omit({ sort: true }).extend({ name: alertNameSchema });

type Input = z.infer<typeof input>;
type Output =
  | { created: true; alertId: string; name: string }
  | { created: false; answered: true }
  | { created: false; error: string };

const { sort: _sort, ...criteriaProperties } = searchRequestSchema.properties;
void _sort;

const inputSchema: ToolInputSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description:
        `A short name for the alert, in French, from its criteria (« Maison à Savigny-sur-Orge, ` +
        `400 000 € max »), ${ALERT_NAME_MAX} characters at most; the name the buyer gave when ` +
        "they gave one.",
    },
    ...criteriaProperties,
  },
  required: ["name", ...searchRequestSchema.required.filter((key) => key !== "sort")],
  additionalProperties: false,
};

export const ALERT_NO_CRITERION =
  "An alert needs at least one criterion the search knows (a commune or a 5-digit postal code, " +
  "a type, a budget, a surface, rooms…): none was understood. Ask the buyer what they look " +
  "for. Nothing was created.";
export const ALERT_LIMIT =
  `The buyer already has ${ALERTS_MAX} alerts, the most an account keeps: they delete one from ` +
  "the page « Mes alertes » of their space before creating another. Nothing was created.";

const filtersOf = (values: Input): SearchFilters =>
  searchQueryOf({ ...values, sort: "recent" }).filters;

export const createAlertTool: AiTool<Input, Output, AlertCreationPreview> = {
  name: "create_alert",
  description:
    "Keep a search of the buyer as an alert: Leenkey then emails them, once a day at most, the " +
    "new listings that match. Fill each criterion from the words of the buyer only, as for " +
    'search_listings, and leave every other one empty (« any », "", 0, [], false). The buyer ' +
    "reads the name and the criteria and confirms before anything is created. Only when the " +
    "buyer asks to be warned of new listings, or accepts your proposal of an alert after a " +
    `search with few or no results. An account keeps ${ALERTS_MAX} alerts at most.`,
  input,
  inputSchema,
  requiresConfirmation: true,
  contexts: ["buyer"],
  async preview(values, ctx) {
    const filters = filtersOf(values);
    if (!hasCriterion(filters)) return { ok: false, error: ALERT_NO_CRITERION };
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", ctx.profileId);
    if (error) return { ok: false, error: "The alerts could not be read. Try again later." };
    if ((count ?? 0) >= ALERTS_MAX) return { ok: false, error: ALERT_LIMIT };
    return {
      ok: true,
      data: { kind: "alert_creation", name: values.name, criteria: alertSummary(filters) },
    };
  },
  async execute(values, ctx) {
    if (!ctx.call) {
      return { created: false, error: "Not confirmed by the buyer: nothing was created." };
    }
    const filters = filtersOf(values);
    if (!hasCriterion(filters)) return { created: false, error: ALERT_NO_CRITERION };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("alerts")
      // Read as the search page reads its address: the stored form of SearchFilters.
      .insert({ buyer_id: ctx.profileId, name: values.name, criteria: filters as Json })
      .select("id, name")
      .single();
    if (error) {
      if (error.code === "23514") return { created: false, error: ALERT_LIMIT };
      console.error("[ai] alert not created", { user_id: ctx.profileId, code: error.code });
      return { created: false, error: "The alert could not be created. Nothing was created." };
    }
    const output: Output = { created: true, alertId: data.id, name: data.name };
    const logged = await logResult(supabase, ctx.call.conversationId, {
      type: "tool_result",
      tool_use_id: ctx.call.toolUseId,
      name: ctx.call.name,
      status: "confirmed",
      result: output,
    });
    // Answered meanwhile (another tab at the same moment): one alert, the one of the log.
    if (logged === "duplicate") {
      await supabase.from("alerts").delete().eq("id", data.id);
      return { created: false, answered: true };
    }
    if (logged === "failed") {
      console.error("[ai] alert created, its result not logged", {
        user_id: ctx.profileId,
        entity_id: data.id,
      });
    }
    return output;
  },
};
