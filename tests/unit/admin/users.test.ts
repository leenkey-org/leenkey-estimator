import { render } from "@react-email/components";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountSuspendedEmail, accountSuspendedSubject } from "@/emails/account-suspended";
import { EMAIL_PLAIN_TEXT } from "@/emails/components/email-layout";
import { mergeTodo, shortLabel, type AdminTodoItem } from "@/leenkey/admin/dashboard/queries";
import { formatWaiting } from "@/lib/format";
import {
  accountDecisionSchema,
  adminUsersHref,
  parseAdminUsersQuery,
} from "@/lib/validations/admin";

// L1-30a: the dashboard and the users of the back office. The SQL is tested
// in supabase/tests/rls_admin_dashboard_users.sql, the screens in
// tests/e2e/admin-users.spec.ts.

const mocks = vi.hoisted(() => ({
  profile: null as { id: string; roles: string[] } | null,
  calls: [] as { fn: string; args: Record<string, unknown> }[],
  rpcError: null as { code: string } | null,
  emails: [] as { profileId: string; reason: string }[],
  revalidated: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => mocks.revalidated.push(path),
}));
vi.mock("@/core/auth/session", () => ({
  getProfile: async () => mocks.profile,
  requireAdmin: async () => mocks.profile,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      mocks.calls.push({ fn, args });
      return { data: null, error: mocks.rpcError };
    },
  }),
}));
vi.mock("@/leenkey/admin/users/emails", () => ({
  emailAccountSuspended: async (input: { profileId: string; reason: string }) => {
    mocks.emails.push(input);
    return "sent";
  },
}));

const profileId = "0d9c7c63-1e4b-4b8e-9a52-6f4a2f2a9f10";

describe("admin users URL", () => {
  it("reads the filter and the search, ignores anything else", () => {
    expect(parseAdminUsersQuery({ filtre: "vendeurs", q: " martin " })).toEqual({
      filter: "seller",
      query: "martin",
    });
    expect(parseAdminUsersQuery({ filtre: "seller", q: "" })).toEqual({
      filter: undefined,
      query: undefined,
    });
    expect(parseAdminUsersQuery({ filtre: ["suspendus", "equipe"] }).filter).toBe("suspended");
    expect(parseAdminUsersQuery({ filtre: "equipe" }).filter).toBe("admin");
    expect(parseAdminUsersQuery({ q: "x".repeat(101) }).query).toBeUndefined();
  });

  it("builds the address back from them", () => {
    expect(adminUsersHref({})).toBe("/admin/utilisateurs");
    expect(adminUsersHref({ filter: "buyer", query: "Bruno L" })).toBe(
      "/admin/utilisateurs?filtre=acquereurs&q=Bruno+L",
    );
    expect(parseAdminUsersQuery({ filtre: "acquereurs", q: "Bruno L" })).toEqual({
      filter: "buyer",
      query: "Bruno L",
    });
  });
});

describe("accountDecisionSchema", () => {
  it("asks a motive to suspend, none to lift the suspension", () => {
    expect(
      accountDecisionSchema.parse({
        action: "suspend",
        profileId,
        reason: "  Annonce frauduleuse ",
      }),
    ).toEqual({ action: "suspend", profileId, reason: "Annonce frauduleuse" });
    expect(accountDecisionSchema.parse({ action: "unsuspend", profileId })).toEqual({
      action: "unsuspend",
      profileId,
    });
  });

  it("refuses a missing or too short motive, an unknown action or account", () => {
    for (const input of [
      { action: "suspend", profileId },
      { action: "suspend", profileId, reason: " a " },
      { action: "suspend", profileId, reason: "x".repeat(1001) },
      { action: "delete", profileId },
      { action: "unsuspend", profileId: "buyer_d" },
      null,
    ]) {
      expect(accountDecisionSchema.safeParse(input).success, JSON.stringify(input)).toBe(false);
    }
  });
});

describe("« À traiter »", () => {
  const item = (kind: AdminTodoItem["kind"], id: string, since: string): AdminTodoItem => ({
    kind,
    id,
    label: id,
    since,
  });

  it("merges the three lists, the oldest first, and cuts them", () => {
    const merged = mergeTodo(
      [
        [
          item("listing", "l1", "2026-11-02T08:00:00Z"),
          item("listing", "l2", "2026-11-03T08:00:00Z"),
        ],
        [item("case", "c1", "2026-11-01T08:00:00Z")],
        [item("report", "r1", "2026-11-02T09:00:00Z")],
      ],
      3,
    );
    expect(merged.map((entry) => entry.id)).toEqual(["c1", "l1", "r1"]);
  });

  it("keeps a stable order for the same date", () => {
    const at = "2026-11-02T08:00:00Z";
    expect(
      mergeTodo([[item("report", "b", at)], [item("case", "a", at)]]).map((entry) => entry.id),
    ).toEqual(["a", "b"]);
  });

  it("shows a motive on one line, cut with an ellipsis", () => {
    expect(shortLabel("  Annonce\nen double  ")).toBe("Annonce en double");
    expect(shortLabel("abcdefghij", 6)).toBe("abcde…");
    expect(shortLabel("🙂🙂🙂🙂", 3)).toBe("🙂🙂…");
    expect(shortLabel("abc", 3)).toBe("abc");
  });
});

