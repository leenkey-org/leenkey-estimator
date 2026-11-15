import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { EMPTY_SEARCH_REQUEST, SEARCH_CASES } from "../../fixtures/search-requests";

// L2-06: the assistant of the buyer. The acceptance criterion of SPEC-V2
// section 23 (ten searches in the words of a buyer become the right filters:
// here from what the model writes down, in tests/eval against the real
// model), the file of the buyer given to the model, the listings shown in
// the conversation, the tools prefill_offer and create_case (what the buyer
// reads before confirming, what the model reads of a refusal), the prompt.
// The SQL is tested in supabase/tests/rls_ai_prefill_offer.sql, the screens
// in tests/e2e/buyer-assistant-live.spec.ts.

const mocks = vi.hoisted(() => ({
  listing: null as Record<string, unknown> | null,
  access: { state: "open", inProgress: false } as Record<string, unknown>,
  draft: null as { priceCents: number | null } | null,
  readable: true,
  rpc: [] as { name: string; args: Record<string, unknown> }[],
  rpcResult: { data: "offer-1", error: null } as {
    data: string | null;
    error: { code: string; message?: string } | null;
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async (name: string, args: Record<string, unknown>) => {
      mocks.rpc.push({ name, args });
      return mocks.rpcResult;
    },
  }),
}));
vi.mock("@/leenkey/offers/queries", () => ({
  offerListing: async () =>
    mocks.readable ? { ok: true, data: mocks.listing } : { ok: false, error: "unavailable" },
  offerAccess: async () => ({ ok: true, data: mocks.access }),
  buyerDraft: async () => ({ ok: true, data: mocks.draft }),
  buyerOffers: async () => ({ ok: true, data: [] }),
}));
vi.mock("@/leenkey/search/queries", () => ({
  searchListings: async () => ({ ok: true, data: { items: [], total: 0 } }),
  withCovers: async (items: unknown[]) => items,
}));
vi.mock("@/leenkey/buyers/queries", () => ({
  buyerProfile: async () => ({ ok: true, data: null }),
}));
vi.mock("@/leenkey/billing/entitlements", () => ({ hasEntitlement: async () => false }));
vi.mock("@/leenkey/ai/seller-data", () => ({
  sellerPropertyById: async () => ({ ok: true, data: null }),
  PROPERTY_NOT_FOUND: "No property of this seller has this id. Call get_my_properties.",
}));
vi.mock("@/leenkey/properties/sheet", () => ({ propertyName: () => "Maison" }));

const {
  appliedCriteria,
  placeOf,
  searchParamsOf,
  searchQueryOf,
  searchRequest,
  searchRequestSchema,
} = await import("@/leenkey/ai/search-request");
const { assistantPageContext } = await import("@/leenkey/ai/page-context");
const { shownListings } = await import("@/leenkey/ai/shown");
const { buyerContextText } = await import("@/leenkey/ai/context");
const { actionHref, isFailure } = await import("@/leenkey/ai/queries");
const { actionPreview } = await import("@/leenkey/ai/previews");
const { mockSearchRequest } = await import("@/leenkey/ai/mock");
const { toolsFor } = await import("@/leenkey/ai/tools");
const { searchListingsTool } = await import("@/leenkey/ai/tools/search-listings");
const { prefillOfferTool, OFFER_ACCEPTED, OFFER_CLOSED, OFFER_UNDECLARED } =
  await import("@/leenkey/ai/tools/prefill-offer");
const { createBuyerCaseTool } = await import("@/leenkey/ai/tools/create-case");
const { LISTING_NOT_FOUND } = await import("@/leenkey/ai/tools/get-listing-public");
const { displayItems } = await import("@/core/ai/conversation");
const { runTurn } = await import("@/core/ai/chat");
const { promptFile } = await import("@/core/ai/prompts");
const { SearchFilters, parseSearchParams } = await import("@/lib/validations/search");
const { fr } = await import("@/lib/i18n/fr");

const LISTING = "5eed2000-0000-4000-8000-000000000001";
const ctx = { profileId: "buyer-c", roles: ["buyer"], context: "buyer" as const, stepCode: null };

