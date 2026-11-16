import { describe, expect, it, vi } from "vitest";

// L2-10: the anonymisation of the accounts closed 30 days ago, with a fake
// service client: the files first, then the database, then the sign-in, then
// the mark; a failed step leaves the account due (never marked) and does not
// stop the others.

vi.mock("server-only", () => ({}));

type Call = { kind: string; name: string; args?: unknown };

function fakeAdmin(options: { failRemove?: boolean; dueIds?: string[] } = {}) {
  const calls: Call[] = [];
  const admin = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ kind: "rpc", name, args });
      if (name === "accounts_due") return { data: options.dueIds ?? ["a1"], error: null };
      if (name === "account_files") {
        return {
          data: [
            { bucket: "photos", path: `${String(args.p_profile)}/p1-400.webp` },
            { bucket: "documents", path: `${String(args.p_profile)}/f1.pdf` },
            { bucket: "documents", path: "" },
          ],
          error: null,
        };
      }
      return { data: null, error: null };
    },
    storage: {
      from: (bucket: string) => ({
        remove: async (paths: string[]) => {
          calls.push({ kind: "remove", name: bucket, args: paths });
          return options.failRemove && paths[0]?.startsWith("a1")
            ? { data: null, error: { message: "down" } }
            : { data: [], error: null };
        },
      }),
    },
    auth: {
      admin: {
        getUserById: async (id: string) => ({
          data: { user: { id, user_metadata: { first_name: "Zoé", phone: "0600000000" } } },
          error: null,
        }),
        updateUserById: async (id: string, attributes: Record<string, unknown>) => {
          calls.push({ kind: "auth", name: id, args: attributes });
          return { data: { user: { id } }, error: null };
        },
      },
    },
  };
  return { admin, calls };
}

describe("anonymizeDeletedAccounts", () => {
  it("files, database, sign-in, then the mark, in this order", async () => {
    const { anonymizeDeletedAccounts } = await import("@/leenkey/account/anonymize");
    const { admin, calls } = fakeAdmin();
    const now = new Date("2026-12-20T02:00:00Z");
    // @ts-expect-error a fake client: only what the module calls
    const summary = await anonymizeDeletedAccounts(admin, now);
    expect(summary).toEqual({ due: 1, anonymized: 1, failed: 0 });
    expect(calls.map((call) => `${call.kind}:${call.name}`)).toEqual([
      "rpc:accounts_due",
      "rpc:account_files",
      "remove:photos",
      "remove:documents",
      "rpc:account_anonymize",
      "auth:a1",
      "rpc:account_mark_anonymized",
    ]);
    expect(calls.find((call) => call.name === "documents")?.args).toEqual(["a1/f1.pdf"]);
    const auth = calls.find((call) => call.kind === "auth")?.args as Record<string, unknown>;
    expect(auth.email).toBe("a1@compte-supprime.invalid");
    expect(auth.user_metadata).toEqual({ first_name: null, phone: null });
    expect(auth.ban_duration).toBe("876000h");
    expect(String(auth.password).length).toBeGreaterThanOrEqual(32);
    expect(calls.find((call) => call.name === "account_anonymize")?.args).toEqual({
      p_profile: "a1",
      p_now: now.toISOString(),
    });
  });

  it("a file that cannot be removed: nothing is erased, the account stays due; the next one goes on", async () => {
    const { anonymizeDeletedAccounts } = await import("@/leenkey/account/anonymize");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { admin, calls } = fakeAdmin({ failRemove: true, dueIds: ["a1", "b2"] });
    // @ts-expect-error a fake client: only what the module calls
    const summary = await anonymizeDeletedAccounts(admin, new Date("2026-12-20T02:00:00Z"));
    expect(summary).toEqual({ due: 2, anonymized: 1, failed: 1 });
    const forA1 = calls.filter((call) => JSON.stringify(call.args ?? "").includes("a1"));
    expect(forA1.map((call) => call.name)).not.toContain("account_anonymize");
    expect(forA1.map((call) => call.name)).not.toContain("account_mark_anonymized");
    expect(
      calls.some(
        (call) =>
          call.name === "account_mark_anonymized" && JSON.stringify(call.args).includes("b2"),
      ),
    ).toBe(true);
    expect(log).toHaveBeenCalledWith(
      "[account] anonymisation failed",
      expect.objectContaining({ user_id: "a1" }),
    );
    log.mockRestore();
  });
});