describe("decideAccount", () => {
  beforeEach(() => {
    mocks.profile = { id: "admin-id", roles: ["admin"] };
    mocks.calls = [];
    mocks.rpcError = null;
    mocks.emails = [];
    mocks.revalidated = [];
  });

  const decide = async (input: unknown) => {
    const { decideAccount } = await import("@/leenkey/admin/users/actions");
    return decideAccount(input);
  };

  it("is refused to anyone but an admin, before any call", async () => {
    mocks.profile = { id: "seller-id", roles: ["seller", "buyer"] };
    expect(await decide({ action: "unsuspend", profileId })).toEqual({
      ok: false,
      error: "forbidden",
    });
    mocks.profile = null;
    expect((await decide({ action: "unsuspend", profileId })).ok).toBe(false);
    expect(mocks.calls).toEqual([]);
  });

  it("suspends with the motive, then emails it", async () => {
    const result = await decide({ action: "suspend", profileId, reason: "Annonce frauduleuse" });
    expect(result).toEqual({ ok: true, data: { suspended: true, email: "sent" } });
    expect(mocks.calls).toEqual([
      {
        fn: "admin_suspend_user",
        args: { p_profile_id: profileId, p_reason: "Annonce frauduleuse" },
      },
    ]);
    expect(mocks.emails).toEqual([{ profileId, reason: "Annonce frauduleuse" }]);
    expect(mocks.revalidated).toContain(`/admin/utilisateurs/${profileId}`);
  });

  it("lifts a suspension without an email", async () => {
    const result = await decide({ action: "unsuspend", profileId });
    expect(result).toEqual({ ok: true, data: { suspended: false, email: null } });
    expect(mocks.calls.map((call) => call.fn)).toEqual(["admin_unsuspend_user"]);
    expect(mocks.emails).toEqual([]);
  });

  it("sends nothing when the SQL function refuses", async () => {
    mocks.rpcError = { code: "22023" };
    const result = await decide({ action: "suspend", profileId, reason: "Annonce frauduleuse" });
    expect(result).toEqual({ ok: false, error: "conflict" });
    expect(mocks.emails).toEqual([]);
    expect(mocks.revalidated).toEqual([]);
  });

  it("refuses an invalid input before any call", async () => {
    expect(await decide({ action: "suspend", profileId })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(mocks.calls).toEqual([]);
  });
});

describe("suspension email", () => {
  const props = {
    firstName: "Denis",
    reason: "Plusieurs signalements pour des messages insistants.",
    contactEmail: "contact.leenkey@gmail.com",
    siteUrl: "https://leenkey.fr",
  };

  it("gives the motive as written and where to contest, in « nous »", async () => {
    const text = await render(AccountSuspendedEmail(props), EMAIL_PLAIN_TEXT);
    expect(accountSuspendedSubject()).toBe("Votre compte Leenkey est suspendu");
    expect(text).toContain("Bonjour Denis,");
    expect(text).toContain(props.reason);
    expect(text).toContain(props.contactEmail);
    expect(text).toContain("sous 48 h, 7 j/7");
    expect(text).not.toMatch(/\bon\b/i);
    const html = await render(AccountSuspendedEmail({ ...props, firstName: null }));
    expect(html).toContain("Bonjour,");
    expect(html).toContain(`href="mailto:${props.contactEmail}"`);
  });
});

describe("formatWaiting", () => {
  const now = new Date("2026-11-03T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const minute = 60_000;

  it("reads minutes, then hours up to two days, then days", () => {
    expect(formatWaiting(ago(10_000), now)).toBe("1 min");
    expect(formatWaiting(ago(12 * minute), now)).toBe("12 min");
    expect(formatWaiting(ago(30 * 60 * minute), now)).toBe("30 h");
    expect(formatWaiting(ago(47 * 60 * minute), now)).toBe("47 h");
    expect(formatWaiting(ago(2 * 24 * 60 * minute), now)).toBe("2 jours");
    expect(formatWaiting(ago(-minute), now)).toBe("1 min");
  });
});
