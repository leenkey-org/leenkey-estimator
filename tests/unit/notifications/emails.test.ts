import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlannedEmail, QueuedNotification } from "@/core/notifications/batch";
import { formatPrice } from "@/lib/format";

// L1-22: the emails the cron sends (SPEC-V2 sections 10 and 18), their
// content from the facts of the database, and the run itself: claimed before
// it leaves, tried again later when Resend fails.

const mocks = vi.hoisted(() => ({ sendEmail: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/core/notifications/email", () => ({ sendEmail: mocks.sendEmail }));

const NOW = new Date("2026-10-24T10:00:00Z");
const env = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SITE_URL = "https://leenkey-v2.vercel.app";
});
afterEach(() => {
  process.env = { ...env };
});

function queued(overrides: Partial<QueuedNotification> = {}): QueuedNotification {
  return {
    id: "n1",
    profileId: "seller-a",
    type: "message.new",
    data: {
      conversation_id: "c1",
      from: "buyer",
      sender_first_name: "Chloé",
      listing_title: "Maison 5 pièces · Savigny-sur-Orge",
      excerpt: "Bonjour, la maison est-elle toujours disponible ?",
      truncated: false,
    },
    link: "/messages/c1",
    groupKey: "conversation:c1",
    createdAt: new Date("2026-10-24T09:50:00Z"),
    emailAfter: new Date("2026-10-24T09:55:00Z"),
    readAt: null,
    email: "seller_a@exemple.test",
    firstName: "Alice",
    prefs: {},
    active: true,
    groupLastSentAt: null,
    ...overrides,
  };
}

function planned(items: QueuedNotification[], overrides: Partial<PlannedEmail> = {}): PlannedEmail {
  return {
    audience: "recipient",
    type: items[0].type,
    groupKey: items[0].groupKey,
    profileId: items[0].profileId,
    email: items[0].email,
    firstName: items[0].firstName,
    items,
    rows: items,
    ids: items.map((item) => item.id),
    ...overrides,
  };
}

const listing = (id: string, reference: string, title: string) =>
  queued({
    id: `pending-${id}`,
    type: "listing.pending",
    profileId: "admin",
    email: null,
    firstName: null,
    groupKey: "listings:review",
    link: `/admin/annonces/${id}`,
    data: {
      entity_id: id,
      reference,
      title,
      city: "Savigny-sur-Orge",
      postal_code: "91600",
      price_cents: 23_900_000,
      seller_first_name: "Alice",
    },
  });

describe("« Nouveau message »", () => {
  it("names the sender, quotes the last message, leads to the conversation", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const email = await renderNotificationEmail(planned([queued()]));
    expect(email?.subject).toBe("Nouveau message de Chloé");
    expect(email?.text).toContain("Bonjour Alice,");
    expect(email?.text).toContain("Bonjour, la maison est-elle toujours disponible ?");
    expect(email?.text).toContain("«\u00A0Maison 5 pièces · Savigny-sur-Orge\u00A0»");
    expect(email?.text).toContain("https://leenkey-v2.vercel.app/messages/c1");
    // To a seller: why they get it, and the preferences.
    expect(email?.text).toContain("parce que vous vendez un bien sur Leenkey");
    expect(email?.text).toContain("https://leenkey-v2.vercel.app/compte/notifications");
    expect(email?.replyTo).toBe("contact.leenkey@gmail.com");
    // An answer by email reaches Leenkey, not the other party: the email says so.
    expect(email?.text).toContain("Pour répondre, écrivez sur Leenkey");
  });

  it("several messages in one email, the excerpt of the last one", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const first = queued({ id: "n1", data: { ...queued().data, excerpt: "Premier" } });
    const last = queued({
      id: "n2",
      data: { ...queued().data, excerpt: "Dernier mot", truncated: true },
    });
    const email = await renderNotificationEmail(planned([first, last]));
    expect(email?.subject).toBe("2 nouveaux messages de Chloé");
    expect(email?.text).toContain("Dernier mot…");
    expect(email?.text).not.toContain("Premier");
    expect(email?.text).toContain("Et un autre message.");
  });

  it("to a buyer, the line of the buyer", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const fromSeller = queued({
      profileId: "buyer-c",
      firstName: "Chloé",
      data: { ...queued().data, from: "seller", sender_first_name: "Alice" },
    });
    const email = await renderNotificationEmail(planned([fromSeller]));
    expect(email?.subject).toBe("Nouveau message d'Alice");
    expect(email?.text).toContain("parce que vous avez contacté un vendeur sur Leenkey");
  });

  it("never a link written by the other party: excerpt and first name stay out", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const phishing = queued({
      data: {
        ...queued().data,
        sender_first_name: "Support www.leenkey-aide.fr",
        excerpt: "Votre annonce sera suspendue : confirmez sur https://leenkey-verif.com",
        listing_title: "Maison · voir exemple.com",
      },
    });
    const email = await renderNotificationEmail(planned([phishing]));
    expect(email?.subject).toBe("Nouveau message");
    for (const part of [email?.text ?? "", email?.html ?? ""]) {
      expect(part).not.toContain("leenkey-verif.com");
      expect(part).not.toContain("leenkey-aide.fr");
      expect(part).not.toContain("exemple.com");
    }
    expect(email?.text).toContain(
      "Ce message contient un lien ou une adresse : lisez-le sur Leenkey.",
    );
  });
});

