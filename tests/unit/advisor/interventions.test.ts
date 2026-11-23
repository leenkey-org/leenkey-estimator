import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { interventionFeedback } from "@/leenkey/admin/feedback";
import {
  adviserStart,
  canRequestIntervention,
  interventionActions,
  interventionAvailability,
  interventionFilterCounts,
  interventionsHref,
  interventionsLeft,
  interventionsUsedPercent,
  isOpenIntervention,
  matchesInterventionFilter,
  toInterventionSummary,
  type InterventionSummaryRow,
} from "@/leenkey/advisor/interventions";
import { frAdvisorInterventions } from "@/lib/i18n/sections/advisorInterventions";
import {
  adminInterventionsHref,
  INTERVENTION_REASONS,
  interventionCommandSchema,
  interventionRequestSchema,
  parseAdminInterventionsQuery,
} from "@/lib/validations/advisor-intervention";

// Interventions of the adviser (DECISIONS.md 2026-11-23): the counter of a
// property, what the seller may ask, the filters and the actions of the
// team, and what is sent (Zod). The SQL in
// supabase/tests/rls_advisor_interventions.sql.

const PROPERTY = "5eed1000-0000-4000-8000-000000000001";
const INTERVENTION = "5eed9000-0000-4000-8000-000000000001";

const row = (values: Partial<InterventionSummaryRow> = {}): InterventionSummaryRow => ({
  quota: 4,
  used: 2,
  pending: 1,
  initial_meeting: null,
  next_plan: "serenite",
  next_plan_name: "Sérénité",
  next_quota: 6,
  ...values,
});

describe("the counter of the interventions of a property", () => {
  it("reads what the database says: the number of the plan, what is used, the dearer plan", () => {
    expect(toInterventionSummary(row())).toEqual({
      quota: 4,
      used: 2,
      pending: 1,
      initialMeeting: "todo",
      upgrade: { plan: "serenite", name: "Sérénité", quota: 6 },
    });
  });

  it("has no counter without a plan that sells interventions", () => {
    expect(toInterventionSummary(undefined)).toBeNull();
    expect(toInterventionSummary(row({ quota: null }))).toBeNull();
    expect(toInterventionSummary(row({ quota: 0 }))).toBeNull();
  });

  it("offers a dearer plan only when it sells more interventions", () => {
    const none = { next_plan: null, next_plan_name: null, next_quota: null };
    expect(toInterventionSummary(row({ quota: 6, ...none }))?.upgrade).toBeNull();
    expect(toInterventionSummary(row({ next_quota: 4 }))?.upgrade).toBeNull();
    expect(toInterventionSummary(row({ next_plan_name: null }))?.upgrade).toBeNull();
  });

  it("says the initial appointment apart: to plan, scheduled, done", () => {
    expect(toInterventionSummary(row())?.initialMeeting).toBe("todo");
    expect(toInterventionSummary(row({ initial_meeting: "scheduled" }))?.initialMeeting).toBe(
      "scheduled",
    );
    expect(toInterventionSummary(row({ initial_meeting: "done" }))?.initialMeeting).toBe("done");
    // A cancelled one is to plan again.
    expect(toInterventionSummary(row({ initial_meeting: "cancelled" }))?.initialMeeting).toBe(
      "todo",
    );
  });

  it("counts what is left, never below zero", () => {
    expect(interventionsLeft({ quota: 4, used: 0 })).toBe(4);
    expect(interventionsLeft({ quota: 4, used: 3 })).toBe(1);
    expect(interventionsLeft({ quota: 4, used: 4 })).toBe(0);
    // One more done by the team as a gesture.
    expect(interventionsLeft({ quota: 4, used: 5 })).toBe(0);
  });

  it("lets the seller ask while an intervention is left that no request holds", () => {
    expect(interventionAvailability({ quota: 4, used: 3, pending: 0 })).toBe("open");
    expect(canRequestIntervention({ quota: 4, used: 3, pending: 0 })).toBe(true);
    // A request that waits holds one of those left: never more requests than interventions.
    expect(interventionAvailability({ quota: 4, used: 3, pending: 1 })).toBe("held");
    expect(interventionAvailability({ quota: 4, used: 0, pending: 4 })).toBe("held");
    expect(canRequestIntervention({ quota: 4, used: 2, pending: 2 })).toBe(false);
    expect(interventionAvailability({ quota: 4, used: 2, pending: 1 })).toBe("open");
    // The interventions of the plan done: used, whatever waits.
    expect(interventionAvailability({ quota: 4, used: 4, pending: 0 })).toBe("used");
    expect(interventionAvailability({ quota: 4, used: 5, pending: 1 })).toBe("used");
    expect(canRequestIntervention({ quota: 6, used: 4, pending: 1 })).toBe(true);
  });

  it("says when the adviser starts, during the withdrawal period without an immediate start", () => {
    const ordered = "2026-11-10T09:00:00Z";
    // 14 days of withdrawal, then the day after: as the header of the conversation.
    const start = adviserStart(ordered, new Date("2026-11-12T09:00:00Z"));
    expect(start?.toISOString().slice(0, 10)).toBe("2026-11-25");
    // Once that day has come, or with an immediate start (no order waiting): the usual delays.
    expect(adviserStart(ordered, new Date("2026-11-26T09:00:00Z"))).toBeNull();
    expect(adviserStart(null, new Date("2026-11-12T09:00:00Z"))).toBeNull();
    const t = frAdvisorInterventions.seller.form;
    expect(t.delayFrom("25 nov.")).not.toContain("jours ouvrés");
    expect(t.sentFrom("25 nov.")).toContain("Votre accompagnement commence le 25 nov.");
    expect(frAdvisorInterventions.admin.startsOn("25 nov.")).toBe(
      "Accompagnement à partir du 25 nov. (fin du délai de rétractation)",
    );
  });

  it("fills its bar with what is used, 100 % at most", () => {
    expect(interventionsUsedPercent({ quota: 4, used: 0 })).toBe(0);
    expect(interventionsUsedPercent({ quota: 4, used: 1 })).toBe(25);
    expect(interventionsUsedPercent({ quota: 6, used: 2 })).toBe(33);
    expect(interventionsUsedPercent({ quota: 4, used: 5 })).toBe(100);
    expect(interventionsUsedPercent({ quota: 0, used: 0 })).toBe(0);
  });

  it("is worded with its numbers, the initial appointment apart", () => {
    const t = frAdvisorInterventions;
    expect(t.counter(2, 4)).toBe("2\u00A0interventions utilisées sur\u00A04");
    expect(t.counter(1, 4)).toBe("1\u00A0intervention utilisée sur\u00A04");
    expect(t.counter(0, 6)).toBe("0\u00A0intervention utilisée sur\u00A06");
    expect(t.initialMeeting.todo).toBe("Rendez-vous initial : à planifier");
    expect(t.initialMeeting.done).toBe("Rendez-vous initial : fait");
    expect(t.seller.used.text(4)).toBe("Les 4\u00A0interventions de votre formule sont utilisées.");
    expect(t.seller.used.upgrade("Sérénité", 6)).toBe("La formule Sérénité en comprend 6.");
  });

  it("is asked from the page of the property", () => {
    expect(interventionsHref(PROPERTY)).toBe(`/vendeur/biens/${PROPERTY}/intervention`);
  });
});

