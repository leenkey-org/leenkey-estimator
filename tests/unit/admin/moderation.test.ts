import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { routeEmail } from "@/core/notifications/routing";
import { EMAIL_PLAIN_TEXT } from "@/emails/components/email-layout";
import { ListingDecisionEmail, listingDecisionSubject } from "@/emails/listing-decision";
import { moderationError } from "@/leenkey/admin/moderation";
import { isInLaunchZone } from "@/lib/config/launch-zone";
import {
  adminListingsHref,
  moderationSchema,
  parseAdminListingsQuery,
  reasonLength,
} from "@/lib/validations/admin";

// L1-19: back office of the listings.

const listingId = "623efc8b-97d4-4902-ac43-406417498893";

describe("moderationSchema", () => {
  it("accepts the four decisions, a motive for a refusal and a suspension", () => {
    expect(moderationSchema.parse({ action: "publish", listingId })).toEqual({
      action: "publish",
      listingId,
    });
    expect(moderationSchema.parse({ action: "unsuspend", listingId }).action).toBe("unsuspend");
    expect(
      moderationSchema.parse({ action: "reject", listingId, reason: "  Photos floues.  " }),
    ).toEqual({ action: "reject", listingId, reason: "Photos floues." });
    expect(
      moderationSchema.parse({ action: "suspend", listingId, reason: "Signalement" }).action,
    ).toBe("suspend");
  });

  it("refuses a missing or too short motive, an unknown action or listing", () => {
    for (const input of [
      { action: "reject", listingId },
      { action: "reject", listingId, reason: " a " },
      // Four UTF-16 units, but two characters for Postgres (char_length).
      { action: "reject", listingId, reason: "🙂🙂" },
      { action: "suspend", listingId, reason: "x".repeat(1001) },
      { action: "delete", listingId },
      { action: "publish", listingId: "LK-0005" },
      null,
    ]) {
      expect(moderationSchema.safeParse(input).success, JSON.stringify(input)).toBe(false);
    }
  });
});

describe("motive length", () => {
  it("counts the characters as Postgres does, after the trim", () => {
    expect(reasonLength("  Photos  ")).toBe(6);
    expect(reasonLength("🙂🙂")).toBe(2);
    expect(
      moderationSchema.safeParse({ action: "reject", listingId, reason: "🙂🙂🙂" }).success,
    ).toBe(true);
  });
});

describe("moderationError", () => {
  it("reads the SQLSTATE of the status functions of L1-04", () => {
    expect(moderationError("42501")).toBe("forbidden");
    expect(moderationError("P0002")).toBe("not_found");
    expect(moderationError("22023")).toBe("conflict");
    expect(moderationError("08006")).toBe("unavailable");
    expect(moderationError(undefined)).toBe("unavailable");
  });
});

describe("isInLaunchZone", () => {
  it("knows the postal codes around Épinay-sur-Orge, the others are flagged", () => {
    expect(isInLaunchZone("91360")).toBe(true);
    expect(isInLaunchZone(" 91620 ")).toBe(true);
    expect(isInLaunchZone("91300")).toBe(false);
    expect(isInLaunchZone("75011")).toBe(false);
  });
});

describe("admin listings URL", () => {
  it("reads the status filter and the search, ignores anything else", () => {
    expect(parseAdminListingsQuery({ statut: "a-valider", q: " juvisy " })).toEqual({
      status: "pending",
      query: "juvisy",
    });
    expect(parseAdminListingsQuery({ statut: "pending", q: "" })).toEqual({
      status: undefined,
      query: undefined,
    });
    expect(parseAdminListingsQuery({ statut: ["suspendues", "en-ligne"] }).status).toBe(
      "suspended",
    );
    expect(parseAdminListingsQuery({ q: "x".repeat(101) }).query).toBeUndefined();
  });

  it("builds the address back from them", () => {
    expect(adminListingsHref({})).toBe("/admin/annonces");
    expect(adminListingsHref({ status: "rejected", query: "Bruno L" })).toBe(
      "/admin/annonces?statut=a-corriger&q=Bruno+L",
    );
    expect(parseAdminListingsQuery({ statut: "a-corriger", q: "Bruno L" })).toEqual({
      status: "rejected",
      query: "Bruno L",
    });
  });
});

