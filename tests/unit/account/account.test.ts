import { beforeEach, describe, expect, it, vi } from "vitest";

// L1-39: the forms of « Mon compte » and their actions, with Supabase mocked:
// the schemas, the address compared without case, the current password
// checked before any change and counted when wrong, the other sessions
// closed, the roles a person may add.

const mocks = vi.hoisted(() => ({
  user: { id: "u1", email: "dominique@exemple.test" } as { id: string; email?: string } | null,
  update: { data: { id: "u1" } as unknown, error: null as { code: string } | null },
  updates: [] as Record<string, unknown>[],
  updateUser: { error: null as { code: string } | null },
  updateUserArgs: [] as Record<string, unknown>[],
  check: { error: null as { code: string } | null },
  signOuts: [] as unknown[],
  checkSignOuts: [] as unknown[],
  rpc: { data: ["buyer", "seller"] as unknown, error: null as { code: string } | null },
  allowed: true,
  counted: 0,
  redirects: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mocks.redirects.push(path);
    throw new Error(`NEXT_REDIRECT ${path}`);
  },
}));
vi.mock("@/core/auth/session", () => ({ getUser: async () => mocks.user }));
vi.mock("@/lib/rate-limit", () => ({
  allowRequest: async (_bucket: string, _headers: Headers, options?: { count?: boolean }) => {
    if (options?.count !== false) mocks.counted += 1;
    return mocks.allowed;
  },
}));
vi.mock("@/lib/supabase/public", () => ({
  createStatelessClient: () => ({
    auth: {
      signInWithPassword: async () => mocks.check,
      signOut: async (options: unknown) => {
        mocks.checkSignOuts.push(options);
        return { error: null };
      },
    },
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => {
      const self: Record<string, unknown> = {};
      self.update = (values: Record<string, unknown>) => {
        mocks.updates.push(values);
        return self;
      };
      for (const name of ["eq", "select"]) self[name] = () => self;
      self.maybeSingle = async () => mocks.update;
      return self;
    },
    rpc: async () => mocks.rpc,
    auth: {
      updateUser: async (args: Record<string, unknown>) => {
        mocks.updateUserArgs.push(args);
        return mocks.updateUser;
      },
      signOut: async (options: unknown) => {
        mocks.signOuts.push(options);
        return { error: null };
      },
    },
  }),
}));

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

beforeEach(() => {
  mocks.user = { id: "u1", email: "dominique@exemple.test" };
  mocks.update = { data: { id: "u1" }, error: null };
  mocks.updates = [];
  mocks.updateUser = { error: null };
  mocks.updateUserArgs = [];
  mocks.check = { error: null };
  mocks.signOuts = [];
  mocks.checkSignOuts = [];
  mocks.rpc = { data: ["buyer", "seller"], error: null };
  mocks.allowed = true;
  mocks.counted = 0;
  mocks.redirects = [];
});

