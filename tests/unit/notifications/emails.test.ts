import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlannedEmail, QueuedNotification } from "@/core/notifications/batch";
import type { EmailDatabase } from "@/leenkey/notifications/email-catalog";
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
    expect(email?.replyTo).toBe("contact@leenkey.fr");
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

describe("the conversation with the adviser (L1-34)", () => {
  const advisorData = {
    conversation_id: "c9",
    message_id: "m1",
    sender_first_name: "Cédric",
    reference: "LK-0001",
    listing_title: "Appartement 3 pièces avec balcon",
    excerpt: "Bonjour Alice, je regarde votre prix.",
    truncated: false,
  };

  it("to the seller: « Nouveau message de votre conseiller Leenkey », to the conversation", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const email = await renderNotificationEmail(
      planned([queued({ type: "advisor.message", data: advisorData, link: "/messages/c9" })]),
    );
    expect(email?.subject).toBe("Nouveau message de votre conseiller Leenkey");
    expect(email?.text).toContain("Bonjour Alice,");
    expect(email?.text).toContain("Bonjour Alice, je regarde votre prix.");
    expect(email?.text).toContain("https://leenkey-v2.vercel.app/messages/c9");
    expect(email?.text).toContain("parce que vous vendez un bien sur Leenkey");
    expect(email?.replyTo).toBe("contact@leenkey.fr");
  });

  it("to the team: the seller and the reference, an internal email, to the back office", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const item = queued({
      type: "advisor.message_from_client",
      profileId: "admin",
      email: null,
      firstName: null,
      link: "/admin/messages/c9",
      data: {
        ...advisorData,
        sender_first_name: "Alice",
        excerpt: "Faut-il baisser le prix ?",
        handoff: false,
      },
    });
    const email = await renderNotificationEmail(planned([item], { audience: "team" }));
    expect(email?.subject).toBe("Message d'Alice à son conseiller (LK-0001)");
    expect(email?.text).toContain("https://leenkey-v2.vercel.app/admin/messages/c9");
    expect(email?.text).toContain("Notification interne du back office de Leenkey.");
    expect(email?.text).toContain("Répondez depuis le back office");
    expect(email?.text).toContain("Faut-il baisser le prix ?");
    // The team is not greeted by the first name of the seller.
    expect(email?.text).not.toContain("Bonjour Alice");
    expect(email?.replyTo).toBeUndefined();
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
    expect(email?.text).toContain("Notification interne du back office de Leenkey.");
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

describe("« Nouveau compte »", () => {
  const account = (id: string, first: unknown, roles: string[]) =>
    queued({
      id: `account-${id}`,
      type: "account.created",
      profileId: "admin",
      email: null,
      firstName: null,
      groupKey: "accounts:new",
      link: `/admin/utilisateurs/${id}`,
      data: { entity_id: id, profile_id: id, first_name: first, last_initial: "M", roles },
    });

  it("one account: its name, its roles, a link to it in the back office", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const email = await renderNotificationEmail(
      planned([account("u1", "Alice", ["seller"])], { audience: "team" }),
    );
    expect(email?.subject).toBe("Nouveau compte sur Leenkey");
    expect(email?.text).toContain("Alice M. · Vendeur");
    expect(email?.html).toContain("https://leenkey-v2.vercel.app/admin/utilisateurs/u1");
  });

  it("several: a list, the link to the accounts; a name like a link stays out", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const email = await renderNotificationEmail(
      planned(
        [
          account("u1", "Alice", ["seller", "buyer"]),
          account("u2", "www.promo.example", ["buyer"]),
        ],
        { audience: "team" },
      ),
    );
    expect(email?.subject).toBe("2\u00A0nouveaux comptes sur Leenkey");
    expect(email?.text).toContain("Alice M. · Vendeur, Acquéreur");
    expect(email?.text).not.toContain("www.promo.example");
    expect(email?.text).toContain("Sans nom · Acquéreur");
    expect(email?.html).toContain("https://leenkey-v2.vercel.app/admin/utilisateurs");
  });
});

describe("« Nouvelle demande à traiter » (L1-31)", () => {
  const request = (id: string, subject: unknown, reference: string | null) =>
    queued({
      id: `case-${id}`,
      type: "case.created",
      profileId: "admin",
      email: null,
      firstName: null,
      groupKey: "cases:requests",
      link: `/admin/dossiers/${id}`,
      data: {
        case_id: id,
        source: "assistant_handoff",
        subject,
        reference,
        first_name: "Alice",
        last_initial: "D",
      },
    });

  it("one request: who asks, for which property, about what, a link to its sheet", async () => {
    const { emailPolicy, renderNotificationEmail } =
      await import("@/leenkey/notifications/email-catalog");
    expect(emailPolicy("case.created")).toEqual({ audience: "team", throttleMinutes: 20 });
    const email = await renderNotificationEmail(
      planned([request("c1", "Litige avec un acquéreur", "LK-0003")], { audience: "team" }),
    );
    expect(email?.subject).toBe("Nouvelle demande à traiter (LK-0003)");
    expect(email?.text).toContain("Alice D. · LK-0003");
    expect(email?.text).toContain("Litige avec un acquéreur");
    expect(email?.html).toContain("https://leenkey-v2.vercel.app/admin/dossiers/c1");
  });

  it("several: one email, the link to the cases; a subject like a link stays out", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const email = await renderNotificationEmail(
      planned(
        [request("c1", "Problème de compte", null), request("c2", "www.promo.example", null)],
        {
          audience: "team",
        },
      ),
    );
    expect(email?.subject).toBe("2\u00A0demandes à traiter");
    expect(email?.text).toContain("2\u00A0demandes ont été envoyées à l'équipe Leenkey.");
    expect(email?.text).toContain("Problème de compte");
    expect(email?.text).not.toContain("www.promo.example");
    expect(email?.text).toContain("Demande à lire dans le dossier.");
    expect(email?.html).toContain('https://leenkey-v2.vercel.app/admin/dossiers"');
  });

  it("a property without a listing is named by its town, typed by its owner: never a link", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const town = await renderNotificationEmail(
      planned([request("c1", "Une question", "Athis-Mons")], { audience: "team" }),
    );
    expect(town?.subject).toBe("Nouvelle demande à traiter (Athis-Mons)");
    const link = await renderNotificationEmail(
      planned([request("c1", "Une question", "www.exemple-support.fr")], { audience: "team" }),
    );
    expect(link?.subject).toBe("Nouvelle demande à traiter");
    expect(link?.text).not.toContain("exemple-support");
    expect(link?.html).not.toContain("exemple-support");
  });
});