describe("« Annonce à valider »", () => {
  it("one listing: the email of L1-13, to the team", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const email = await renderNotificationEmail(
      planned([listing("l1", "LK-0042", "Maison 5 pièces")], { audience: "team", email: null }),
    );
    expect(email?.subject).toBe("Annonce à valider (LK-0042)");
    expect(email?.text).toContain(
      `LK-0042 · Savigny-sur-Orge (91600) · ${formatPrice(23_900_000)} · Alice`,
    );
    expect(email?.text).toContain("https://leenkey-v2.vercel.app/admin/annonces/l1");
    expect(email?.text).toContain("Notification interne du Cockpit de Leenkey.");
  });

  it("never a link written by the seller: its title and first name stay out", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const trap = listing("l9", "LK-0049", "Voir leenkey-admin.fr");
    trap.data.seller_first_name = "Jean, rappelez-moi sur www.verif-leenkey.fr";
    const email = await renderNotificationEmail(planned([trap], { audience: "team", email: null }));
    for (const part of [email?.text ?? "", email?.html ?? ""]) {
      expect(part).not.toContain("leenkey-admin.fr");
      expect(part).not.toContain("verif-leenkey.fr");
    }
    // The reference instead of the title.
    expect(email?.text).toMatch(/«.LK-0049.» vient d'être envoyée en validation/);
  });

  it("several: one email that lists them", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const email = await renderNotificationEmail(
      planned(
        [
          listing("l1", "LK-0042", "Maison 5 pièces"),
          listing("l2", "LK-0043", "Appartement 3 pièces"),
          listing("l3", "LK-0044", "Terrain"),
        ],
        { audience: "team", email: null },
      ),
    );
    expect(email?.subject).toBe("3 annonces à valider");
    expect(email?.text).toContain("3 annonces attendent votre relecture");
    for (const id of ["l1", "l2", "l3"]) {
      expect(email?.text).toContain(`https://leenkey-v2.vercel.app/admin/annonces/${id}`);
    }
    expect(email?.text).toContain("https://leenkey-v2.vercel.app/admin/annonces?statut=a-valider");
  });
});