describe("schemas of the account", () => {
  it("a first name, a last name and a phone that may be empty", async () => {
    const { identitySchema } = await import("@/lib/validations/account");
    expect(identitySchema.parse({ firstName: " Dominique ", lastName: "", phone: "" })).toEqual({
      firstName: "Dominique",
      lastName: "",
      phone: "",
    });
    const result = identitySchema.safeParse({
      firstName: " ",
      lastName: "x".repeat(81),
      phone: "abc",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const { fieldErrors } = await import("@/lib/validations/auth");
    expect(fieldErrors(result.error)).toEqual({
      firstName: "Indiquez votre prénom.",
      lastName: "80 caractères maximum.",
      phone: "Ce numéro n'est pas valide.",
    });
  });

  it("only « Je vends » and « J'achète » can be added", async () => {
    const { addRoleSchema } = await import("@/lib/validations/account");
    expect(addRoleSchema.safeParse("seller").success).toBe(true);
    expect(addRoleSchema.safeParse("buyer").success).toBe(true);
    expect(addRoleSchema.safeParse("admin").success).toBe(false);
  });
});

describe("updateIdentity", () => {
  it("writes the three columns, empty ones as null, then back to the account", async () => {
    const { updateIdentity } = await import("@/leenkey/account/actions");
    await expect(
      updateIdentity(null, form({ firstName: "Dominique", lastName: "", phone: "" })),
    ).rejects.toThrow("NEXT_REDIRECT /compte?modifie=informations");
    expect(mocks.updates[0]).toEqual({ first_name: "Dominique", last_name: null, phone: null });
  });

  it("keeps what was typed when it cannot save", async () => {
    const { updateIdentity } = await import("@/leenkey/account/actions");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.update = { data: null, error: { code: "42501" } };
    const result = await updateIdentity(null, form({ firstName: "Do", lastName: "P", phone: "" }));
    expect(result).toMatchObject({ ok: false, values: { firstName: "Do", lastName: "P" } });
    log.mockRestore();
  });
});

describe("changeEmail", () => {
  it("asks Supabase Auth for the two links, the address in lower case", async () => {
    const { changeEmail } = await import("@/leenkey/account/actions");
    const result = await changeEmail(null, form({ email: " Nouveau@Exemple.TEST " }));
    expect(mocks.updateUserArgs[0]).toEqual({ email: "nouveau@exemple.test" });
    expect(result).toEqual({
      ok: true,
      data: { current: "dominique@exemple.test", next: "nouveau@exemple.test" },
    });
  });

  it("refuses the current address and an address of another account", async () => {
    const { changeEmail } = await import("@/leenkey/account/actions");
    expect(await changeEmail(null, form({ email: "DOMINIQUE@exemple.test" }))).toMatchObject({
      ok: false,
      fieldErrors: { email: "C'est déjà votre adresse." },
    });
    expect(mocks.updateUserArgs).toHaveLength(0);
    mocks.updateUser = { error: { code: "email_exists" } };
    expect(await changeEmail(null, form({ email: "autre@exemple.test" }))).toMatchObject({
      ok: false,
      fieldErrors: { email: "Cette adresse est déjà celle d'un autre compte." },
    });
  });

  it("counted with the password resets: too many, nothing is sent", async () => {
    const { changeEmail } = await import("@/leenkey/account/actions");
    await changeEmail(null, form({ email: "nouveau@exemple.test" }));
    expect(mocks.counted).toBe(1);
    mocks.allowed = false;
    expect(await changeEmail(null, form({ email: "nouveau@exemple.test" }))).toMatchObject({
      ok: false,
      error: "Trop de tentatives. Réessayez plus tard.",
    });
    expect(mocks.updateUserArgs).toHaveLength(1);
  });

  it("without a session, nothing is asked", async () => {
    const { changeEmail } = await import("@/leenkey/account/actions");
    mocks.user = null;
    expect(await changeEmail(null, form({ email: "a@exemple.test" }))).toMatchObject({ ok: false });
    expect(mocks.updateUserArgs).toHaveLength(0);
  });
});

describe("changePassword", () => {
  const filled = {
    current: "ancien-mot",
    password: "Jardin-91-Juvisy",
    confirm: "Jardin-91-Juvisy",
  };

  it("checks the current password, changes it, closes the other sessions", async () => {
    const { changePassword } = await import("@/leenkey/account/actions");
    await expect(changePassword(null, form(filled))).rejects.toThrow(
      "NEXT_REDIRECT /compte?modifie=mot-de-passe",
    );
    expect(mocks.updateUserArgs[0]).toEqual({ password: "Jardin-91-Juvisy" });
    expect(mocks.checkSignOuts).toEqual([{ scope: "local" }]);
    expect(mocks.signOuts).toEqual([{ scope: "others" }]);
    expect(mocks.counted).toBe(0);
  });

  it("the session of the check is closed even when the change is refused", async () => {
    const { changePassword } = await import("@/leenkey/account/actions");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.updateUser = { error: { code: "weak_password" } };
    expect(await changePassword(null, form(filled))).toMatchObject({ ok: false });
    expect(mocks.checkSignOuts).toEqual([{ scope: "local" }]);
    expect(mocks.signOuts).toEqual([]);
    log.mockRestore();
  });

  it("the same password again is refused before any check", async () => {
    const { changePassword } = await import("@/leenkey/account/actions");
    expect(
      await changePassword(
        null,
        form({
          current: "Jardin-91-Juvisy",
          password: "Jardin-91-Juvisy",
          confirm: "Jardin-91-Juvisy",
        }),
      ),
    ).toMatchObject({
      ok: false,
      fieldErrors: { password: "Choisissez un mot de passe différent de l'ancien." },
    });
    expect(mocks.checkSignOuts).toEqual([]);
  });

  it("a wrong current password changes nothing and counts as a failed sign-in", async () => {
    const { changePassword } = await import("@/leenkey/account/actions");
    mocks.check = { error: { code: "invalid_credentials" } };
    expect(await changePassword(null, form(filled))).toMatchObject({
      ok: false,
      fieldErrors: { current: "Ce mot de passe n'est pas le bon." },
    });
    expect(mocks.updateUserArgs).toHaveLength(0);
    expect(mocks.counted).toBe(1);
  });

  it("too many failed attempts: nothing is checked", async () => {
    const { changePassword } = await import("@/leenkey/account/actions");
    mocks.allowed = false;
    expect(await changePassword(null, form(filled))).toEqual({
      ok: false,
      error: "Trop de tentatives. Réessayez plus tard.",
    });
    expect(mocks.updateUserArgs).toHaveLength(0);
  });

  it("two different new passwords", async () => {
    const { changePassword } = await import("@/leenkey/account/actions");
    expect(await changePassword(null, form({ ...filled, confirm: "autre" }))).toMatchObject({
      ok: false,
      fieldErrors: { confirm: "Les deux mots de passe sont différents." },
    });
  });
});

describe("addRole", () => {
  it("adds through profile_add_role, never « admin »", async () => {
    const { addRole } = await import("@/leenkey/account/actions");
    expect(await addRole("seller")).toEqual({ ok: true, data: { roles: ["buyer", "seller"] } });
    expect(await addRole("admin")).toMatchObject({ ok: false });
  });
});
