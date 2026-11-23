import { beforeEach, describe, expect, it, vi } from "vitest";

// Interventions of the adviser (DECISIONS.md 2026-11-23): the actions of the
// seller and of the team, with a script of answers for the Supabase client.
// The rules themselves (ownership, plan, quota, audit) are those of the
// database: supabase/tests/rls_advisor_interventions.sql.

type Answer = { data: unknown; error: { code: string; message: string } | null };
type Call = { target: string; values?: unknown };

const PROPERTY = "5eed1000-0000-4000-8000-000000000001";
const INTERVENTION = "5eed9000-0000-4000-8000-000000000001";

const mocks = vi.hoisted(() => ({
  profile: null as { id: string; roles: string[] } | null,
  answers: [] as Answer[],
  calls: [] as Call[],
  revalidated: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => {
    mocks.revalidated.push(path);
  },
}));
vi.mock("@/core/auth/session", () => ({ getProfile: async () => mocks.profile }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async (name: string, values: unknown) => {
      mocks.calls.push({ target: name, values });
      return mocks.answers.shift() ?? { data: null, error: null };
    },
  }),
}));

const { requestIntervention } = await import("@/leenkey/advisor/actions");
const { changeIntervention } = await import("@/leenkey/admin/interventions/actions");

const seller = { id: "5eed0000-0000-4000-8000-00000000000a", roles: ["seller"] };
const admin = { id: "5eed0000-0000-4000-8000-0000000000ad", roles: ["admin"] };
const refused = (code: string, message: string): Answer => ({
  data: null,
  error: { code, message },
});
const request = {
  propertyId: PROPERTY,
  reason: "price_strategy",
  message: "Faut-il revoir mon prix avant les visites ?",
};

beforeEach(() => {
  mocks.profile = seller;
  mocks.answers.length = 0;
  mocks.calls.length = 0;
  mocks.revalidated.length = 0;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("« Demander une intervention »", () => {
  it("asks for a session, then for a reason and a message", async () => {
    mocks.profile = null;
    expect(await requestIntervention(request)).toEqual({ ok: false, error: "auth" });
    mocks.profile = seller;
    expect(await requestIntervention({ ...request, reason: "initial_meeting" })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await requestIntervention({ ...request, message: "Court" })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(mocks.calls).toEqual([]);
  });

  it("sends the request to the database, with the session of the seller", async () => {
    mocks.answers.push({ data: INTERVENTION, error: null });
    expect(await requestIntervention(request)).toEqual({
      ok: true,
      data: { interventionId: INTERVENTION },
    });
    expect(mocks.calls).toEqual([
      {
        target: "advisor_intervention_request",
        values: { p_property: PROPERTY, p_reason: "price_strategy", p_message: request.message },
      },
    ]);
    expect(mocks.revalidated).toContain(`/vendeur/biens/${PROPERTY}/intervention`);
    expect(mocks.revalidated).toContain("/vendeur");
  });

  it("says why the database refused: the interventions used, no adviser, too many messages", async () => {
    mocks.answers.push(refused("54000", "advisor_intervention: quota"));
    expect(await requestIntervention(request)).toEqual({ ok: false, error: "quota" });
    mocks.answers.push(refused("54000", "messages_per_hour"));
    expect(await requestIntervention(request)).toEqual({ ok: false, error: "rate" });
    mocks.answers.push(refused("22023", "advisor_intervention: no intervention in this plan"));
    expect(await requestIntervention(request)).toEqual({ ok: false, error: "noAdvisor" });
    mocks.answers.push(refused("22023", "advisor_intervention: no conversation with the adviser"));
    expect(await requestIntervention(request)).toEqual({ ok: false, error: "noAdvisor" });
    mocks.answers.push(refused("22023", "advisor_intervention: message length"));
    expect(await requestIntervention(request)).toEqual({ ok: false, error: "invalid" });
    mocks.answers.push(refused("42501", "property not found"));
    expect(await requestIntervention(request)).toEqual({ ok: false, error: "unavailable" });
    expect(mocks.revalidated).toEqual([]);
  });
});

describe("the actions of the team on an intervention", () => {
  it("are for an admin only", async () => {
    expect(
      await changeIntervention({
        action: "status",
        interventionId: INTERVENTION,
        status: "done",
        note: "",
      }),
    ).toEqual({ ok: false, error: "forbidden" });
    expect(mocks.calls).toEqual([]);
  });

  it("set a status, with the note when there is one", async () => {
    mocks.profile = admin;
    expect(
      await changeIntervention({
        action: "status",
        interventionId: INTERVENTION,
        status: "done",
        note: " Appel de 20 minutes. ",
      }),
    ).toEqual({ ok: true });
    expect(
      await changeIntervention({
        action: "status",
        interventionId: INTERVENTION,
        status: "cancelled",
        note: "",
      }),
    ).toEqual({ ok: true });
    expect(mocks.calls).toEqual([
      {
        target: "admin_advisor_intervention_set",
        values: { p_intervention: INTERVENTION, p_status: "done", p_note: "Appel de 20 minutes." },
      },
      {
        target: "admin_advisor_intervention_set",
        values: { p_intervention: INTERVENTION, p_status: "cancelled", p_note: undefined },
      },
    ]);
    expect(mocks.revalidated).toContain("/admin/messages");
  });

  it("plan the initial appointment of a property, which has no row yet", async () => {
    mocks.profile = admin;
    mocks.answers.push({ data: INTERVENTION, error: null });
    expect(
      await changeIntervention({
        action: "initial",
        propertyId: PROPERTY,
        status: "scheduled",
        note: "",
      }),
    ).toEqual({ ok: true });
    expect(mocks.calls[0]).toEqual({
      target: "admin_advisor_initial_meeting",
      values: { p_property: PROPERTY, p_status: "scheduled", p_note: undefined },
    });
  });

  it("say a change that already happened, an intervention that is gone", async () => {
    mocks.profile = admin;
    const command = {
      action: "status",
      interventionId: INTERVENTION,
      status: "scheduled",
      note: "",
    };
    mocks.answers.push(refused("22023", "already in that status"));
    expect(await changeIntervention(command)).toEqual({ ok: false, error: "conflict" });
    mocks.answers.push(refused("P0002", "intervention not found"));
    expect(await changeIntervention(command)).toEqual({ ok: false, error: "not_found" });
    expect(await changeIntervention({ ...command, status: "requested" })).toEqual({
      ok: false,
      error: "invalid",
    });
  });
});