describe("« Rétractation à rembourser » and « Votre formule se termine » (L1-40)", () => {
  it("the team: the plans renounced, both of a passage, the amount to refund", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const email = await renderNotificationEmail(
      planned(
        [
          queued({
            type: "plan.withdrawn",
            profileId: "admin",
            email: null,
            firstName: null,
            groupKey: "plans:withdrawn",
            link: "/admin/dossiers",
            data: {
              entity_id: "s1",
              plan_name: "Sérénité",
              reference: "LK-0009",
              amount_paid_cents: 51000,
              replaced_plan_name: "Accompagné",
              replaced_amount_paid_cents: 99000,
              requested_at: "2026-11-05T13:05:00Z",
              early_start: true,
            },
          }),
        ],
        { audience: "team" },
      ),
    );
    expect(email?.subject).toBe(
      "Rétractation à rembourser · formule Sérénité + Accompagné · LK-0009",
    );
    expect(email?.text).toMatch(/1\s500\s€ TTC payés · demande du 5 novembre 2026 à 14:05/);
    expect(email?.text).toContain("démarrage immédiat demandé");
    expect(email?.html).toContain("https://leenkey-v2.vercel.app/admin/dossiers");
  });

  it("the owner: the date of the end, back to Autonomie, an answer goes to Leenkey", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const email = await renderNotificationEmail(
      planned([
        queued({
          type: "plan.ending",
          groupKey: "plan-ending:s3",
          link: "/vendeur/formule?bien=p3",
          data: {
            entity_id: "s3",
            plan_name: "Sérénité",
            reference: "LK-0003",
            ends_at: "2027-11-02T10:00:00Z",
          },
        }),
      ]),
    );
    expect(email?.subject).toBe("Votre formule Sérénité se termine le 2 novembre 2027");
    expect(email?.text).toContain("Bonjour Alice");
    expect(email?.text).toContain("votre bien repasse en Autonomie");
    expect(email?.replyTo).toBe("contact@leenkey.fr");
    for (const text of [email?.text ?? ""]) expect(text).not.toMatch(/\bon\b/i);
  });
});

