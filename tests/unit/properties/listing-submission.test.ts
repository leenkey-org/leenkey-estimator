import { render } from "@react-email/components";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMAIL_PLAIN_TEXT } from "@/emails/components/email-layout";
import {
  ListingReceivedEmail,
  ListingToReviewEmail,
  listingReceivedSubject,
  listingToReviewSubject,
} from "@/emails/listing-submitted";

// L1-13: a listing created at step 3, then sent for review at step 4, and
// the emails of the sending (SPEC-V2 section 18). The Supabase client is a
// script of answers: the RLS and listing_submit are tested in supabase/tests.

type Answer = { data: unknown; error: { code: string } | null };
type Write = { table: string; op: string; values?: unknown; filters: unknown[] };
type Chain = {
  select(): Chain;
  insert(values: unknown): Chain;
  update(values: unknown): Chain;
  eq(column: string, value: unknown): Chain;
  is(column: string, value: unknown): Chain;
  maybeSingle(): Promise<Answer>;
};

const mocks = vi.hoisted(() => ({
  profile: { id: "a11ce000-0000-4000-8000-000000000001", firstName: "Alice", roles: ["seller"] },
  user: { email: "alice@exemple.test" } as { email: string | null } | null,
  answers: [] as Answer[],
  writes: [] as Write[],
  rpc: vi.fn(),
  after: vi.fn(),
  revalidatePath: vi.fn(),
  sendEmail: vi.fn(),
  emailListingSubmitted: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/core/auth/session", () => ({
  getProfile: async () => mocks.profile,
  getUser: async () => mocks.user,
}));
vi.mock("@/core/notifications/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/leenkey/properties/listing-emails", () => ({
  emailListingSubmitted: mocks.emailListingSubmitted,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from(table: string): Chain {
      const write: Write = { table, op: "select", filters: [] };
      const chain: Chain = {
        select: () => chain,
        insert(values) {
          Object.assign(write, { op: "insert", values });
          return chain;
        },
        update(values) {
          Object.assign(write, { op: "update", values });
          return chain;
        },
        eq(column, value) {
          write.filters.push([column, value]);
          return chain;
        },
        is(column, value) {
          write.filters.push([column, value]);
          return chain;
        },
        async maybeSingle() {
          mocks.writes.push(write);
          return mocks.answers.shift() ?? { data: null, error: null };
        },
      };
      return chain;
    },
    rpc: mocks.rpc,
  }),
}));

const propertyId = "623efc8b-97d4-4902-ac43-406417498893";
const listingId = "0b7d4c1e-5f3a-4b8e-9c2d-1a6e8f4b3c27";
const draftRow = {
  data: {
    address_line: "12 Rue de la Gare",
    postal_code: "91360",
    city: "Épinay-sur-Orge",
    listing: null as { status: string } | null,
  },
  error: null,
};
const input = {
  propertyId,
  priceEuros: 239_000,
  title: "Appartement 3 pièces 68 m² · Épinay-sur-Orge",
  description: "  Traversant, au calme.  ",
};

beforeEach(() => {
  mocks.answers.length = 0;
  mocks.writes.length = 0;
  mocks.user = { email: "alice@exemple.test" };
  vi.clearAllMocks();
});

