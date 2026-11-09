import { beforeEach, describe, expect, it, vi } from "vitest";

// L1-39: a link of a change of address never signs the browser in (a link
// of another account must not put a person in it): verified on a client
// without cookies, its session closed; back to the account only for the
// person signed in to it.

const mocks = vi.hoisted(() => ({
  cookie: "email_change.abc123" as string | undefined,
  verify: {
    data: { session: null as unknown, user: null as { id: string } | null },
    error: null as { code: string } | null,
  },
  signOuts: [] as unknown[],
  sessionClientUsed: false,
  user: null as { id: string } | null,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    get: () => (mocks.cookie ? { value: mocks.cookie } : undefined),
    delete: () => {},
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  },
}));
vi.mock("@/core/auth/session", () => ({
  getUser: async () => mocks.user,
  missingAcceptances: async () => [],
}));
vi.mock("@/lib/rate-limit", () => ({ allowRequest: async () => true }));
vi.mock("@/lib/supabase/public", () => ({
  createStatelessClient: () => ({
    auth: {
      verifyOtp: async () => mocks.verify,
      signOut: async (options: unknown) => {
        mocks.signOuts.push(options);
        return { error: null };
      },
    },
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    mocks.sessionClientUsed = true;
    return { auth: { verifyOtp: async () => ({ data: {}, error: null }) } };
  },
}));

beforeEach(() => {
  mocks.cookie = "email_change.abc123";
  mocks.verify = { data: { session: null, user: null }, error: null };
  mocks.signOuts = [];
  mocks.sessionClientUsed = false;
  mocks.user = null;
});

describe("confirmEmailLink, change of address", () => {
  it("the first of the two links: one more to open, no session anywhere", async () => {
    const { confirmEmailLink } = await import("@/leenkey/auth/actions");
    await expect(confirmEmailLink()).rejects.toThrow("NEXT_REDIRECT /confirmation/adresse");
    expect(mocks.sessionClientUsed).toBe(false);
    expect(mocks.signOuts).toEqual([]);
  });

  it("the second link, by the person signed in to the account: back to it", async () => {
    const { confirmEmailLink } = await import("@/leenkey/auth/actions");
    mocks.verify = { data: { session: {}, user: { id: "a" } }, error: null };
    mocks.user = { id: "a" };
    await expect(confirmEmailLink()).rejects.toThrow("NEXT_REDIRECT /compte?modifie=email");
    expect(mocks.signOuts).toEqual([{ scope: "local" }]);
    expect(mocks.sessionClientUsed).toBe(false);
  });

  it("the second link in a browser of another account, or of none: never signed in", async () => {
    const { confirmEmailLink } = await import("@/leenkey/auth/actions");
    mocks.verify = { data: { session: {}, user: { id: "a" } }, error: null };
    mocks.user = { id: "b" };
    await expect(confirmEmailLink()).rejects.toThrow(
      "NEXT_REDIRECT /confirmation/adresse?etat=fait",
    );
    mocks.user = null;
    await expect(confirmEmailLink()).rejects.toThrow(
      "NEXT_REDIRECT /confirmation/adresse?etat=fait",
    );
    expect(mocks.sessionClientUsed).toBe(false);
  });

  it("an expired or used link", async () => {
    const { confirmEmailLink } = await import("@/leenkey/auth/actions");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.verify = { data: { session: null, user: null }, error: { code: "otp_expired" } };
    await expect(confirmEmailLink()).rejects.toThrow("NEXT_REDIRECT /connexion?lien=expire");
    log.mockRestore();
  });
});