describe("the request of the seller", () => {
  it("takes a reason of the list and a message", () => {
    const parsed = interventionRequestSchema.safeParse({
      propertyId: PROPERTY,
      reason: "price_strategy",
      message: "  Faut-il revoir mon prix avant les visites ?  ",
    });
    expect(parsed.success && parsed.data.message).toBe(
      "Faut-il revoir mon prix avant les visites ?",
    );
    for (const reason of INTERVENTION_REASONS) {
      expect(
        interventionRequestSchema.safeParse({
          propertyId: PROPERTY,
          reason,
          message: "Une question pour mon conseiller.",
        }).success,
      ).toBe(true);
    }
  });

  it("refuses the initial appointment, an unknown reason, a message too short or too long", () => {
    const base = { propertyId: PROPERTY, message: "Une question pour mon conseiller." };
    expect(
      interventionRequestSchema.safeParse({ ...base, reason: "initial_meeting" }).success,
    ).toBe(false);
    expect(interventionRequestSchema.safeParse({ ...base, reason: "" }).success).toBe(false);
    expect(
      interventionRequestSchema.safeParse({ ...base, reason: "listing", message: "   Court   " })
        .success,
    ).toBe(false);
    expect(
      interventionRequestSchema.safeParse({
        ...base,
        reason: "listing",
        message: "x".repeat(2001),
      }).success,
    ).toBe(false);
    expect(
      interventionRequestSchema.safeParse({ ...base, propertyId: "LK-0001", reason: "listing" })
        .success,
    ).toBe(false);
  });

  it("names every reason of the form, and the initial appointment", () => {
    for (const reason of INTERVENTION_REASONS) {
      expect(frAdvisorInterventions.reasons[reason]).toBeTruthy();
    }
    expect(frAdvisorInterventions.reasons.initial_meeting).toBe("Rendez-vous initial");
  });

  it("names the reasons as the database does in the message of the conversation", () => {
    // advisor_intervention_reason_label writes the reason in the message of the seller: the
    // same words as the form and the back office.
    const sql = readFileSync(
      "supabase/migrations/20261123110000_advisor_interventions.sql",
      "utf8",
    );
    const start = sql.indexOf("create function public.advisor_intervention_reason_label");
    const body = sql.slice(start, sql.indexOf("$$;", start));
    const labels = Object.fromEntries(
      [...body.matchAll(/when '([a-z_]+)' then '([^']+)'/g)].map((match) => [match[1], match[2]]),
    );
    const other = /else '([^']+)'/.exec(body)?.[1];
    expect({ ...labels, other }).toEqual(frAdvisorInterventions.reasons);
  });
});