describe("routeEmail", () => {
  const email = { to: "vendeur@exemple.test", subject: "Votre annonce est en ligne" };

  it("sends to the recipient in production only", () => {
    expect(routeEmail(email, "production", "boite@exemple.test")).toEqual(email);
  });

  it("sends everything to the test inbox elsewhere, with a prefix", () => {
    expect(routeEmail(email, "staging", "boite@exemple.test")).toEqual({
      to: "boite@exemple.test",
      subject: "[PREPROD] Votre annonce est en ligne",
    });
    expect(routeEmail(email, "local", "boite@exemple.test")?.subject).toBe(
      "[LOCAL] Votre annonce est en ligne",
    );
  });

  it("never sends outside production without a test inbox", () => {
    expect(routeEmail(email, "staging", undefined)).toBeNull();
    expect(routeEmail(email, "local", "")).toBeNull();
  });
});

describe("moderation emails", () => {
  const props = {
    firstName: "Alice",
    title: "Appartement 3 pièces lumineux",
    listingUrl: "https://leenkey.fr/annonce/appartement-3-pieces-savigny-sur-orge-lk0001",
    sellerUrl: "https://leenkey.fr/vendeur",
    contactEmail: "contact.leenkey@gmail.com",
    siteUrl: "https://leenkey.fr",
  };

  it("published: the link to the listing", async () => {
    const html = await render(ListingDecisionEmail({ ...props, decision: "published" }));
    expect(listingDecisionSubject("published", "LK-0001")).toBe(
      "Votre annonce est en ligne (LK-0001)",
    );
    expect(html).toContain('lang="fr"');
    expect(html).toContain("Bonjour Alice,");
    expect(html).toContain(props.listingUrl);
    expect(html).toContain("SAS LEENKEY");
  });

  it("rejected and suspended: the motive, as written, and the way out", async () => {
    const reason = "La description est incomplète : précisez l'état du bien.";
    const rejected = await render(
      ListingDecisionEmail({ ...props, decision: "rejected", reason }),
      { plainText: true },
    );
    expect(rejected).toContain(reason);
    expect(rejected).toContain("sous 24\u00A0h");
    expect(listingDecisionSubject("rejected", "LK-0001")).toBe(
      "Votre annonce est à corriger (LK-0001)",
    );

    const suspended = await render(
      ListingDecisionEmail({ ...props, decision: "suspended", reason, firstName: null }),
      { plainText: true },
    );
    expect(suspended).toContain("Bonjour,");
    expect(suspended).toContain(reason);
    expect(suspended).toContain(props.contactEmail);
    // The delay of the contact form (CLAUDE.md section 16).
    expect(suspended).toContain("sous 48\u00A0h, 7\u00A0j/7");
    expect(listingDecisionSubject("suspended", "LK-0001")).toBe(
      "Votre annonce est suspendue (LK-0001)",
    );
    const html = await render(
      ListingDecisionEmail({ ...props, decision: "suspended", reason: "Ligne 1\nLigne 2" }),
    );
    expect(html).toContain(`href="mailto:${props.contactEmail}"`);
    expect(html).toContain("white-space:pre-line");
  });

  it("plain text: the title keeps its case", async () => {
    const text = await render(
      ListingDecisionEmail({ ...props, decision: "published" }),
      EMAIL_PLAIN_TEXT,
    );
    expect(text).toContain("Votre annonce est en ligne");
    expect(text).not.toContain("VOTRE ANNONCE");
  });

  it("speaks with « nous », never « on » (CLAUDE.md section 16)", async () => {
    for (const decision of ["published", "rejected", "suspended"] as const) {
      const text = await render(ListingDecisionEmail({ ...props, decision, reason: "Motif" }), {
        plainText: true,
      });
      expect(text, decision).not.toMatch(/\bon\b/i);
    }
  });
});
