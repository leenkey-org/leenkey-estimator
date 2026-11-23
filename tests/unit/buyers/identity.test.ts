import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlannedEmail, QueuedNotification } from "@/core/notifications/batch";
import {
  identityDeposited,
  identityOf,
  NO_IDENTITY,
  type IdentityDocumentRow,
} from "@/leenkey/buyers/identity-status";
import { describeNotification } from "@/leenkey/notifications/catalog";
import { fr } from "@/lib/i18n/fr";
import {
  identityCheckSchema,
  identityFileDeleteSchema,
  identityRefuseSchema,
} from "@/lib/validations/admin";
import { FINANCING_FILE_MAX_BYTES, FINANCING_UPLOAD_MAX_BYTES } from "@/lib/validations/buyer";
import {
  IDENTITY_DOCUMENT_TYPES,
  IDENTITY_FILE_MAX_BYTES,
  IDENTITY_STATUSES,
  IDENTITY_UPLOAD_MAX_BYTES,
  identityDocumentSchema,
} from "@/lib/validations/identity";

vi.mock("server-only", () => ({}));
vi.mock("@/core/notifications/email", () => ({ sendEmail: vi.fn() }));

// The identity check of a buyer before a visit (DECISIONS.md 2026-11-23):
// what is accepted, what the screens show of the rows a buyer reads, the
// exact labels (never « validé »), the notices to the buyer, and the promise
// of the page « Intelligence artificielle »: nothing of it reaches the AI.

const env = { ...process.env };
beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://leenkey-v2.vercel.app";
});
afterEach(() => {
  process.env = { ...env };
});

const DOC = "5eedd000-0000-4000-8000-000000000001";
const PROFILE = "5eed0000-0000-4000-8000-00000000000c";

function row(overrides: Partial<IdentityDocumentRow> = {}): IdentityDocumentRow {
  return {
    id: DOC,
    type: "carte_identite",
    mime_type: "application/pdf",
    created_at: "2026-11-23T09:00:00Z",
    checked_at: null,
    refused_at: null,
    refusal_reason: null,
    withdrawn_at: null,
    file_deleted_at: null,
    ...overrides,
  };
}

describe("identityDocumentSchema", () => {
  it("takes a type of the closed list only", () => {
    expect(IDENTITY_DOCUMENT_TYPES).toEqual(["carte_identite", "passeport", "titre_sejour"]);
    for (const type of IDENTITY_DOCUMENT_TYPES) {
      expect(identityDocumentSchema.safeParse({ type }).success).toBe(true);
    }
    for (const type of ["permis", "", null, undefined, "CARTE_IDENTITE"]) {
      expect(identityDocumentSchema.safeParse({ type }).success).toBe(false);
    }
  });

  it("keeps nothing but the type: no number, no date, no name", () => {
    const parsed = identityDocumentSchema.parse({
      type: "passeport",
      number: "12AB34567",
      birthDate: "1990-04-12",
      lastName: "Dubois",
    });
    expect(parsed).toEqual({ type: "passeport" });
  });

  it("takes the files of a proof of financing: same limits", () => {
    expect(IDENTITY_FILE_MAX_BYTES).toBe(FINANCING_FILE_MAX_BYTES);
    expect(IDENTITY_UPLOAD_MAX_BYTES).toBe(FINANCING_UPLOAD_MAX_BYTES);
    expect(IDENTITY_UPLOAD_MAX_BYTES).toBeLessThan(IDENTITY_FILE_MAX_BYTES);
  });
});

describe("identityOf", () => {
  it("is not provided without a document", () => {
    expect(identityOf([])).toEqual(NO_IDENTITY);
    expect(identityDeposited("not_provided")).toBe(false);
  });

  it("is provided while the document waits for its check, and that is enough to book", () => {
    const identity = identityOf([row({ mime_type: "image/jpeg" })]);
    expect(identity).toEqual({
      status: "provided",
      document: {
        id: DOC,
        type: "carte_identite",
        isPdf: false,
        createdAt: "2026-11-23T09:00:00Z",
        checkedAt: null,
        fileDeleted: false,
      },
      refusalReason: null,
    });
    expect(identityDeposited(identity.status)).toBe(true);
  });

  it("is checked once the team has checked it, its file deleted", () => {
    const identity = identityOf([
      row({ checked_at: "2026-11-24T10:00:00Z", file_deleted_at: "2026-11-24T10:00:01Z" }),
      row({ id: "old", withdrawn_at: "2026-11-23T08:00:00Z" }),
    ]);
    expect(identity.status).toBe("checked");
    expect(identity.document).toMatchObject({
      id: DOC,
      checkedAt: "2026-11-24T10:00:00Z",
      fileDeleted: true,
    });
    expect(identityDeposited(identity.status)).toBe(true);
  });

  it("is not provided after a refusal, with the reason of the team", () => {
    const identity = identityOf([
      row({ refused_at: "2026-11-24T10:00:00Z", refusal_reason: "Document illisible." }),
    ]);
    expect(identity).toEqual({
      status: "not_provided",
      document: null,
      refusalReason: "Document illisible.",
    });
    expect(identityDeposited(identity.status)).toBe(false);
  });

  it("forgets a refusal once another document was deposited or withdrawn since", () => {
    const refused = row({
      id: "refused",
      created_at: "2026-11-22T09:00:00Z",
      refused_at: "2026-11-22T10:00:00Z",
      refusal_reason: "Document illisible.",
    });
    // Deposited again: the new one counts.
    expect(identityOf([row(), refused])).toMatchObject({ status: "provided", refusalReason: null });
    // Deposited again then withdrawn: nothing to say of the old refusal.
    expect(identityOf([row({ withdrawn_at: "2026-11-23T10:00:00Z" }), refused])).toEqual(
      NO_IDENTITY,
    );
  });
});