describe("emails of an offer (L2-04a)", () => {
  const offer = {
    entity_id: "o1",
    offer_id: "o1",
    reference: "LK-2026-00012",
    title: "Maison familiale 5 pièces",
    price_cents: 33_800_000,
  };

  it("tells the seller the amount, the gap and the financing status, never a contact detail", async () => {
    const { renderNotificationEmail, emailPolicy } =
      await import("@/leenkey/notifications/email-catalog");
    expect(emailPolicy("offer.received")).toEqual({
      audience: "recipient",
      preference: "email_offers",
      throttleMinutes: 0,
    });
    const email = await renderNotificationEmail(
      planned([
        queued({
          type: "offer.received",
          groupKey: "offer:o1",
          link: "/offres/o1",
          data: {
            ...offer,
            asking_price_cents: 35_000_000,
            financing_status: "document_checked",
            buyer_first_name: "Chloé",
            validity_until: "2026-11-18T13:00:00Z",
          },
        }),
      ]),
    );
    const text = (email?.text ?? "").replace(/[\u00A0\u202F]/g, " ");
    expect(email?.subject.replace(/[\u00A0\u202F]/g, " ")).toBe(
      "Offre d'achat reçue : 338 000 € · LK-2026-00012",
    );
    expect(text).toContain("Chloé vous a fait une offre d'achat pour votre bien");
    expect(text).toContain("Prix demandé : 350 000 €");
    expect(text).toContain("338 000 €");
    expect(text).toContain("\u221212 000 € · \u22123,4 %");
    expect(text).toContain("Financement : Justificatif vérifié");
    expect(text).toContain("valable jusqu'au 18/11/2026 à 14:00");
    expect(text).toContain("/offres/o1");
    expect(text).not.toMatch(/validé|\bon\b|@example|\.pdf/i);
  });

  it("tells the team an offer was accepted on a sale with an adviser, never who the buyer is", async () => {
    const { renderNotificationEmail, emailPolicy } =
      await import("@/leenkey/notifications/email-catalog");
    expect(emailPolicy("offer.accepted_team")).toEqual({ audience: "team", throttleMinutes: 20 });
    const accepted = (id: string, reference: string, price: number) =>
      queued({
        type: "offer.accepted_team",
        profileId: "admin",
        email: null,
        firstName: null,
        groupKey: "offers:accepted",
        link: `/admin/offres/${id}`,
        data: {
          ...offer,
          reference,
          price_cents: price,
          listing_reference: "LK-0042",
          city: "Savigny-sur-Orge",
          plan: "accompagne",
          asking_price_cents: 35_000_000,
          buyer_first_name: "Chloé",
        },
      });
    const one = await renderNotificationEmail(
      planned([accepted("o1", "LK-2026-00012", 33_800_000)], { audience: "team" }),
    );
    const text = (one?.text ?? "").replace(/[\u00A0\u202F]/g, " ");
    expect(one?.subject).toBe("Offre acceptée sur une vente avec conseiller (LK-0042)");
    expect(text).toContain("Une offre d'achat a été acceptée sur une vente avec conseiller.");
    expect(text).toContain("Offre LK-2026-00012 · LK-0042 · Savigny-sur-Orge");
    expect(text).toContain("Prix accepté : 338 000 €");
    expect(one?.html).toContain("https://leenkey-v2.vercel.app/admin/offres/o1");
    expect(text).not.toMatch(/Chloé|validé|\bon\b|@example/i);

    const two = await renderNotificationEmail(
      planned([accepted("o1", "LK-2026-00012", 33_800_000), accepted("o2", "LK-2026-00013", 0)], {
        audience: "team",
      }),
    );
    expect(two?.subject.replace(/[\u00A0\u202F]/g, " ")).toBe(
      "2 offres acceptées sur des ventes avec conseiller",
    );
    expect(two?.text).toContain("Offre à lire dans le back office.");
    expect(two?.html).toContain("https://leenkey-v2.vercel.app/admin/offres?statut=acceptees");
  });

  it("tells the team an offer was received on a sale with an adviser, never who the buyer is", async () => {
    const { renderNotificationEmail, emailPolicy } =
      await import("@/leenkey/notifications/email-catalog");
    expect(emailPolicy("offer.received_team")).toEqual({ audience: "team", throttleMinutes: 20 });
    const received = (id: string, reference: string, price: number) =>
      queued({
        type: "offer.received_team",
        profileId: "admin",
        email: null,
        firstName: null,
        groupKey: "offers:received",
        link: `/admin/offres/${id}`,
        data: {
          ...offer,
          reference,
          price_cents: price,
          listing_reference: "LK-0042",
          city: "Savigny-sur-Orge",
          plan: "accompagne",
          asking_price_cents: 35_000_000,
          buyer_first_name: "Chloé",
        },
      });
    const one = await renderNotificationEmail(
      planned([received("o1", "LK-2026-00012", 33_800_000)], { audience: "team" }),
    );
    const text = (one?.text ?? "").replace(/[\u00A0\u202F]/g, " ");
    expect(one?.subject).toBe("Offre reçue sur une vente avec conseiller (LK-0042)");
    expect(text).toContain("Une offre d'achat a été reçue sur une vente avec conseiller.");
    expect(text).toContain("Offre LK-2026-00012 · LK-0042 · Savigny-sur-Orge");
    expect(text).toContain("Prix proposé : 338 000 €");
    expect(text).toContain("Le vendeur n'a pas encore répondu");
    expect(one?.html).toContain("https://leenkey-v2.vercel.app/admin/offres/o1");
    expect(text).not.toMatch(/Chloé|validé|acceptée|\bon\b|@example/i);

    const two = await renderNotificationEmail(
      planned([received("o1", "LK-2026-00012", 33_800_000), received("o2", "LK-2026-00013", 0)], {
        audience: "team",
      }),
    );
    expect(two?.subject.replace(/[\u00A0\u202F]/g, " ")).toBe(
      "2 offres reçues sur des ventes avec conseiller",
    );
    expect(two?.html).toContain("https://leenkey-v2.vercel.app/admin/offres?statut=en-attente");
  });

  it("tells a buyer their proof of financing is checked, and its file deleted", async () => {
    const { renderNotificationEmail, emailPolicy } =
      await import("@/leenkey/notifications/email-catalog");
    expect(emailPolicy("financing.checked")).toEqual({ audience: "recipient", throttleMinutes: 0 });
    const email = await renderNotificationEmail(
      planned([
        queued({
          type: "financing.checked",
          profileId: "buyer-c",
          firstName: "Chloé",
          groupKey: "financing:d1",
          link: "/acquereur/profil",
          data: { document_id: "d1", document_type: "accord_principe" },
        }),
      ]),
    );
    const text = (email?.text ?? "").replace(/[\u00A0\u202F]/g, " ");
    expect(email?.subject).toBe("Votre justificatif de financement est vérifié");
    expect(text).toContain("Bonjour Chloé,");
    expect(text).toContain(
      "Nous avons contrôlé votre justificatif de financement (Accord de principe bancaire) : votre dossier affiche désormais « Justificatif vérifié ».",
    );
    expect(text).toContain("Nous avons supprimé le fichier après ce contrôle.");
    expect(text).toContain("il ne garantit pas l'obtention de votre financement");
    expect(email?.html).toContain("https://leenkey-v2.vercel.app/acquereur/profil");
    expect(text).not.toMatch(/validé|\bon\b/i);
  });

  it("tells the author of a report it was handled, never what was decided", async () => {
    const { renderNotificationEmail, emailPolicy } =
      await import("@/leenkey/notifications/email-catalog");
    expect(emailPolicy("report.handled")).toEqual({ audience: "recipient", throttleMinutes: 0 });
    const email = await renderNotificationEmail(
      planned([
        queued({
          type: "report.handled",
          profileId: "buyer-c",
          firstName: "Chloé",
          groupKey: "report:r1",
          link: "/messages/c1",
          data: {
            report_id: "r1",
            conversation_id: "c1",
            listing_title: "Maison 5 pièces",
            reason: "Vendeur averti par téléphone.",
          },
        }),
      ]),
    );
    const text = (email?.text ?? "").replace(/[\u00A0\u202F]/g, " ");
    expect(email?.subject).toBe("Votre signalement a été traité");
    expect(text).toContain(
      "Notre équipe a examiné la conversation que vous avez signalée, à propos de « Maison 5 pièces », et a pris les mesures qu'elle a jugées nécessaires.",
    );
    expect(text).toContain("Nous ne détaillons pas ces mesures.");
    expect(email?.html).toContain("https://leenkey-v2.vercel.app/messages/c1");
    expect(text).not.toMatch(/averti|téléphone|\bon\b/i);
  });

  it("tells the buyer the answer of the seller, with its message", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const declined = await renderNotificationEmail(
      planned([
        queued({
          type: "offer.answered",
          groupKey: "offer:o1",
          link: "/offres/o1",
          data: { ...offer, accepted: false, message: "Trop éloigné du prix demandé." },
        }),
      ]),
    );
    expect(declined?.subject).toBe("Votre offre d'achat a été refusée · LK-2026-00012");
    expect(declined?.text).toContain("Le vendeur a refusé votre offre");
    expect(declined?.text).toContain("Trop éloigné du prix demandé.");
    expect(declined?.text).toContain("vous avez fait une offre d'achat sur Leenkey");

    const accepted = await renderNotificationEmail(
      planned([
        queued({
          type: "offer.answered",
          groupKey: "offer:o1",
          link: "/offres/o1",
          data: { ...offer, accepted: true },
        }),
      ]),
    );
    expect(accepted?.subject).toBe("Votre offre d'achat a été acceptée · LK-2026-00012");
    expect(accepted?.text).toContain("Le vendeur a accepté votre offre");
    expect(accepted?.text).toContain("le ou les notaires");
    expect(accepted?.text).not.toMatch(/Message du vendeur|\bon\b/i);
  });

  it("tells the seller a withdrawal with its date and time, both parties an expiry (L2-04b)", async () => {
    const { renderNotificationEmail, emailPolicy } =
      await import("@/leenkey/notifications/email-catalog");
    for (const type of ["offer.withdrawn", "offer.expired"]) {
      expect(emailPolicy(type)).toEqual({
        audience: "recipient",
        preference: "email_offers",
        throttleMinutes: 0,
      });
    }
    const plain = (value: string | undefined) => (value ?? "").replace(/[\u00A0\u202F]/g, " ");
    const withdrawn = await renderNotificationEmail(
      planned([
        queued({
          type: "offer.withdrawn",
          groupKey: "offer:o1",
          link: "/offres/o1",
          data: { ...offer, buyer_first_name: "Chloé", withdrawn_at: "2026-11-14T09:12:00Z" },
        }),
      ]),
    );
    expect(withdrawn?.subject).toBe("Offre d'achat retirée · LK-2026-00012");
    expect(plain(withdrawn?.text)).toContain(
      "Chloé a retiré son offre de 338 000 € pour votre bien « Maison familiale 5 pièces » le 14/11/2026 à 10:12.",
    );
    expect(withdrawn?.text).toContain("/offres/o1");
    expect(withdrawn?.text).not.toMatch(/\bon\b|@example/i);

    const expired = (role: string) =>
      renderNotificationEmail(
        planned([
          queued({
            type: "offer.expired",
            groupKey: "offer:o1",
            link: "/offres/o1",
            data: { ...offer, role, expired_at: "2026-11-18T13:00:00Z" },
          }),
        ]),
      );
    const buyer = await expired("buyer");
    expect(buyer?.subject).toBe("Offre d'achat expirée · LK-2026-00012");
    expect(plain(buyer?.text)).toContain(
      "Votre offre de 338 000 € pour le bien « Maison familiale 5 pièces » a expiré le 18/11/2026 à 14:00",
    );
    expect(buyer?.text).toContain("vous pouvez faire une nouvelle offre");
    expect(buyer?.text).toContain("vous avez fait une offre d'achat sur Leenkey");
    const seller = await expired("seller");
    expect(plain(seller?.text)).toContain(
      "L'offre de 338 000 € reçue pour votre bien « Maison familiale 5 pièces » a expiré le 18/11/2026 à 14:00",
    );
    expect(seller?.text).toContain("vous avez reçu une offre d'achat sur Leenkey");
    expect(seller?.text).not.toMatch(/nouvelle offre|\bon\b/i);
  });

  it("sends nothing without the facts of the offer", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    expect(
      await renderNotificationEmail(planned([queued({ type: "offer.received", data: {} })])),
    ).toBeNull();
    expect(
      await renderNotificationEmail(planned([queued({ type: "offer.viewed", data: offer })])),
    ).toBeNull();
  });
});