describe("the list of the team", () => {
  it("shows what waits first: a request, an intervention scheduled", () => {
    expect(isOpenIntervention("requested")).toBe(true);
    expect(isOpenIntervention("scheduled")).toBe(true);
    expect(isOpenIntervention("done")).toBe(false);
    expect(isOpenIntervention("cancelled")).toBe(false);
    expect(matchesInterventionFilter("scheduled", "open")).toBe(true);
    expect(matchesInterventionFilter("done", "open")).toBe(false);
    expect(matchesInterventionFilter("done", "done")).toBe(true);
    expect(matchesInterventionFilter("cancelled", "done")).toBe(false);
    expect(matchesInterventionFilter("cancelled", "all")).toBe(true);
    expect(
      interventionFilterCounts(["requested", "scheduled", "done", "done", "cancelled"]),
    ).toEqual({ open: 2, done: 2, cancelled: 1, all: 5 });
  });

  it("reads its filter in the address, what waits by default", () => {
    expect(parseAdminInterventionsQuery({})).toBe("open");
    expect(parseAdminInterventionsQuery({ statut: "faites" })).toBe("done");
    expect(parseAdminInterventionsQuery({ statut: ["annulees", "x"] })).toBe("cancelled");
    expect(parseAdminInterventionsQuery({ statut: "toutes" })).toBe("all");
    expect(parseAdminInterventionsQuery({ statut: "done" })).toBe("open");
    expect(adminInterventionsHref()).toBe("/admin/messages/interventions");
    expect(adminInterventionsHref("done")).toBe("/admin/messages/interventions?statut=faites");
  });

  it("offers the statuses an entry does not have; an initial appointment to plan is never cancelled", () => {
    expect(interventionActions("requested", true)).toEqual(["scheduled", "done", "cancelled"]);
    expect(interventionActions("scheduled", true)).toEqual(["done", "cancelled"]);
    // A mistake is corrected: done by error goes back to scheduled or cancelled.
    expect(interventionActions("done", true)).toEqual(["scheduled", "cancelled"]);
    expect(interventionActions("cancelled", true)).toEqual(["scheduled", "done"]);
    expect(interventionActions("requested", false)).toEqual(["scheduled", "done"]);
    // A cancelled initial appointment is planned again from « À planifier », not from its row.
    expect(interventionActions("cancelled", true, true)).toEqual([]);
    expect(interventionActions("scheduled", true, true)).toEqual(["done", "cancelled"]);
  });

  it("sends a status with an optional note, or the initial appointment of a property", () => {
    const status = interventionCommandSchema.safeParse({
      action: "status",
      interventionId: INTERVENTION,
      status: "done",
      note: "  Appel de 20 minutes.  ",
    });
    expect(status.success && status.data.note).toBe("Appel de 20 minutes.");
    expect(
      interventionCommandSchema.safeParse({
        action: "initial",
        propertyId: PROPERTY,
        status: "scheduled",
        note: "",
      }).success,
    ).toBe(true);
    // Never back to « requested », never an initial appointment cancelled before it exists.
    expect(
      interventionCommandSchema.safeParse({
        action: "status",
        interventionId: INTERVENTION,
        status: "requested",
        note: "",
      }).success,
    ).toBe(false);
    expect(
      interventionCommandSchema.safeParse({
        action: "initial",
        propertyId: PROPERTY,
        status: "cancelled",
        note: "",
      }).success,
    ).toBe(false);
    expect(
      interventionCommandSchema.safeParse({
        action: "status",
        interventionId: INTERVENTION,
        status: "done",
        note: "x".repeat(2001),
      }).success,
    ).toBe(false);
  });

  it("says the outcome of an action, and when the page is out of date", () => {
    expect(interventionFeedback("done", { ok: true })).toEqual({
      tone: "success",
      text: "Intervention marquée comme faite.",
    });
    expect(interventionFeedback("cancelled", { ok: true }).text).toBe("Intervention annulée.");
    expect(interventionFeedback("scheduled", { ok: false, error: "conflict" }).tone).toBe(
      "warning",
    );
    expect(interventionFeedback("done", { ok: false, error: "forbidden" }).tone).toBe("danger");
    expect(interventionFeedback("done", null)).toMatchObject({ tone: "danger", reload: true });
  });
});
