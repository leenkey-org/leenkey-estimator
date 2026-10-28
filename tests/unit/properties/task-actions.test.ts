import { beforeEach, describe, expect, it, vi } from "vitest";
import { toProgress, type StepRow } from "@/core/steps/progress";
import type { Progress } from "@/core/steps/types";

// L1-24: a task of the sale ticked by hand (setSaleTaskDone), with a script
// of answers for the Supabase client. An update, then an insert when there is
// no row yet, never an upsert: the seller may only change done_at and done_by
// (column grants), and the ON CONFLICT of an upsert sets every column sent.
// The RLS of sale_task_status is tested in supabase/tests/rls_sale_engine.sql.

const propertyId = "5eed1000-0000-4000-8000-000000000001";
const notaryTask = "9fbeab85-f57b-4f63-9de0-9f33599d47d4";
const writtenTask = "0c6f4b4e-35a4-4e55-9a77-2b2c1f6a1d01";

const rows: StepRow[] = [
  {
    code: "publish",
    position: 2,
    title: "Créer et publier mon annonce",
    description: "",
    owner: "seller",
    tasks: [
      {
        id: writtenTask,
        code: "listing_written",
        title: "Annonce rédigée",
        required: true,
        auto_trigger: "listing.draft_complete",
        owner: "seller",
        position: 1,
      },
    ],
  },
  {
    code: "notary",
    position: 5,
    title: "Préparer ma vente avec le notaire",
    description: "",
    owner: "seller",
    tasks: [
      {
        id: notaryTask,
        code: "notary_chosen",
        title: "Notaire choisi",
        required: true,
        auto_trigger: null,
        owner: "seller",
        position: 1,
      },
    ],
  },
];

const at = (current: string): Progress =>
  toProgress({ template: "accompagne", currentStepCode: current }, rows, []);

type Answer = { data: unknown; error: { code: string } | null };
type Call = { table: string; op: string; values?: unknown };

const mocks = vi.hoisted(() => ({
  profile: { id: "5eed0000-0000-4000-8000-00000000000a", roles: ["seller"] } as {
    id: string;
    roles: string[];
  } | null,
  progress: { ok: true, data: null } as { ok: boolean; data: unknown },
  listing: { data: { status: "published" }, error: null } as Answer,
  writes: [] as Answer[],
  calls: [] as Call[],
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/core/auth/session", () => ({ getProfile: async () => mocks.profile }));
vi.mock("@/leenkey/properties/sale", () => ({ saleProgress: async () => mocks.progress }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from(table: string) {
      const call: Call = { table, op: "select" };
      mocks.calls.push(call);
      const answer = async () =>
        table === "listings" ? mocks.listing : (mocks.writes.shift() ?? { data: [], error: null });
      // A thenable chain: awaited at the end of any of its calls.
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: answer,
        update(values: unknown) {
          Object.assign(call, { op: "update", values });
          return chain;
        },
        insert(values: unknown) {
          Object.assign(call, { op: "insert", values });
          return chain;
        },
        upsert() {
          Object.assign(call, { op: "upsert" });
          return chain;
        },
        then(resolve: (value: Answer) => void, reject: (reason: unknown) => void) {
          return answer().then(resolve, reject);
        },
      };
      return chain;
    },
  }),
}));

const writes = () => mocks.calls.filter((call) => call.table === "sale_task_status");