describe("the emails of a visit (L3-02)", () => {
  const ADDRESS = "12 rue des Lilas";
  const facts = {
    entity_id: "v1",
    visit_id: "v1",
    property_id: "p1",
    listing_id: "l1",
    title: "Maison familiale 5 pièces",
    city: "Savigny-sur-Orge",
    buyer_first_name: "Chloé",
    seller_first_name: "Alice",
    starts_at: "2026-11-21T09:30:00Z",
    ends_at: "2026-11-21T10:00:00Z",
  };
  const plain = (value: string | undefined) => (value ?? "").replace(/[\u00A0\u202F]/g, " ");

  /** The base of the cron: what visit_email_facts answers. */
  function database(
    answer: Record<string, unknown> | null | "error" = {
      status: "confirmed",
      starts_at: facts.starts_at,
      ends_at: facts.ends_at,
      address_line: ADDRESS,
      postal_code: "91600",
      city: "Savigny-sur-Orge",
    },
  ) {
    const rpc = vi.fn(async (fn: string, args: { p_visit: string }) =>
      answer === "error"
        ? { data: null, error: { code: "57014", message: `canceled ${fn} ${args.p_visit}` } }
        : { data: answer ? [answer] : [], error: null },
    );
    // @ts-expect-error: a script of answers, not a client.
    const supabase: EmailDatabase = { rpc };
    return { supabase, rpc };
  }

  const visit = (type: string, role: "buyer" | "seller") =>
    planned([
      queued({
        type,
        profileId: role,
        firstName: role === "buyer" ? "Chloé" : "Alice",
        groupKey: "visit:v1",
        link: role === "buyer" ? "/visites/v1" : "/vendeur/biens/p1/visites",
        data: { ...facts, role },
      }),
    ]);

  const ics = (email: { attachments?: { filename: string; content: string }[] } | null) => {
    expect(email?.attachments).toHaveLength(1);
    expect(email?.attachments?.[0].filename).toBe("visite-leenkey.ics");
    return Buffer.from(email?.attachments?.[0].content ?? "", "base64")
      .toString("utf8")
      .replace(/\r\n /g, "");
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-18T10:00:00Z") });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("who gets them: the invitation follows the preference of the messages, the others always leave", async () => {
    const { emailPolicy } = await import("@/leenkey/notifications/email-catalog");
    expect(emailPolicy("visit.invited")).toEqual({
      audience: "recipient",
      preference: "email_messages",
      throttleMinutes: 0,
    });
    for (const type of ["visit.booked", "visit.cancelled", "visit.reminder"]) {
      expect(emailPolicy(type)).toEqual({ audience: "recipient", throttleMinutes: 0 });
    }
  });

  it("invites the buyer: the link to book, until when, no address", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const invitation = (
      data: Record<string, unknown>,
      link: string | null = "/visites/reserver/tok123",
    ) =>
      renderNotificationEmail(
        planned([
          queued({
            type: "visit.invited",
            profileId: "buyer-c",
            firstName: "Chloé",
            groupKey: "visit-invitation:i1",
            link,
            data,
          }),
        ]),
      );
    const email = await invitation({ ...facts, expires_at: "2026-11-25T17:00:00Z" });
    expect(email?.subject).toBe("Invitation à visiter un bien à Savigny-sur-Orge");
    const text = plain(email?.text);
    expect(text).toContain("Bonjour Chloé,");
    expect(text).toContain(
      "Alice vous invite à visiter le bien « Maison familiale 5 pièces » à Savigny-sur-Orge.",
    );
    expect(text).toContain("Cette invitation est valable jusqu'au mercredi 25 novembre à 18 h.");
    expect(text).toContain("Réserver un créneau");
    expect(email?.html).toContain("https://leenkey-v2.vercel.app/visites/reserver/tok123");
    expect(email?.attachments).toBeUndefined();
    expect(text).not.toMatch(/\bon\b|@exemple|91600/i);

    // The town once when the title carries it; words a mail client would link stay out.
    const titled = await invitation({
      ...facts,
      title: "Maison 5 pièces · Savigny-sur-Orge",
      seller_first_name: "www.exemple.fr",
    });
    expect(plain(titled?.text)).toContain(
      "Le vendeur vous invite à visiter le bien « Maison 5 pièces · Savigny-sur-Orge ».",
    );
    // Without its link, nothing leaves.
    expect(await invitation(facts, null)).toBeNull();
  });

  it("confirms the visit: the exact address for the buyer only, the calendar file for both", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const { supabase, rpc } = database();
    const buyer = await renderNotificationEmail(visit("visit.booked", "buyer"), supabase);
    expect(rpc).toHaveBeenCalledWith("visit_email_facts", { p_visit: "v1" });
    expect(plain(buyer?.subject)).toBe("Visite confirmée · samedi 21 novembre à 10 h 30");
    const text = plain(buyer?.text);
    expect(text).toContain(
      "Votre visite pour le bien « Maison familiale 5 pièces » est confirmée : samedi 21 novembre à 10 h 30.",
    );
    expect(text).toContain("Adresse : 12 rue des Lilas, 91600 Savigny-sur-Orge");
    expect(text).toContain("Vous pouvez annuler jusqu'à 2 h avant la visite.");
    expect(text).toContain("Le fichier joint à cet email ajoute la visite à votre agenda.");
    expect(buyer?.html).toContain("https://leenkey-v2.vercel.app/visites/v1");
    expect(text).not.toMatch(/\bon\b|@exemple/i);
    const buyerIcs = ics(buyer);
    expect(buyerIcs).toContain("UID:visit-v1@leenkey.fr");
    expect(buyerIcs).toContain("DTSTART:20261121T093000Z");
    expect(buyerIcs).toContain("DTEND:20261121T100000Z");
    expect(buyerIcs).toContain("SUMMARY:Visite : Maison familiale 5 pièces");
    expect(buyerIcs).toContain("LOCATION:12 rue des Lilas\\, 91600 Savigny-sur-Orge");
    expect(buyerIcs).toContain("URL:https://leenkey-v2.vercel.app/visites/v1");

    const seller = await renderNotificationEmail(visit("visit.booked", "seller"), supabase);
    const sellerText = plain(seller?.text);
    expect(sellerText).toContain("Bonjour Alice,");
    expect(sellerText).toContain(
      "Chloé a réservé une visite de votre bien « Maison familiale 5 pièces » : samedi 21 novembre à 10 h 30.",
    );
    // Neither the address nor a contact detail in the email of the seller.
    expect(`${seller?.text}${seller?.html}`).not.toContain(ADDRESS);
    expect(sellerText).not.toMatch(/Adresse|annuler jusqu|@exemple|\bon\b/i);
    expect(seller?.html).toContain("https://leenkey-v2.vercel.app/vendeur/biens/p1/visites");
    expect(ics(seller)).toContain("URL:https://leenkey-v2.vercel.app/vendeur/biens/p1/visites");
  });

  it("follows the slot of the base, and the town in the file without an address", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const email = await renderNotificationEmail(
      visit("visit.booked", "buyer"),
      database({
        status: "confirmed",
        starts_at: "2026-11-22T14:00:00Z",
        ends_at: "2026-11-22T14:45:00Z",
        address_line: null,
        postal_code: null,
        city: "Savigny-sur-Orge",
      }).supabase,
    );
    expect(plain(email?.subject)).toBe("Visite confirmée · dimanche 22 novembre à 15 h");
    expect(email?.text).not.toContain("Adresse");
    expect(ics(email)).toContain("LOCATION:Savigny-sur-Orge");
  });

  it("sends nothing for a visit no longer confirmed, not found, or without the base", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const cancelled = {
      status: "cancelled",
      starts_at: facts.starts_at,
      ends_at: facts.ends_at,
      address_line: null,
      postal_code: null,
      city: "Savigny-sur-Orge",
    };
    for (const type of ["visit.booked", "visit.reminder"]) {
      for (const role of ["buyer", "seller"] as const) {
        expect(
          await renderNotificationEmail(visit(type, role), database(cancelled).supabase),
        ).toBeNull();
        expect(
          await renderNotificationEmail(visit(type, role), database(null).supabase),
        ).toBeNull();
        expect(await renderNotificationEmail(visit(type, role))).toBeNull();
      }
      // The base does not answer: an error, for a new try later.
      await expect(
        renderNotificationEmail(visit(type, "buyer"), database("error").supabase),
      ).rejects.toThrow("visit_email_facts");
    }
  });

  it("tells a cancelling to the other party, without the base nor the address", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const buyer = await renderNotificationEmail(visit("visit.cancelled", "buyer"));
    expect(plain(buyer?.subject)).toBe("Visite annulée · samedi 21 novembre à 10 h 30");
    expect(plain(buyer?.text)).toContain(
      "Le vendeur a annulé votre visite pour le bien « Maison familiale 5 pièces », prévue samedi 21 novembre à 10 h 30.",
    );
    expect(buyer?.text).toContain(
      "Vous pouvez réserver un autre créneau depuis votre invitation tant qu'elle est valide.",
    );
    expect(buyer?.attachments).toBeUndefined();

    const seller = await renderNotificationEmail(visit("visit.cancelled", "seller"));
    expect(plain(seller?.text)).toContain(
      "Chloé a annulé sa visite de votre bien « Maison familiale 5 pièces », prévue samedi 21 novembre à 10 h 30.",
    );
    expect(seller?.text).toContain("Vous n'avez rien à faire.");
    expect(seller?.text).not.toMatch(/autre créneau|\bon\b|@exemple/i);
    // Without the date of the visit, nothing leaves.
    expect(
      await renderNotificationEmail(
        planned([queued({ type: "visit.cancelled", data: { role: "buyer" } })]),
      ),
    ).toBeNull();
  });

  it("reminds the visit the day before: the address for the buyer only, the calendar file", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const { supabase } = database();
    const buyer = await renderNotificationEmail(visit("visit.reminder", "buyer"), supabase);
    expect(plain(buyer?.subject)).toBe("Rappel : visite demain à 10 h 30");
    const text = plain(buyer?.text);
    expect(text).toContain(
      "Nous vous rappelons votre visite pour le bien « Maison familiale 5 pièces » : demain, samedi 21 novembre à 10 h 30.",
    );
    expect(text).toContain("Adresse : 12 rue des Lilas, 91600 Savigny-sur-Orge");
    expect(ics(buyer)).toContain("LOCATION:12 rue des Lilas\\, 91600 Savigny-sur-Orge");

    const seller = await renderNotificationEmail(visit("visit.reminder", "seller"), supabase);
    expect(plain(seller?.text)).toContain(
      "Nous vous rappelons la visite de votre bien « Maison familiale 5 pièces » par Chloé : demain, samedi 21 novembre à 10 h 30.",
    );
    expect(`${seller?.text}${seller?.html}`).not.toContain(ADDRESS);
    expect(seller?.text).not.toMatch(/Adresse|\bon\b|@exemple/i);
    expect(ics(seller)).toContain("DTSTART:20261121T093000Z");
  });
});