describe("sendNotificationEmails", () => {
  type Update = { values: Record<string, unknown>; ids: string[]; filters: string[] };

  function client(rows: unknown[], { claimed = true }: { claimed?: boolean | string[] } = {}) {
    const updates: Update[] = [];
    const supabase = {
      rpc: vi.fn(async () => ({ data: rows, error: null })),
      from: () => ({
        update(values: Record<string, unknown>) {
          const update: Update = { values, ids: [], filters: [] };
          updates.push(update);
          const chain = {
            in(_column: string, ids: string[]) {
              update.ids = ids;
              return chain;
            },
            is(column: string) {
              update.filters.push(`${column} is null`);
              return chain;
            },
            eq(column: string, value: string) {
              update.filters.push(`${column} = ${value}`);
              return chain;
            },
            select: async () => ({
              data:
                !("email_sent_at" in values) || claimed === true
                  ? update.ids.map((id) => ({ id }))
                  : Array.isArray(claimed)
                    ? update.ids.filter((id) => claimed.includes(id)).map((id) => ({ id }))
                    : [],
              error: null,
            }),
            then(resolve: (value: { error: null }) => void) {
              resolve({ error: null });
            },
          };
          return chain;
        },
      }),
    };
    return { supabase, updates };
  }

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: "n1",
    profile_id: "seller-a",
    type: "message.new",
    data: queued().data,
    link: "/messages/c1",
    group_key: "conversation:c1",
    created_at: "2026-10-24T09:50:00Z",
    email_after: "2026-10-24T09:55:00Z",
    read_at: null,
    email: "seller_a@exemple.test",
    first_name: "Alice",
    prefs: { email_messages: true },
    active: true,
    group_last_sent_at: null,
    ...overrides,
  });

  it("claims the rows, sends, and counts", async () => {
    const { sendNotificationEmails } = await import("@/leenkey/notifications/send-emails");
    const { supabase, updates } = client([
      row(),
      row({ id: "n2", read_at: "2026-10-24T09:58:00Z" }),
    ]);
    mocks.sendEmail.mockResolvedValue("test");
    // @ts-expect-error: a script of answers, not a client.
    const summary = await sendNotificationEmails(supabase, NOW, { paceMs: 0 });
    expect(summary).toEqual({ due: 2, sent: 1, failed: 0, skipped: 1, postponed: 0 });
    expect(updates[0]).toMatchObject({
      values: { email_skipped_at: NOW.toISOString() },
      ids: ["n2"],
    });
    expect(updates[1]).toMatchObject({
      values: { email_sent_at: NOW.toISOString() },
      ids: ["n1"],
      filters: ["email_sent_at is null", "email_skipped_at is null", "read_at is null"],
    });
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "seller_a@exemple.test", subject: "Nouveau message de Chloé" }),
    );
  });

  it("a refused email is given back, tried again 15 minutes later", async () => {
    const { sendNotificationEmails } = await import("@/leenkey/notifications/send-emails");
    const { supabase, updates } = client([row()]);
    mocks.sendEmail.mockResolvedValue("failed");
    // @ts-expect-error: a script of answers, not a client.
    const summary = await sendNotificationEmails(supabase, NOW, { paceMs: 0 });
    expect(summary).toMatchObject({ sent: 0, failed: 1 });
    expect(updates.at(-1)).toMatchObject({
      values: { email_sent_at: null, email_after: "2026-10-24T10:15:00.000Z" },
      ids: ["n1"],
      filters: [`email_sent_at = ${NOW.toISOString()}`],
    });
  });

  it("speaks only of the rows it claimed (another run, a reading meanwhile)", async () => {
    const { sendNotificationEmails } = await import("@/leenkey/notifications/send-emails");
    const { supabase } = client(
      [
        row({ id: "n1", data: { ...queued().data, excerpt: "Premier" } }),
        row({ id: "n2", data: { ...queued().data, excerpt: "Deuxième" } }),
        row({ id: "n3", data: { ...queued().data, excerpt: "Troisième" } }),
      ],
      { claimed: ["n3"] },
    );
    mocks.sendEmail.mockResolvedValue("test");
    // @ts-expect-error: a script of answers, not a client.
    await sendNotificationEmails(supabase, NOW, { paceMs: 0 });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    const [email] = mocks.sendEmail.mock.calls[0];
    expect(email.subject).toBe("Nouveau message de Chloé");
    expect(email.text).toContain("Troisième");
  });

  it("an email claimed by another run meanwhile does not leave twice", async () => {
    const { sendNotificationEmails } = await import("@/leenkey/notifications/send-emails");
    const { supabase } = client([row()], { claimed: false });
    // @ts-expect-error: a script of answers, not a client.
    const summary = await sendNotificationEmails(supabase, NOW, { paceMs: 0 });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ sent: 0, failed: 0 });
  });

  it("the team email goes to ADMIN_NOTIFICATION_EMAIL, never to nobody in production", async () => {
    const { sendNotificationEmails } = await import("@/leenkey/notifications/send-emails");
    const pending = row({
      id: "p1",
      profile_id: "admin",
      type: "listing.pending",
      group_key: "listings:review",
      link: "/admin/annonces/l1",
      email: null,
      data: { entity_id: "l1", reference: "LK-0042", title: "Maison" },
    });
    process.env.ADMIN_NOTIFICATION_EMAIL = "admin@exemple.test";
    mocks.sendEmail.mockResolvedValue("sent");
    // @ts-expect-error: a script of answers, not a client.
    await sendNotificationEmails(client([pending]).supabase, NOW, { paceMs: 0 });
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "admin@exemple.test", subject: "Annonce à valider (LK-0042)" }),
    );

    mocks.sendEmail.mockClear();
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
    process.env.NEXT_PUBLIC_ENV = "production";
    const { supabase, updates } = client([pending]);
    // @ts-expect-error: a script of answers, not a client.
    const summary = await sendNotificationEmails(supabase, NOW, { paceMs: 0 });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(1);
    expect(updates[0].values).toEqual({ email_skipped_at: NOW.toISOString() });
  });

  it("stops sending at the end of its time: the rest waits for the next run", async () => {
    const { sendNotificationEmails } = await import("@/leenkey/notifications/send-emails");
    const { supabase } = client([
      row(),
      row({ id: "n2", group_key: "conversation:c2", link: "/messages/c2" }),
    ]);
    mocks.sendEmail.mockResolvedValue("test");
    // @ts-expect-error: a script of answers, not a client.
    const summary = await sendNotificationEmails(supabase, NOW, { paceMs: 0, budgetMs: -1 });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ sent: 0, postponed: 2 });
  });
});