describe("saveListingDraft (step 3)", () => {
  it("creates the listing at the first save, with the price in cents", async () => {
    const { saveListingDraft } = await import("@/leenkey/properties/listing-actions");
    mocks.answers.push(
      draftRow,
      { data: null, error: null },
      { data: { id: listingId }, error: null },
    );
    const result = await saveListingDraft(input, "next");
    expect(result).toEqual({ ok: true, data: { complete: true } });
    expect(mocks.writes.map((write) => [write.table, write.op])).toEqual([
      ["properties", "select"],
      ["listings", "select"],
      ["listings", "insert"],
    ]);
    // reference, slug and status: set by listings_before_insert, never sent.
    expect(mocks.writes[2].values).toEqual({
      property_id: propertyId,
      title: input.title,
      description: "Traversant, au calme.",
      price_cents: 23_900_000,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/vendeur", "layout");
  });

  it("updates the listing afterwards, and again when a second tab created it", async () => {
    const { saveListingDraft } = await import("@/leenkey/properties/listing-actions");
    mocks.answers.push(
      draftRow,
      { data: { id: listingId }, error: null },
      {
        data: { id: listingId },
        error: null,
      },
    );
    expect(await saveListingDraft({ ...input, description: "" }, "save")).toEqual({
      ok: true,
      data: { complete: false },
    });
    expect(mocks.writes[2]).toMatchObject({ op: "update", filters: [["id", listingId]] });

    mocks.writes.length = 0;
    mocks.answers.push(
      draftRow,
      { data: null, error: null },
      { data: null, error: { code: "23505" } },
      { data: { id: listingId }, error: null },
      { data: { id: listingId }, error: null },
    );
    expect((await saveListingDraft(input, "save")).ok).toBe(true);
    expect(mocks.writes.map((write) => write.op)).toEqual([
      "select",
      "select",
      "insert",
      "select",
      "update",
    ]);
  });

  it("needs a price to save, and the description to go on", async () => {
    const { saveListingDraft } = await import("@/leenkey/properties/listing-actions");
    expect(await saveListingDraft({ ...input, priceEuros: null }, "save")).toEqual({
      ok: false,
      error: "incomplete",
      fieldErrors: { priceEuros: "required" },
    });
    expect(await saveListingDraft({ ...input, description: " " }, "next")).toEqual({
      ok: false,
      error: "incomplete",
      fieldErrors: { description: "required" },
    });
    expect(mocks.writes).toEqual([]);
  });

  it("says which field is refused, with its message key", async () => {
    const { saveListingDraft } = await import("@/leenkey/properties/listing-actions");
    const refused = await saveListingDraft(
      { ...input, priceEuros: 60_000_000, title: "ab", description: "x".repeat(1_201) },
      "save",
    );
    expect(refused).toEqual({
      ok: false,
      error: "invalid",
      fieldErrors: {
        priceEuros: "priceTooHigh",
        title: "titleLength",
        description: "descriptionLength",
      },
    });
    expect(await saveListingDraft({ ...input, priceEuros: 239_000.5 }, "save")).toMatchObject({
      fieldErrors: { priceEuros: "price" },
    });
    expect(await saveListingDraft(input, "publish")).toMatchObject({ error: "invalid" });
  });

  it("changes a listing sent, which stays as it is, always complete (L1-14b)", async () => {
    const { saveListingDraft } = await import("@/leenkey/properties/listing-actions");
    for (const status of ["pending", "published", "paused"]) {
      mocks.writes.length = 0;
      mocks.answers.push(
        { data: { ...draftRow.data, listing: { status } }, error: null },
        { data: { id: listingId }, error: null },
        { data: { id: listingId }, error: null },
      );
      expect(await saveListingDraft(input, "save"), status).toEqual({
        ok: true,
        data: { complete: true },
      });
      // Price, title and description only: never the status.
      expect(mocks.writes[2]).toMatchObject({
        table: "listings",
        op: "update",
        values: {
          price_cents: 23_900_000,
          title: input.title,
          description: "Traversant, au calme.",
        },
      });
    }
    mocks.answers.push({
      data: { ...draftRow.data, listing: { status: "published" } },
      error: null,
    });
    expect(await saveListingDraft({ ...input, description: " " }, "save")).toEqual({
      ok: false,
      error: "incomplete",
      fieldErrors: { description: "required" },
    });
  });

  it("changes nothing once suspended or sold, nor when nothing is written", async () => {
    const { saveListingDraft } = await import("@/leenkey/properties/listing-actions");
    for (const status of ["suspended", "sold"]) {
      mocks.writes.length = 0;
      mocks.answers.push({ data: { ...draftRow.data, listing: { status } }, error: null });
      expect(await saveListingDraft(input, "save"), status).toEqual({
        ok: false,
        error: "not_found",
      });
      expect(mocks.writes).toHaveLength(1);
    }

    // Suspended in the meantime: the RLS of the update leaves no row.
    mocks.answers.push(
      draftRow,
      { data: { id: listingId }, error: null },
      { data: null, error: null },
    );
    expect(await saveListingDraft(input, "save")).toEqual({ ok: false, error: "not_found" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("submitListing (step 4)", () => {
  const listingRow = {
    data: {
      id: listingId,
      reference: "LK-0042",
      title: input.title,
      description: "Traversant, au calme.",
      price_cents: 23_900_000,
      property: {
        type: "appartement",
        surface_m2: 68,
        rooms: 3,
        city: "Épinay-sur-Orge",
        postal_code: "91360",
      },
    },
    error: null,
  };

  it("sends the listing for review, then the emails after the answer", async () => {
    const { submitListing } = await import("@/leenkey/properties/listing-actions");
    mocks.answers.push(draftRow, listingRow);
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    expect(await submitListing({ propertyId })).toEqual({ ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith("listing_submit", { p_listing_id: listingId });
    expect(mocks.emailListingSubmitted).not.toHaveBeenCalled();
    expect(mocks.after).toHaveBeenCalledTimes(1);
    await mocks.after.mock.calls[0][0]();
    expect(mocks.emailListingSubmitted).toHaveBeenCalledWith({
      propertyId,
      listingId,
      reference: "LK-0042",
      title: input.title,
      seller: { email: "alice@exemple.test", firstName: "Alice" },
    });
  });

  it("asks for the missing step before the call", async () => {
    const { submitListing } = await import("@/leenkey/properties/listing-actions");
    mocks.answers.push(draftRow, { data: null, error: null });
    expect(await submitListing({ propertyId })).toEqual({ ok: false, error: "listing" });
    mocks.answers.push(draftRow, {
      ...listingRow,
      data: { ...listingRow.data, property: { ...listingRow.data.property, rooms: null } },
    });
    expect(await submitListing({ propertyId })).toEqual({ ok: false, error: "characteristics" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("reads a refused transition as a listing already sent", async () => {
    const { submitListing } = await import("@/leenkey/properties/listing-actions");
    mocks.answers.push(draftRow, listingRow);
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "22023" } });
    expect(await submitListing({ propertyId })).toEqual({ ok: false, error: "not_found" });
    mocks.answers.push(draftRow, listingRow);
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "57014" } });
    expect(await submitListing({ propertyId })).toEqual({ ok: false, error: "unavailable" });
    expect(mocks.after).not.toHaveBeenCalled();
    expect(await submitListing({ propertyId: "pas-un-id" })).toEqual({
      ok: false,
      error: "invalid",
    });
  });
});

describe("emails of the sending", () => {
  const listing = {
    propertyId,
    listingId,
    reference: "LK-0042",
    title: "Appartement 3 pièces 68 m² · Épinay-sur-Orge",
    seller: { email: "alice@exemple.test", firstName: "Alice" },
  };
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("« Annonce reçue » to the seller: the title and the 24 h", async () => {
    const html = await render(
      ListingReceivedEmail({
        firstName: "Alice",
        title: listing.title,
        sellerUrl: "https://leenkey.fr/vendeur",
        siteUrl: "https://leenkey.fr",
      }),
    );
    expect(listingReceivedSubject("LK-0042")).toBe("Votre annonce est bien reçue (LK-0042)");
    expect(html).toContain("Bonjour Alice,");
    expect(html).toContain(`« ${listing.title} »`);
    expect(html).toContain("sous 24 h");
    expect(html).toContain("https://leenkey.fr/vendeur");
    expect(html).toContain("Gérer mes notifications");
  });

  it("« Annonce à valider » to Leenkey: an internal notification", async () => {
    const text = await render(
      ListingToReviewEmail({
        title: listing.title,
        reference: "LK-0042",
        place: "Épinay-sur-Orge (91360)",
        price: "239 000 €",
        sellerName: null,
        adminUrl: `https://leenkey.fr/admin/annonces/${listingId}`,
        siteUrl: "https://leenkey.fr",
      }),
      EMAIL_PLAIN_TEXT,
    );
    expect(listingToReviewSubject("LK-0042")).toBe("Annonce à valider (LK-0042)");
    expect(text).toContain("LK-0042 · Épinay-sur-Orge (91360) · 239 000 €");
    expect(text).toContain(`https://leenkey.fr/admin/annonces/${listingId}`);
    expect(text).toContain("Notification interne du back office de Leenkey.");
    expect(text).not.toContain("Gérer mes notifications");
  });

  it("sends « Annonce reçue » to the seller only: Leenkey hears of it through the cron", async () => {
    const { emailListingSubmitted } = await vi.importActual<
      typeof import("@/leenkey/properties/listing-emails")
    >("@/leenkey/properties/listing-emails");
    process.env.ADMIN_NOTIFICATION_EMAIL = "admin@exemple.test";
    mocks.sendEmail.mockResolvedValue("sent");
    expect(await emailListingSubmitted(listing)).toBe("sent");
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    const [email] = mocks.sendEmail.mock.calls[0];
    expect([email.to, email.subject]).toEqual([
      "alice@exemple.test",
      "Votre annonce est bien reçue (LK-0042)",
    ]);
    // The seller follows the review from the page of the property (L1-14).
    expect(email.text).toContain(`https://leenkey.fr/vendeur/biens/${propertyId}`);
  });

  it("a failure is written to the log, never thrown", async () => {
    const { emailListingSubmitted } = await vi.importActual<
      typeof import("@/leenkey/properties/listing-emails")
    >("@/leenkey/properties/listing-emails");
    mocks.sendEmail.mockRejectedValueOnce(new Error("Resend down"));
    expect(await emailListingSubmitted(listing)).toBe("failed");
    expect(
      await emailListingSubmitted({ ...listing, seller: { email: null, firstName: null } }),
    ).toBe("failed");
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });
});