describe("the emails of the sale file (L3-04)", () => {
  const plain = (value: string | undefined) => (value ?? "").replace(/[\u00A0\u202F]/g, " ");
  const AMOUNT = /€|\d[\d\s]*euros?\b|budget|apport/i;

  const share = (id: string, count: unknown, data: Record<string, unknown> = {}) =>
    queued({
      id,
      type: "document.shared",
      profileId: "buyer-c",
      email: "buyer_c@exemple.test",
      firstName: "Chloé",
      groupKey: "documents:p1:buyer-c",
      link: "/acquereur/documents",
      data: {
        entity_id: "p1",
        property_id: "p1",
        title: "Maison familiale 5 pièces",
        city: "Savigny-sur-Orge",
        count,
        ...data,
      },
    });

  const request = (
    data: Record<string, unknown>,
    link: string | null = "/vendeur/biens/p1/documents",
  ) =>
    planned([
      queued({
        type: "document.access_requested",
        profileId: "seller-a",
        firstName: "Alice",
        groupKey: "document-request:r1",
        link,
        data,
      }),
    ]);
  const facts = {
    entity_id: "r1",
    property_id: "p1",
    title: "Maison familiale 5 pièces",
    buyer_first_name: "Chloé",
    financing_status: "document_checked",
  };

  it("who gets them: one email per property and per day for the shares, the request at once", async () => {
    const { emailPolicy } = await import("@/leenkey/notifications/email-catalog");
    expect(emailPolicy("document.shared")).toEqual({
      audience: "recipient",
      preference: "email_messages",
      throttleMinutes: 1380,
    });
    expect(emailPolicy("document.access_requested")).toEqual({
      audience: "recipient",
      preference: "email_messages",
      throttleMinutes: 0,
    });
  });

  it("the shares of a day wait for the next email of their property, and leave together", async () => {
    const { planEmails } = await import("@/core/notifications/batch");
    const { emailPolicy, renderNotificationEmail } =
      await import("@/leenkey/notifications/email-catalog");
    const sent = new Date("2026-10-23T12:00:00Z");
    const rows = [share("s1", 2, { title: "Maison" }), share("s2", 3)].map((row, index) => ({
      ...row,
      createdAt: new Date(`2026-10-24T0${8 + index}:00:00Z`),
      groupLastSentAt: sent,
    }));
    // 22 hours after the last email of this property: they wait for the 24th.
    const early = planEmails(rows, emailPolicy, NOW);
    expect(early.emails).toEqual([]);
    expect(early.postponed).toEqual([
      { ids: ["s1", "s2"], until: new Date("2026-10-24T11:00:00Z") },
    ]);
    // Then one email for both, another property apart, and the preference of the messages.
    const later = planEmails(
      [
        ...rows,
        { ...share("other", 1), groupKey: "documents:p2:buyer-c" },
        { ...share("off", 4), groupKey: "documents:p3:buyer-c", prefs: { email_messages: false } },
      ],
      emailPolicy,
      new Date("2026-10-24T12:01:00Z"),
    );
    expect(later.emails.map((email) => email.ids)).toEqual([["s1", "s2"], ["other"]]);
    expect(later.skipped).toEqual([{ id: "off", reason: "disabled" }]);
    const email = await renderNotificationEmail(later.emails[0]);
    expect(plain(email?.subject)).toBe("5 documents partagés avec vous · Savigny-sur-Orge");
  });

  it("tells the buyer how many documents are shared: the sum of the rows, the words of the last", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const email = await renderNotificationEmail(
      planned([share("s1", 2, { title: "Ancien titre" }), share("s2", 1), share("s3", 3)]),
    );
    expect(plain(email?.subject)).toBe("6 documents partagés avec vous · Savigny-sur-Orge");
    const text = plain(email?.text);
    expect(text).toContain("Bonjour Chloé,");
    expect(text).toContain(
      "6 documents du bien « Maison familiale 5 pièces » à Savigny-sur-Orge sont partagés avec vous.",
    );
    expect(text).toContain(
      "Ces documents vous sont transmis par le vendeur. Leenkey ne garantit ni leur contenu ni leur exhaustivité.",
    );
    expect(text).toContain("Voir les documents");
    expect(text).toContain("parce qu'un vendeur partage les documents de son bien avec vous");
    expect(text).not.toContain("Ancien titre");
    expect(email?.html).toContain("https://leenkey-v2.vercel.app/acquereur/documents");
    expect(email?.attachments).toBeUndefined();
    expect(text).not.toMatch(AMOUNT);
    expect(text).not.toMatch(/\bon\b|@exemple|91600/i);
  });

  it("one document, a title that carries the town, facts that say little", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const one = await renderNotificationEmail(
      planned([share("s1", 1, { title: "Maison 5 pièces · Savigny-sur-Orge" })]),
    );
    expect(one?.subject).toBe("Un document partagé avec vous · Savigny-sur-Orge");
    expect(plain(one?.text)).toContain(
      "Un document du bien « Maison 5 pièces · Savigny-sur-Orge » est partagé avec vous.",
    );
    // A row without its number counts for one document; a title a mail client would link stays out.
    const bare = await renderNotificationEmail(
      planned([
        share("s1", "3", { title: "www.exemple.fr", city: null }),
        share("s2", 2, { title: "www.exemple.fr", city: null }),
      ]),
    );
    expect(plain(bare?.subject)).toBe("3 documents partagés avec vous");
    expect(plain(bare?.text)).toContain("3 documents d'un bien sont partagés avec vous.");
    expect(bare?.text).not.toContain("exemple.fr");
    // Without a link of its own, the page of the documents of the buyer.
    const unlinked = await renderNotificationEmail(planned([{ ...share("s1", 1), link: null }]));
    expect(unlinked?.html).toContain("https://leenkey-v2.vercel.app/acquereur/documents");
  });

  it("tells the seller who asks to read the documents: the financing status in its words, no amount", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const email = await renderNotificationEmail(
      request({
        ...facts,
        budget_cents: 35_000_000,
        email: "chloe@exemple.test",
        phone: "0601020304",
      }),
    );
    expect(email?.subject).toBe("Chloé demande l'accès à vos documents");
    const text = plain(email?.text);
    expect(text).toContain("Bonjour Alice,");
    expect(text).toContain(
      "Chloé souhaite consulter les documents de votre bien « Maison familiale 5 pièces ».",
    );
    expect(text).toContain("Financement : Justificatif vérifié");
    expect(text).toContain(
      "Vous choisissez : accorder l'accès partage vos documents avec cet acquéreur, refuser ne partage rien.",
    );
    expect(text).toContain("Répondre à la demande");
    expect(email?.html).toContain("https://leenkey-v2.vercel.app/vendeur/biens/p1/documents");
    // Never an amount, a contact detail of the buyer, or a financing said « validé ».
    expect(`${email?.subject} ${text}`).not.toMatch(AMOUNT);
    expect(`${email?.text}${email?.html}`).not.toMatch(/350|chloe@exemple|0601020304/);
    expect(text).not.toMatch(/validé|\bon\b/i);
  });

  it("each financing status has its exact label; an unknown one reads as not provided", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const labels = {
      not_provided: "Financement : Financement non renseigné",
      declared: "Financement : Informations déclarées",
      document_provided: "Financement : Justificatif fourni",
      document_checked: "Financement : Justificatif vérifié",
      validated: "Financement : Financement non renseigné",
    };
    for (const [status, label] of Object.entries(labels)) {
      const email = await renderNotificationEmail(request({ ...facts, financing_status: status }));
      expect(plain(email?.text)).toContain(label);
    }
    // No first name, or one a mail client would link; no title; no link.
    const bare = await renderNotificationEmail(
      request({ buyer_first_name: "www.exemple.fr" }, null),
    );
    expect(bare?.subject).toBe("Un acquéreur demande l'accès à vos documents");
    expect(plain(bare?.text)).toContain(
      "Un acquéreur souhaite consulter les documents de votre bien.",
    );
    expect(plain(bare?.text)).toContain("Financement : Financement non renseigné");
    expect(bare?.html).toContain("https://leenkey-v2.vercel.app/vendeur");
  });
});

