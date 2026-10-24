import { describe, expect, it, vi } from "vitest";
import { notify } from "@/core/notifications/notify";

vi.mock("server-only", () => ({}));

// L1-22: notify() of SPEC-V2 section 10, for the webhooks and the crons.

describe("notify", () => {
  it("writes through public.notification_add, its email planned or not", async () => {
    const rpc = vi.fn(async () => ({ data: "n1", error: null }));
    const supabase = { rpc };
    const id = await notify(
      // @ts-expect-error: only rpc is used.
      supabase,
      {
        profileId: "p1",
        type: "plan.activated",
        data: { plan: "accompagne" },
        link: "/vendeur/formule",
        emailAfter: new Date("2026-11-09T10:00:00Z"),
      },
    );
    expect(id).toBe("n1");
    expect(rpc).toHaveBeenCalledWith("notification_add", {
      p_profile_id: "p1",
      p_type: "plan.activated",
      p_data: { plan: "accompagne" },
      p_link: "/vendeur/formule",
      p_group_key: undefined,
      p_email_after: "2026-11-09T10:00:00.000Z",
    });
  });

  it("a refusal is logged, never thrown", async () => {
    const supabase = { rpc: vi.fn(async () => ({ data: null, error: { code: "42501" } })) };
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    // @ts-expect-error: only rpc is used.
    expect(await notify(supabase, { profileId: "p1", type: "x", data: {}, link: "/" })).toBeNull();
    expect(error).toHaveBeenCalledWith("[notifications] not written", {
      user_id: "p1",
      type: "x",
      code: "42501",
    });
    error.mockRestore();
  });
});