beforeEach(() => {
  mocks.listing = {
    id: LISTING,
    slug: "appartement-3-pieces-savigny",
    title: "Appartement 3 pièces, centre",
    city: "Savigny-sur-Orge",
    askingPriceCents: 30_000_000,
  };
  mocks.access = { state: "open", inProgress: false };
  mocks.draft = null;
  mocks.readable = true;
  mocks.rpc = [];
  mocks.rpcResult = { data: "offer-1", error: null };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("a search in the words of a buyer (SPEC-V2 23, L2-06: 10 requests)", () => {
  it("has ten requests, each one different", () => {
    expect(SEARCH_CASES).toHaveLength(10);
    expect(new Set(SEARCH_CASES.map((item) => item.params)).size).toBe(10);
  });

  it.each(SEARCH_CASES.map((item) => [item.ask, item] as const))("%s", (_ask, item) => {
    expect(searchRequest.safeParse(item.request).success).toBe(true);
    const query = searchQueryOf(item.request);
    expect(query.filters).toEqual(item.filters);
    expect(query.sort).toBe(item.sort);
    expect(query.page).toBe(1);
    // A search the page of the site shows as it is: its address read back gives the same.
    expect(searchParamsOf(query)).toBe(item.params);
    expect(parseSearchParams(new URLSearchParams(item.params))).toEqual(query);
    expect(SearchFilters.safeParse(query.filters).success).toBe(true);
  });

  it("no criterion: every listing, the most recent first", () => {
    const query = searchQueryOf(EMPTY_SEARCH_REQUEST);
    expect(query).toEqual({ filters: {}, sort: "recent", page: 1 });
    expect(searchParamsOf(query)).toBe("");
    expect(appliedCriteria(query)).toEqual({ sort: "recent" });
  });

  it("whatever the model writes, the search is one the site can show", () => {
    const query = searchQueryOf({
      ...EMPTY_SEARCH_REQUEST,
      // A commune named loosely, a radius the site does not have, limits upside down.
      location: "  savigny ",
      radiusKm: 7,
      budgetMinEuros: 400_000,
      budgetMaxEuros: 250_000,
      surfaceMinM2: 200,
      surfaceMaxM2: 80,
      roomsMin: 99,
      outdoor: ["jardin", "jardin"],
    });
    expect(query.filters).toEqual({
      location: "savigny-sur-orge",
      priceMinCents: 25_000_000,
      priceMaxCents: 40_000_000,
      surfaceMin: 80,
      surfaceMax: 200,
      outdoor: ["jardin"],
    });
    expect(SearchFilters.safeParse(query.filters).success).toBe(true);
    // A radius without a place asks for nothing.
    expect(searchQueryOf({ ...EMPTY_SEARCH_REQUEST, radiusKm: 10 }).filters).toEqual({});
  });

  it("a commune outside the launch zone is searched alone, and the model is told", () => {
    const query = searchQueryOf({ ...EMPTY_SEARCH_REQUEST, location: "Versailles", radiusKm: 10 });
    expect(query.filters).toEqual({ location: "versailles", radiusKm: 10 });
    const applied = appliedCriteria(query);
    expect(applied.place).toBe("Versailles");
    expect(applied.radiusKm).toBeUndefined();
    expect(applied.radiusNote).toMatch(/No radius applied/);
    const inZone = searchQueryOf({ ...EMPTY_SEARCH_REQUEST, location: "Grigny", radiusKm: 5 });
    expect(appliedCriteria(inZone)).toMatchObject({ place: "Grigny", radiusKm: 5 });
  });

  it("a department or a region is no place of a search: dropped, and the model is told", () => {
    // « 91 » would otherwise be the first commune whose postal code starts with it.
    expect(placeOf("91")).toBeUndefined();
    expect(placeOf(" 9 1 ")).toBeUndefined();
    expect(placeOf("913600")).toBeUndefined();
    expect(placeOf("91360")).toBe("91360");
    expect(placeOf("Savigny")).toBe("savigny-sur-orge");
    expect(placeOf("")).toBeUndefined();
    const request = { ...EMPTY_SEARCH_REQUEST, location: "91", radiusKm: 10, roomsMin: 3 };
    const query = searchQueryOf(request);
    expect(query.filters).toEqual({ roomsMin: 3 });
    const applied = appliedCriteria(query, request);
    expect(applied.place).toBeUndefined();
    expect(applied.placeNote).toMatch(/takes a commune or a 5-digit postal code/);
    // Nothing said when no place was asked for, nor when the place is searched.
    expect(appliedCriteria(searchQueryOf(EMPTY_SEARCH_REQUEST), EMPTY_SEARCH_REQUEST)).toEqual({
      sort: "recent",
    });
    const savigny = { ...EMPTY_SEARCH_REQUEST, location: "Savigny-sur-Orge" };
    expect(appliedCriteria(searchQueryOf(savigny), savigny).placeNote).toBeUndefined();
  });

  it("the schema given to the model names the fields of Zod, all required, nothing optional", () => {
    const fields = Object.keys(searchRequest.shape).sort();
    expect(Object.keys(searchRequestSchema.properties).sort()).toEqual(fields);
    expect([...searchRequestSchema.required].sort()).toEqual(fields);
    expect(searchRequestSchema.additionalProperties).toBe(false);
    // Strict schemas take no numerical nor string constraint (Anthropic API).
    expect(JSON.stringify(searchRequestSchema)).not.toMatch(
      /"(minimum|maximum|minLength|maxLength)"/,
    );
    // No empty string among the choices of a closed list: « any » says « none ».
    for (const field of ["propertyType", "dpeMax", "sort"] as const) {
      const choices = (searchRequestSchema.properties[field] as { enum: string[] }).enum;
      expect(choices, field).not.toContain("");
      expect(searchRequest.shape[field].options, field).toEqual(choices);
    }
  });

  it("the model of the tests reads a few fixed turns of phrase", () => {
    expect(
      searchQueryOf(
        searchRequest.parse(
          mockSearchRequest("Je cherche un appartement de 3 pièces à Savigny-sur-Orge"),
        ),
      ).filters,
    ).toEqual({ location: "savigny-sur-orge", type: "appartement", roomsMin: 3 });
    expect(
      searchQueryOf(searchRequest.parse(mockSearchRequest("Je cherche une maison à 250 000 €")))
        .filters,
    ).toEqual({ type: "maison", priceMaxCents: 25_000_000 });
  });
});

describe("search_listings", () => {
  it("shows nothing for an empty search, and reads its result back for the cards", async () => {
    const empty = await searchListingsTool.execute(EMPTY_SEARCH_REQUEST, ctx);
    expect(empty).toMatchObject({ total: 0, listings: [], search: "" });
    expect(searchListingsTool.show?.(empty)).toBeNull();
    expect(searchListingsTool.show?.({ error: "unavailable" })).toBeNull();
    const shown = searchListingsTool.show?.({
      total: 12,
      applied: {},
      search: "ville=grigny",
      listings: [
        {
          listingId: LISTING,
          slug: "maison-grigny",
          title: "Maison familiale",
          type: "maison",
          place: "Grigny",
          postalCode: "91350",
          priceEuros: 320_000,
          livingAreaM2: 104,
          rooms: 5,
          bedrooms: 3,
          dpeClass: "C",
          features: ["jardin"],
          publishedOn: "2026-11-10",
          cover: null,
        },
      ],
    });
    expect(shown).toEqual({
      kind: "listings",
      total: 12,
      search: "ville=grigny",
      items: [
        {
          slug: "maison-grigny",
          title: "Maison familiale",
          place: "Grigny",
          type: "maison",
          priceCents: 32_000_000,
          surfaceM2: 104,
          rooms: 5,
          cover: null,
        },
      ],
    });
  });

  it("what is shown is checked: never an address taken as written in the log", () => {
    const item = {
      slug: "maison-grigny",
      title: "Maison",
      place: "Grigny",
      type: "maison",
      priceCents: 100,
      surfaceM2: 90,
      rooms: 4,
      cover: null,
    };
    const listings = (items: unknown[]) => ({ kind: "listings", total: 1, search: "", items });
    expect(shownListings.safeParse(listings([item])).success).toBe(true);
    for (const slug of ["../admin", "https://evil.test", "a b", "Maison"]) {
      expect(shownListings.safeParse(listings([{ ...item, slug }])).success, slug).toBe(false);
    }
    for (const cover of ["https://evil.test/x.webp", "../../secret", "abc/def"]) {
      expect(shownListings.safeParse(listings([{ ...item, cover }])).success, cover).toBe(false);
    }
    expect(
      shownListings.safeParse(
        listings([
          {
            ...item,
            cover: "5eed1000-0000-4000-8000-000000000001/5eed3000-0000-4000-8000-000000000002",
          },
        ]),
      ).success,
    ).toBe(true);
    expect(shownListings.safeParse(listings(Array(6).fill(item))).success).toBe(false);
  });
});

describe("the conversation shows what a search found", () => {
  const user = (text: string) => ({ role: "user", content: { type: "user", text, context: null } });
  const answer = (blocks: unknown[], stopReason = "end_turn") => ({
    role: "assistant",
    content: { type: "assistant", blocks, stopReason },
  });
  const use = (id: string, name: string) => ({ type: "tool_use", id, name, input: {} });
  const done = (id: string, name: string, status = "done") => ({
    role: "tool",
    content: { type: "tool_result", tool_use_id: id, name, status, result: { total: 2 } },
  });

  it("a tool that shows its result has a line of its own, once it ran", () => {
    const rows = [
      user("Je cherche une maison"),
      answer([use("a", "search_listings"), use("b", "get_listing_public")], "tool_use"),
      done("a", "search_listings"),
      done("b", "get_listing_public"),
      answer([{ type: "text", text: "Deux biens." }]),
      user("Encore"),
      answer([use("c", "search_listings")], "tool_use"),
      done("c", "search_listings", "error"),
    ];
    const items = displayItems(
      rows,
      () => false,
      (name) => name === "search_listings",
    );
    expect(items).toEqual([
      { kind: "user", text: "Je cherche une maison" },
      { kind: "result", toolCallId: "a", name: "search_listings", result: { total: 2 } },
      { kind: "assistant", text: "Deux biens." },
      { kind: "user", text: "Encore" },
    ]);
    // Without the third argument, as before L2-06: the tools that read stay out of sight.
    expect(displayItems(rows, () => false).some((item) => item.kind === "result")).toBe(false);
  });

  it("a turn tells the browser what a tool shows, after its result is logged", async () => {
    const events: unknown[] = [];
    const logged: string[] = [];
    const reply = (content: unknown[], stop: string) =>
      ({ content, stop_reason: stop, model: "mock", usage: {} }) as never;
    let step = 0;
    await runTurn({
      model: "mock",
      callModel: async () => {
        step += 1;
        return step === 1
          ? reply([{ type: "tool_use", id: "t1", name: "find", input: { id: "x" } }], "tool_use")
          : reply([{ type: "text", text: "Voici." }], "end_turn");
      },
      system: "",
      tools: [
        {
          name: "find",
          description: "Finds.",
          input: z.object({ id: z.string() }),
          requiresConfirmation: false,
          contexts: ["buyer"],
          execute: async () => ({ found: 3 }),
          show: (output: unknown) => ({ cards: output }),
        },
      ],
      messages: [{ role: "user", content: "Cherche" }],
      ctx,
      log: {
        answer: async () => true,
        result: async (result) => {
          logged.push(result.tool_use_id);
          return true;
        },
      },
      emit: (event) => events.push(event),
    });
    expect(logged).toEqual(["t1"]);
    expect(events).toEqual([
      { type: "tool", name: "find" },
      { type: "shown", toolCallId: "t1", name: "find", data: { cards: { found: 3 } } },
      { type: "done", reason: "end" },
    ]);
  });
});

describe("the file of the buyer given to the model", () => {
  const now = new Date("2026-11-16T09:00:00Z");
  const offer = {
    offerId: "o1",
    reference: "LK-2026-00012",
    listingId: LISTING,
    listingTitle: "Appartement 3 pièces",
    city: "Savigny-sur-Orge",
    status: "Acceptée",
    priceEuros: 285_000,
    sentOn: "2026-11-02",
    validUntil: "2026-11-07",
    precontractSignedOn: null,
    withdrawalStart: null,
    withdrawalEnd: null,
  };
  const project = {
    kind: "residence_principale" as const,
    cities: ["Savigny-sur-Orge", "Morangis"],
    budgetMaxEuros: 320_000,
    financing: "Justificatif fourni",
    declared: true,
    financingCheckedOn: null,
  };

  it("an account that has not said its project yet", () => {
    const text = buyerContextText({
      firstName: null,
      now,
      file: { project: null, offers: [], offersTotal: 0, listing: null },
    });
    expect(text.startsWith("<dossier>")).toBe(true);
    expect(text.endsWith("</dossier>")).toBe(true);
    expect(text).toContain("Prénom : non renseigné.");
    expect(text).toContain("Projet d'achat : non renseigné.");
    expect(text).toContain("Offres d'achat : aucune.");
    expect(text).not.toContain("Annonce consultée");
  });

  it("the project, the status of the financing file, the offers, the listing being read", () => {
    const text = buyerContextText({
      firstName: "Chloé",
      now,
      file: {
        project,
        offers: [offer],
        offersTotal: 1,
        listing: { listingId: LISTING, title: "Maison <b>", city: "Grigny", priceEuros: 310_000 },
      },
    });
    expect(text).toContain("lundi 16 novembre 2026");
    expect(text).toContain(
      "Projet d'achat : résidence principale ; villes recherchées : Savigny-sur-Orge, Morangis ; budget maximum déclaré : 320\u202F000 €.",
    );
    expect(text).toContain("Dossier de financement : Justificatif fourni.");
    expect(text).toContain(
      `Offre LK-2026-00012 sur l'annonce ${LISTING} (« Appartement 3 pièces », Savigny-sur-Orge) : Acceptée, 285\u202F000 €, envoyée le 2026-11-02, valable jusqu'au 2026-11-07.`,
    );
    // What a seller typed is data: no tag of its own in the file.
    expect(text).toContain(`Annonce consultée en ce moment : ${LISTING} (« Maison b »`);
    // Never a wording the editorial rules forbid.
    expect(text).not.toMatch(/financement validé|peut financer/i);
  });

  it("the withdrawal period only from the day recorded in the file (SPEC-V2 12)", () => {
    const signed = { ...offer, precontractSignedOn: "2026-11-10" };
    const without = buyerContextText({
      firstName: "Chloé",
      now,
      file: { project, offers: [signed], offersTotal: 1, listing: null },
    });
    expect(without).toContain("Avant-contrat signé le 2026-11-10.");
    expect(without).toContain("date de départ non enregistrée dans le dossier");
    const recorded = buyerContextText({
      firstName: "Chloé",
      now,
      file: {
        project,
        offers: [{ ...signed, withdrawalStart: "2026-11-12", withdrawalEnd: "2026-11-23" }],
        offersTotal: 3,
        listing: null,
      },
    });
    expect(recorded).toContain(
      "départ enregistré le 2026-11-12, fin indicative le 2026-11-23 (le notaire fait foi)",
    );
    expect(recorded).toContain("Offres d'achat : 3 (les 1 plus récentes ci-dessous).");
  });
});

describe("prefill_offer", () => {
  const input = { listingId: LISTING, priceEuros: 285_000 };
  const call = { conversationId: "conv-1", toolUseId: "toolu_1", name: "prefill_offer" };

  it("the buyer reads the price of the listing, their price and the gap before confirming", async () => {
    const preview = await prefillOfferTool.preview?.(input, ctx);
    expect(preview).toEqual({
      ok: true,
      data: {
        kind: "offer_prefill",
        listingId: LISTING,
        listingTitle: "Appartement 3 pièces, centre",
        city: "Savigny-sur-Orge",
        askingEuros: 300_000,
        priceEuros: 285_000,
        gapPercent: -5,
        draftPriceEuros: null,
      },
    });
    expect(preview?.ok && actionPreview.safeParse(preview.data).success).toBe(true);
    // A draft with another price: said, it will be replaced.
    mocks.draft = { priceCents: 27_000_000 };
    const again = await prefillOfferTool.preview?.(input, ctx);
    expect(again?.ok && again.data.draftPriceEuros).toBe(270_000);
  });

  it("refused before anything is shown: no listing, no project, an offer accepted, a closed listing", async () => {
    mocks.listing = null;
    expect(await prefillOfferTool.preview?.(input, ctx)).toEqual({
      ok: false,
      error: LISTING_NOT_FOUND,
    });
    mocks.listing = { title: "Maison", city: "Grigny", askingPriceCents: 100 };
    mocks.access = { state: "undeclared" };
    expect(await prefillOfferTool.preview?.(input, ctx)).toEqual({
      ok: false,
      error: OFFER_UNDECLARED,
    });
    mocks.access = { state: "accepted", offerId: "o1" };
    expect(await prefillOfferTool.preview?.(input, ctx)).toEqual({
      ok: false,
      error: OFFER_ACCEPTED,
    });
    mocks.access = { state: "closed" };
    expect(await prefillOfferTool.preview?.(input, ctx)).toEqual({
      ok: false,
      error: OFFER_CLOSED,
    });
    mocks.readable = false;
    expect((await prefillOfferTool.preview?.(input, ctx))?.ok).toBe(false);
    expect(mocks.rpc).toEqual([]);
  });

  it("writes only once confirmed, the price in cents, through the function of the buyer", async () => {
    expect(await prefillOfferTool.execute(input, ctx)).toMatchObject({ prefilled: false });
    expect(mocks.rpc).toEqual([]);
    expect(await prefillOfferTool.execute(input, { ...ctx, call })).toEqual({
      prefilled: true,
      offerId: "offer-1",
    });
    expect(mocks.rpc).toEqual([
      {
        name: "ai_prefill_offer",
        args: {
          p_conversation_id: "conv-1",
          p_tool_use_id: "toolu_1",
          p_tool_name: "prefill_offer",
          p_listing_id: LISTING,
          p_price_cents: 28_500_000,
        },
      },
    ]);
  });

  it("a call already answered, a listing closed meanwhile, a failure: nothing is said done", async () => {
    mocks.rpcResult = {
      data: null,
      error: {
        code: "23505",
        message: 'duplicate key value violates unique constraint "ai_messages_tool_result_idx"',
      },
    };
    expect(await prefillOfferTool.execute(input, { ...ctx, call })).toEqual({
      prefilled: false,
      answered: true,
    });
    // Another duplicate (a draft the form created at the same moment): a failure, not « answered ».
    mocks.rpcResult = {
      data: null,
      error: {
        code: "23505",
        message: 'duplicate key value violates unique constraint "offers_one_draft_idx"',
      },
    };
    const raced = await prefillOfferTool.execute(input, { ...ctx, call });
    expect(raced).toMatchObject({ prefilled: false });
    expect("answered" in raced).toBe(false);
    expect(isFailure(raced)).toBe(true);
    mocks.rpcResult = { data: null, error: { code: "42501", message: "refused" } };
    const closed = await prefillOfferTool.execute(input, { ...ctx, call });
    expect(closed).toEqual({ prefilled: false, error: OFFER_CLOSED });
    expect(isFailure(closed)).toBe(true);
    mocks.rpcResult = { data: null, error: { code: "XX000", message: "boom" } };
    expect(isFailure(await prefillOfferTool.execute(input, { ...ctx, call }))).toBe(true);
    expect(isFailure({ prefilled: true, offerId: "o" })).toBe(false);
  });

  it("a price in whole euros, a listing by its id; nothing else can be filled", () => {
    const parse = (value: unknown) => prefillOfferTool.input.safeParse(value).success;
    expect(parse(input)).toBe(true);
    expect(parse({ ...input, priceEuros: 285_000.5 })).toBe(false);
    expect(parse({ ...input, priceEuros: 0 })).toBe(false);
    expect(parse({ ...input, listingId: "1" })).toBe(false);
    expect(Object.keys(prefillOfferTool.inputSchema?.properties ?? {}).sort()).toEqual([
      "listingId",
      "priceEuros",
    ]);
  });

  it("once confirmed, the conversation leads to the form of the offer", () => {
    expect(actionHref("prefill_offer", { listingId: LISTING })).toBe(
      `/offres/nouvelle?listing=${LISTING}`,
    );
    expect(actionHref("prefill_offer", { listingId: "../admin" })).toBeUndefined();
    expect(actionHref("create_case", { listingId: LISTING })).toBeUndefined();
  });
});

describe("create_case for a buyer", () => {
  const input = { subject: "Annonce trompeuse", summary: "La surface annoncée ne correspond pas." };
  const call = { conversationId: "conv-1", toolUseId: "toolu_2", name: "create_case" };

  it("a request about no property, read before it leaves, sent once confirmed", async () => {
    expect(await createBuyerCaseTool.preview?.(input, ctx)).toEqual({
      ok: true,
      data: { kind: "case_request", propertyName: null, ...input },
    });
    expect(await createBuyerCaseTool.execute(input, ctx)).toMatchObject({ sent: false });
    expect(mocks.rpc).toEqual([]);
    mocks.rpcResult = { data: "case-9", error: null };
    expect(await createBuyerCaseTool.execute(input, { ...ctx, call })).toEqual({
      sent: true,
      caseId: "case-9",
    });
    expect(mocks.rpc[0]).toEqual({
      name: "ai_create_case",
      args: {
        p_conversation_id: "conv-1",
        p_tool_use_id: "toolu_2",
        p_tool_name: "create_case",
        p_subject: input.subject,
        p_summary: input.summary,
        p_property: undefined,
      },
    });
  });

  it("the tool of the buyer takes no property: never a case on the property of someone else", () => {
    expect(createBuyerCaseTool.contexts).toEqual(["buyer"]);
    expect(Object.keys(createBuyerCaseTool.inputSchema?.properties ?? {}).sort()).toEqual([
      "subject",
      "summary",
    ]);
    const mine = toolsFor("buyer").find((item) => item.name === "create_case");
    expect(mine).toBe(createBuyerCaseTool);
  });
});

describe("which assistant the page /assistant opens", () => {
  const none = { listing: false, buyer: false };

  it("an account that only buys, or only sells: its own", () => {
    expect(assistantPageContext(["buyer"], none)).toBe("buyer");
    expect(assistantPageContext(["seller"], none)).toBe("seller");
    // A seller who is not a buyer keeps the seller's, whatever the address asks.
    expect(assistantPageContext(["seller"], { listing: true, buyer: true })).toBe("seller");
  });

  it("an account that sells and buys: the seller's, the buyer's when the address asks", () => {
    const both = ["seller", "buyer"];
    expect(assistantPageContext(both, none)).toBe("seller");
    expect(assistantPageContext(both, { listing: true, buyer: false })).toBe("buyer");
    expect(assistantPageContext(both, { listing: false, buyer: true })).toBe("buyer");
  });

  it("neither role (an admin alone): no assistant on this page", () => {
    expect(assistantPageContext(["admin"], { listing: true, buyer: true })).toBeNull();
    expect(assistantPageContext([], none)).toBeNull();
    expect(assistantPageContext(["admin", "buyer"], none)).toBe("buyer");
  });
});

describe("the prompt and the texts of the buyer", () => {
  it("names every tool offered to the model, and none of the seller", () => {
    const buyer = promptFile("buyer");
    for (const item of toolsFor("buyer")) expect(buyer).toContain(`\`${item.name}\``);
    for (const item of toolsFor("seller")) {
      if (item.name !== "create_case") expect(buyer).not.toContain(`\`${item.name}\``);
    }
  });

  it("keeps the rules of the client (CLAUDE.md 16, SPEC-V2 13)", () => {
    const buyer = promptFile("buyer");
    expect(buyer).not.toMatch(/\bon\s+(vous|peut|va|est)\b/i);
    expect(buyer).not.toMatch(/prix ferme|au succès|estimation/i);
    // The status of a financing file is never a guarantee: said to the model.
    expect(buyer).toContain("ne dis jamais qu'un financement est validé");
    expect(buyer).toContain("sous 48 h, 7 j/7");
    const texts = JSON.stringify(fr.assistant.buyer) + JSON.stringify(fr.assistant.action.offer);
    expect(texts).not.toMatch(/financement validé|prix ferme|estimation|\bon\s+(vous|peut)\b/i);
    // Preparing an offer never reads as sending it.
    expect(fr.assistant.action.offer.note).toContain("Rien n'est envoyé au vendeur");
  });
});