describe("sendNotificationEmails", () => {
  type Update = { values: Record<string, unknown>; ids: string[]; filters: string[] };

  function client(
    rows: unknown[],
    {
      claimed = true,
      team = [],
      visit = [],
    }: {
      claimed?: boolean | string[];
      team?: string[] | "error";
      /** What visit_email_facts answers (L3-02). */
      visit?: unknown[] | "error";
    } = {},
  ) {
    const updates: Update[] = [];
    const supabase = {
      // The queue, and the addresses of the admins of the team.
      rpc: vi.fn(async (fn: string) =>
        (fn === "team_email_addresses" && team === "error") ||
        (fn === "visit_email_facts" && visit === "error")
          ? { data: null, error: { code: "57014", message: "canceled" } }
          : {
              data:
                fn === "team_email_addresses" ? team : fn === "visit_email_facts" ? visit : rows,
              error: null,
            },
      ),
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

  it("the team email goes to every admin and ADMIN_NOTIFICATION_EMAIL, never to nobody in production", async () => {
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
    // The two admin accounts (2026-11-08), the configured address once.
    const team = ["contact.leenkey@exemple.test", "admin@exemple.test"];
    // @ts-expect-error: a script of answers, not a client.
    await sendNotificationEmails(client([pending], { team }).supabase, NOW, { paceMs: 0 });
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["contact.leenkey@exemple.test", "admin@exemple.test"],
        subject: "Annonce à valider (LK-0042)",
      }),
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

  it("the addresses of the team unknown (base down): its emails wait, the others leave", async () => {
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
    process.env.NEXT_PUBLIC_ENV = "production";
    process.env.ADMIN_NOTIFICATION_EMAIL = "Admin@Exemple.test";
    mocks.sendEmail.mockResolvedValue("sent");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { supabase, updates } = client([pending, row()], { team: "error" });
    // @ts-expect-error: a script of answers, not a client.
    const summary = await sendNotificationEmails(supabase, NOW, { paceMs: 0 });
    // The message of the seller leaves; the email of the team is neither sent
    // to part of it nor dropped: nothing written on its row.
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "seller_a@exemple.test" }),
    );
    expect(summary).toMatchObject({ sent: 1, skipped: 0, postponed: 1 });
    expect(updates.some((update) => update.ids.includes("p1"))).toBe(false);
    log.mockRestore();
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
  });

  it("an address of the team once, whatever its case", async () => {
    const { teamAddresses } = await import("@/leenkey/notifications/send-emails");
    process.env.ADMIN_NOTIFICATION_EMAIL = "Contact.Leenkey@Exemple.test ";
    const { supabase } = client([], { team: ["contact.leenkey@exemple.test"] });
    // @ts-expect-error: a script of answers, not a client.
    await expect(teamAddresses(supabase)).resolves.toEqual(["contact.leenkey@exemple.test"]);
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
  });

  it("a visit booked leaves with its calendar file; the base down, it is tried again (L3-02)", async () => {
    const { sendNotificationEmails } = await import("@/leenkey/notifications/send-emails");
    const booked = row({
      id: "b1",
      profile_id: "buyer-c",
      type: "visit.booked",
      group_key: "visit:v1",
      link: "/visites/v1",
      email: "buyer_c@exemple.test",
      first_name: "Chloé",
      // No preference turns it off.
      prefs: { email_messages: false, email_offers: false, email_alerts: false },
      data: {
        entity_id: "v1",
        visit_id: "v1",
        title: "Maison 5 pièces",
        city: "Savigny-sur-Orge",
        role: "buyer",
        starts_at: "2026-10-25T09:30:00Z",
        ends_at: "2026-10-25T10:00:00Z",
      },
    });
    const confirmed = {
      status: "confirmed",
      starts_at: "2026-10-25T09:30:00Z",
      ends_at: "2026-10-25T10:00:00Z",
      address_line: "12 rue des Lilas",
      postal_code: "91600",
      city: "Savigny-sur-Orge",
    };
    mocks.sendEmail.mockResolvedValue("test");
    const sent = client([booked], { visit: [confirmed] });
    // @ts-expect-error: a script of answers, not a client.
    const summary = await sendNotificationEmails(sent.supabase, NOW, { paceMs: 0 });
    expect(summary).toMatchObject({ due: 1, sent: 1, failed: 0, skipped: 0 });
    expect(sent.supabase.rpc).toHaveBeenCalledWith("visit_email_facts", { p_visit: "v1" });
    const [email] = mocks.sendEmail.mock.calls[0];
    expect(email.to).toBe("buyer_c@exemple.test");
    expect(email.text).toContain("12 rue des Lilas, 91600 Savigny-sur-Orge");
    expect(email.attachments).toEqual([
      { filename: "visite-leenkey.ics", content: expect.stringMatching(/^[A-Za-z0-9+/]+=*$/) },
    ]);

    // Cancelled meanwhile: claimed, nothing leaves.
    mocks.sendEmail.mockClear();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const gone = client([booked], { visit: [{ ...confirmed, status: "cancelled" }] });
    // @ts-expect-error: a script of answers, not a client.
    await sendNotificationEmails(gone.supabase, NOW, { paceMs: 0 });
    expect(mocks.sendEmail).not.toHaveBeenCalled();

    // The base does not answer: its row is given back for a new try.
    const down = client([booked], { visit: "error" });
    // @ts-expect-error: a script of answers, not a client.
    const failed = await sendNotificationEmails(down.supabase, NOW, { paceMs: 0 });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(failed).toMatchObject({ sent: 0, failed: 1 });
    expect(down.updates.at(-1)).toMatchObject({
      values: { email_sent_at: null, email_after: "2026-10-24T10:15:00.000Z" },
      ids: ["b1"],
    });
    log.mockRestore();
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