describe("the decisions of the team", () => {
  const ids = { documentId: DOC, profileId: PROFILE };

  it("checks with an optional note of 1 000 characters at most", () => {
    expect(identityCheckSchema.safeParse({ ...ids, note: "" }).success).toBe(true);
    expect(identityCheckSchema.safeParse({ ...ids, note: "x".repeat(1000) }).success).toBe(true);
    expect(identityCheckSchema.safeParse({ ...ids, note: "x".repeat(1001) }).success).toBe(false);
    expect(
      identityCheckSchema.safeParse({ documentId: "doc", profileId: PROFILE, note: "" }),
    ).toMatchObject({ success: false });
  });

  it("refuses with a reason of 3 to 1 000 characters, trimmed", () => {
    const refuse = (reason: unknown) =>
      identityRefuseSchema.safeParse({ ...ids, reason, note: "" });
    expect(refuse("  Document illisible.  ")).toMatchObject({
      success: true,
      data: { reason: "Document illisible." },
    });
    expect(refuse("").success).toBe(false);
    expect(refuse("  x ").success).toBe(false);
    expect(refuse("x".repeat(1001)).success).toBe(false);
    expect(refuse(undefined).success).toBe(false);
  });

  it("deletes a file from the document and the sheet it is shown on", () => {
    expect(identityFileDeleteSchema.parse({ ...ids, note: "ignored" })).toEqual(ids);
  });
});

describe("the labels", () => {
  const t = fr.identityDocument;

  it("names the three statuses, for the buyer and for a seller", () => {
    expect(Object.keys(t.status)).toEqual([...IDENTITY_STATUSES]);
    expect(Object.keys(t.seller).filter((key) => key !== "mention")).toEqual([
      ...IDENTITY_STATUSES,
    ]);
    expect(t.status.provided).toBe("Pièce d'identité déposée");
    expect(t.status.checked).toBe("Identité vérifiée par Leenkey");
    expect(t.seller.provided).toBe("Pièce d'identité déposée, en cours de vérification");
    expect(t.seller.checked).toBe("Identité vérifiée par Leenkey");
    expect(Object.keys(t.types)).toEqual([...IDENTITY_DOCUMENT_TYPES]);
  });

  it("never says « validé », never « on », and promises what the feature does", () => {
    const texts = JSON.stringify([
      fr.identityDocument,
      fr.emails.identityChecked,
      fr.emails.identityRefused,
      fr.notifications.types.identityChecked,
      fr.notifications.types.identityRefused,
      fr.visits.booking.errors.identity,
      fr.adminDashboard.todo.kinds.identity,
    ]);
    const called = [
      t.checked("24 novembre 2026"),
      t.filed("23 novembre 2026"),
      t.refused("Document illisible."),
      t.admin.checked("24 nov.", "Cédric"),
      t.admin.refused("24 nov.", null),
      t.admin.withdrawn("24 nov."),
      t.admin.fileDeleted("24 nov."),
      t.booking.slots(1),
      t.booking.slots(3),
      fr.emails.identityRefused.reason("Document illisible."),
      fr.notifications.types.identityRefused.detail("Document illisible."),
      fr.notifications.types.identityRefused.detail(null),
    ].join(" ");
    expect(`${texts} ${called}`).not.toMatch(/valid[ée]|\bon\b|\bOn\b/);
    expect(t.booking.slots(0)).toBeNull();
    // What the buyer is promised: who reads it, its deletion, nothing kept, never the AI.
    expect(t.privacy).toContain("Seule l'équipe Leenkey consulte votre pièce d'identité.");
    expect(t.privacy).toContain("Nous supprimons le fichier dès la vérification faite");
    expect(t.privacy).toContain("ni numéro, ni date de naissance");
    expect(t.privacy).toContain("jamais transmise à notre assistant");
    // The check of the team is never waited for.
    expect(t.intro).toContain("sans attendre notre vérification");
  });
});