describe("setSaleTaskDone (L1-24)", () => {
  beforeEach(() => {
    mocks.profile = { id: "5eed0000-0000-4000-8000-00000000000a", roles: ["seller"] };
    mocks.progress = { ok: true, data: at("notary") };
    mocks.listing = { data: { status: "published" }, error: null };
    mocks.writes.length = 0;
    mocks.calls.length = 0;
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("a task never ticked: an update that finds no row, then an insert of its row", async () => {
    const { setSaleTaskDone } = await import("@/leenkey/properties/task-actions");
    mocks.writes.push({ data: [], error: null }, { data: null, error: null });
    const result = await setSaleTaskDone({ propertyId, taskId: notaryTask, done: true });
    expect(result).toEqual({ ok: true, data: { done: true } });
    expect(writes().map((call) => call.op)).toEqual(["update", "insert"]);
    expect(writes()[0].values).toEqual({
      done_at: expect.any(String),
      done_by: "5eed0000-0000-4000-8000-00000000000a",
    });
    expect(writes()[1].values).toMatchObject({ property_id: propertyId, task_id: notaryTask });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/vendeur", "layout");
  });

  it("a row already there: the update only, done_at and done_by, untick included", async () => {
    const { setSaleTaskDone } = await import("@/leenkey/properties/task-actions");
    mocks.writes.push({ data: [{ task_id: notaryTask }], error: null });
    const result = await setSaleTaskDone({ propertyId, taskId: notaryTask, done: false });
    expect(result).toEqual({ ok: true, data: { done: false } });
    expect(writes().map((call) => [call.op, call.values])).toEqual([
      ["update", { done_at: null, done_by: null }],
    ]);
    expect(mocks.calls.some((call) => call.op === "upsert")).toBe(false);
  });

  it("ticked at the same moment elsewhere: the insert conflicts, the update runs again", async () => {
    const { setSaleTaskDone } = await import("@/leenkey/properties/task-actions");
    mocks.writes.push(
      { data: [], error: null },
      { data: null, error: { code: "23505" } },
      { data: [{ task_id: notaryTask }], error: null },
    );
    const result = await setSaleTaskDone({ propertyId, taskId: notaryTask, done: true });
    expect(result.ok).toBe(true);
    expect(writes().map((call) => call.op)).toEqual(["update", "insert", "update"]);
  });

  it("refused before any write: a later step, an event, suspended or sold, not theirs", async () => {
    const { setSaleTaskDone } = await import("@/leenkey/properties/task-actions");
    const refused = async () => {
      const result = await setSaleTaskDone({ propertyId, taskId: notaryTask, done: true });
      expect(result).toEqual({ ok: false, error: "forbidden" });
    };
    mocks.progress = { ok: true, data: at("publish") };
    await refused();
    mocks.progress = { ok: true, data: at("notary") };
    for (const status of ["suspended", "sold"]) {
      mocks.listing = { data: { status }, error: null };
      await refused();
    }
    mocks.listing = { data: { status: "published" }, error: null };
    const event = await setSaleTaskDone({ propertyId, taskId: writtenTask, done: true });
    expect(event).toEqual({ ok: false, error: "forbidden" });
    // RLS shows no sale: not theirs.
    mocks.progress = { ok: true, data: null };
    await refused();
    expect(writes()).toEqual([]);
  });

  it("signed out, an invalid input, a database that fails or refuses", async () => {
    const { setSaleTaskDone } = await import("@/leenkey/properties/task-actions");
    mocks.profile = null;
    expect(await setSaleTaskDone({ propertyId, taskId: notaryTask, done: true })).toEqual({
      ok: false,
      error: "auth",
    });
    mocks.profile = { id: "5eed0000-0000-4000-8000-00000000000a", roles: ["seller"] };
    expect(await setSaleTaskDone({ propertyId: "x", taskId: notaryTask, done: true })).toEqual({
      ok: false,
      error: "invalid",
    });
    mocks.progress = { ok: false, data: null };
    expect(await setSaleTaskDone({ propertyId, taskId: notaryTask, done: true })).toEqual({
      ok: false,
      error: "unavailable",
    });
    mocks.progress = { ok: true, data: at("notary") };
    mocks.writes.push({ data: null, error: { code: "42501" } });
    expect(await setSaleTaskDone({ propertyId, taskId: notaryTask, done: true })).toEqual({
      ok: false,
      error: "forbidden",
    });
    // Logged, with its context, never silent.
    expect(console.error).toHaveBeenCalledWith(
      "[properties] sale task failed",
      expect.objectContaining({ entity_id: propertyId, task_id: notaryTask, code: "42501" }),
    );
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