describe("the notices to the buyer", () => {
  const view = (type: string, data: Record<string, unknown>) =>
    describeNotification({
      id: "n1",
      type,
      title: null,
      body: null,
      data,
      link: "/acquereur/profil#identite",
      createdAt: "2026-11-24T10:00:00.000Z",
      readAt: null,
    });

  it("says the identity checked, and a refusal with its reason, in the bell", () => {
    expect(view("identity.checked", { document_id: DOC })).toMatchObject({
      title: "Votre identité est vérifiée",
      tone: "success",
    });
    expect(
      view("identity.refused", { document_id: DOC, reason: "Document illisible." }),
    ).toMatchObject({
      title: "Votre pièce d'identité n'a pas pu être vérifiée",
      detail: "Notre remarque : Document illisible.",
      tone: "warning",
    });
    expect(view("identity.refused", { document_id: DOC }).detail).toBe(
      "Déposez une autre pièce pour réserver une visite.",
    );
  });

  function planned(type: string, data: QueuedNotification["data"]): PlannedEmail {
    const item: QueuedNotification = {
      id: "n1",
      profileId: "buyer-c",
      type,
      data,
      link: "/acquereur/profil#identite",
      groupKey: `identity:${DOC}`,
      createdAt: new Date("2026-11-24T10:00:00Z"),
      emailAfter: new Date("2026-11-24T10:00:00Z"),
      readAt: null,
      email: "buyer_c@exemple.test",
      firstName: "Chloé",
      prefs: {},
      active: true,
      groupLastSentAt: null,
    };
    return {
      audience: "recipient",
      type,
      groupKey: item.groupKey,
      profileId: item.profileId,
      email: item.email,
      firstName: item.firstName,
      items: [item],
      rows: [item],
      ids: [item.id],
    };
  }

  it("emails the buyer at once when the identity is checked", async () => {
    const { renderNotificationEmail, emailPolicy } =
      await import("@/leenkey/notifications/email-catalog");
    expect(emailPolicy("identity.checked")).toEqual({ audience: "recipient", throttleMinutes: 0 });
    const email = await renderNotificationEmail(planned("identity.checked", { document_id: DOC }));
    const text = (email?.text ?? "").replace(/[\u00A0\u202F]/g, " ");
    expect(email?.subject).toBe("Votre identité est vérifiée");
    expect(text).toContain("Bonjour Chloé,");
    expect(text).toContain("votre espace affiche désormais « Identité vérifiée par Leenkey »");
    // Sent when the check is recorded: the deletion follows, it is not claimed done.
    expect(text).toContain("Nous supprimons le fichier après cette vérification");
    expect(text).not.toMatch(/avons supprimé|validé|\bon\b/i);
    expect(email?.html).toContain("https://leenkey-v2.vercel.app/acquereur/profil#identite");
  });

  it("emails the buyer the reason of a refusal, made safe, and what to do next", async () => {
    const { renderNotificationEmail, emailPolicy } =
      await import("@/leenkey/notifications/email-catalog");
    expect(emailPolicy("identity.refused")).toEqual({ audience: "recipient", throttleMinutes: 0 });
    const email = await renderNotificationEmail(
      planned("identity.refused", {
        document_id: DOC,
        reason: "La pièce a expiré : déposez une pièce en cours de validité.",
      }),
    );
    const text = (email?.text ?? "").replace(/[\u00A0\u202F]/g, " ");
    expect(email?.subject).toBe("Votre pièce d'identité est à déposer de nouveau");
    expect(text).toContain(
      "Notre remarque : La pièce a expiré : déposez une pièce en cours de validité.",
    );
    expect(text).toContain("Vos visites déjà réservées sont conservées");
    expect(text).not.toMatch(/validé|\bon\b/i);
    expect(email?.html).toContain("https://leenkey-v2.vercel.app/acquereur/profil#identite");
  });
});

describe("never sent to the AI", () => {
  /** Every source file under a folder. */
  function sources(folder: string): string[] {
    return readdirSync(folder).flatMap((name) => {
      const path = join(folder, name);
      if (statSync(path).isDirectory()) return sources(path);
      return /\.(ts|tsx|md)$/.test(name) ? [path] : [];
    });
  }

  it("no module of the assistant nor of the document analysis reads the identity documents", () => {
    const folders = [
      "core/ai",
      "leenkey/ai",
      "leenkey/sale-file",
      "app/api/ai",
      "app/api/cron/analyze-documents",
    ];
    const files = folders.flatMap((folder) => sources(join(process.cwd(), folder)));
    expect(files.length).toBeGreaterThan(20);
    const reading = files.filter((file) =>
      /identity_document|buyer_identity_for_seller|\/identity\/|buyers\/identity|identity-status/.test(
        readFileSync(file, "utf8"),
      ),
    );
    expect(reading).toEqual([]);
  });

  it("the identity is read apart from the buying project the assistant reads", () => {
    const queries = readFileSync(join(process.cwd(), "leenkey/buyers/queries.ts"), "utf8");
    expect(queries).not.toMatch(/identity/i);
  });
});
