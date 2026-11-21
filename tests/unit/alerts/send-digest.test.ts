import { beforeEach, describe, expect, it, vi } from "vitest";

// L3-06 (SPEC-V2 16): the daily run as it sends, with a client that keeps
// the alerts in memory. One email per buyer; a failed send gives the alerts
// their dates back; a second run sends nothing more; a listing of the
// buyer's own is never told; a claim that fails dates nothing; a search that
// fails stops only its alert; the similar listings leave once.

type Row = Record<string, unknown>;
type StoredAlert = {
  id: string;
  buyerId: string;
  name: string;
  criteria: Row;
  createdAt: string;
  lastSentAt: string | null;
};

const state = vi.hoisted(() => ({
  alerts: [] as StoredAlert[],
  /** The listings online, by the commune asked (the `city` of the SQL filters). */
  listings: {} as Record<string, Row[]>,
  /** Ids of the listings of the properties of the buyer. */
  own: [] as string[],
  similarQueue: [] as Row[],
  similarSent: [] as string[],
  claimError: false,
  claims: 0,
  delivery: "logged" as "logged" | "failed",
  emails: [] as { to: string; subject: string; html: string; idempotencyKey?: string }[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/core/notifications/email", () => ({
  sendEmail: async (email: { to: string; subject: string; html: string }) => {
    state.emails.push(email);
    return state.delivery;
  },
}));

const { sendAlertDigests } = await import("@/leenkey/alerts/send-digest");

const BUYER_C = "00000000-0000-4000-a000-00000000000c";
const BUYER_D = "00000000-0000-4000-a000-00000000000d";
const NOW = new Date("2026-11-21T05:00:00.000Z");
const YESTERDAY = "2026-11-20T05:00:00+00:00";

const listing = (id: string, publishedAt: string, more: Row = {}): Row => ({
  id,
  slug: `bien-${id}`,
  reference: `LK-${id}`,
  title: `Bien ${id}`,
  price_cents: 30_000_000,
  published_at: publishedAt,
  type: "maison",
  city: "Savigny-sur-Orge",
  postal_code: "91600",
  surface_m2: 90,
  rooms: 4,
  total_count: 1,
  ...more,
});

const alert = (id: string, city: string, more: Partial<StoredAlert> = {}): StoredAlert => ({
  id,
  buyerId: BUYER_C,
  name: `Alerte ${id}`,
  criteria: { location: city },
  createdAt: "2026-11-01T00:00:00+00:00",
  lastSentAt: YESTERDAY,
  ...more,
});

const similarKey = (row: Row) => `${String(row.buyer_id)}/${String(row.listing_id)}`;

const client = {
  rpc: async (name: string, args: Row = {}) => {
    if (name === "alert_digest_queue") {
      return {
        data: state.alerts.map((item) => ({
          alert_id: item.id,
          buyer_id: item.buyerId,
          name: item.name,
          criteria: item.criteria,
          last_sent_at: item.lastSentAt,
          since: item.lastSentAt ?? item.createdAt,
          email: `${item.buyerId}@exemple.test`,
          first_name: "Chloé",
        })),
        error: null,
      };
    }
    if (name === "search_listings") {
      const city = String((args.p_filters as Row).city);
      if (city === "panne") return { data: null, error: { code: "57014", message: "timeout" } };
      return { data: state.listings[city] ?? [], error: null };
    }
    if (name === "alert_digest_claim" || name === "alert_digest_release") {
      const ids = args.p_alert_ids as string[];
      const read = args.p_read as (string | null)[];
      const claimedAt = String(args.p_claimed_at);
      const rows = ids.map((id) => state.alerts.find((item) => item.id === id));
      if (name === "alert_digest_claim") {
        state.claims += 1;
        if (state.claimError) return { data: null, error: { code: "40001", message: "retry" } };
        if (rows.some((row, index) => !row || row.lastSentAt !== read[index])) {
          return { data: false, error: null };
        }
        for (const row of rows) if (row) row.lastSentAt = claimedAt;
        return { data: true, error: null };
      }
      let given = 0;
      rows.forEach((row, index) => {
        if (row && row.lastSentAt === claimedAt) {
          row.lastSentAt = read[index] ?? null;
          given += 1;
        }
      });
      return { data: given, error: null };
    }
    if (name === "alert_similar_queue") {
      return {
        data: state.similarQueue.filter((row) => !state.similarSent.includes(similarKey(row))),
        error: null,
      };
    }
    throw new Error(`unexpected rpc ${name}`);
  },
  from: (table: string) => {
    if (table === "listings") {
      return {
        select: () => ({
          in: (_column: string, ids: string[]) => ({
            eq: async () => ({
              data: ids.filter((id) => state.own.includes(id)).map((id) => ({ id })),
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "alert_similar_sent") {
      return {
        insert: async (row: Row) => {
          if (state.similarSent.includes(similarKey(row))) {
            return { error: { code: "23505", message: "duplicate" } };
          }
          state.similarSent.push(similarKey(row));
          return { error: null };
        },
        delete: () => ({
          match: async (row: Row) => {
            state.similarSent = state.similarSent.filter((key) => key !== similarKey(row));
            return { error: null };
          },
        }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  },
};

const run = (now = NOW) =>
  sendAlertDigests(client as unknown as Parameters<typeof sendAlertDigests>[0], now, { paceMs: 0 });

beforeEach(() => {
  state.alerts = [];
  state.listings = {
    "savigny-sur-orge": [
      listing("new", "2026-11-20T12:00:00+00:00"),
      listing("old", "2026-11-19T12:00:00+00:00"),
    ],
    "epinay-sur-orge": [
      listing("epinay", "2026-11-20T18:00:00+00:00", { city: "Épinay-sur-Orge" }),
    ],
  };
  state.own = [];
  state.similarQueue = [];
  state.similarSent = [];
  state.claimError = false;
  state.claims = 0;
  state.delivery = "logged";
  state.emails = [];
  vi.restoreAllMocks();
});

describe("the daily digest, as it sends", () => {
  it("one email per buyer for all their alerts, then dated; a second run sends nothing", async () => {
    state.alerts = [
      alert("a", "savigny-sur-orge"),
      alert("b", "epinay-sur-orge"),
      alert("d", "savigny-sur-orge", { buyerId: BUYER_D, lastSentAt: null }),
    ];
    const first = await run();
    expect(first).toMatchObject({ alerts: 3, buyers: 2, sent: 2, quiet: 0, failed: 0 });
    expect(state.emails.map((email) => email.to)).toEqual([
      `${BUYER_C}@exemple.test`,
      `${BUYER_D}@exemple.test`,
    ]);
    const [toC, toD] = state.emails;
    expect(toC?.subject).toBe("2\u00A0nouveaux biens correspondent à vos alertes");
    expect(toC?.html).toContain("/annonce/bien-new");
    expect(toC?.html).toContain("/annonce/bien-epinay");
    // Published before the last digest: not told again.
    expect(toC?.html).not.toContain("/annonce/bien-old");
    expect(toC?.idempotencyKey).toBe(`alert-digest/${BUYER_C}/${NOW.toISOString()}`);
    // Never sent: read from its creation, both listings.
    expect(toD?.subject).toBe("2\u00A0nouveaux biens correspondent à vos alertes");
    expect(state.alerts.map((item) => item.lastSentAt)).toEqual(Array(3).fill(NOW.toISOString()));

    const second = await run(new Date(NOW.getTime() + 600_000));
    expect(second).toMatchObject({ sent: 0, quiet: 2, failed: 0 });
    expect(state.emails).toHaveLength(2);
  });

  it("a send that fails gives the alerts their dates back, and the next run sends", async () => {
    state.alerts = [
      alert("a", "savigny-sur-orge"),
      alert("b", "epinay-sur-orge", { lastSentAt: null }),
    ];
    state.delivery = "failed";
    expect(await run()).toMatchObject({ sent: 0, failed: 1 });
    expect(state.alerts.map((item) => item.lastSentAt)).toEqual([YESTERDAY, null]);
    state.delivery = "logged";
    expect(await run(new Date(NOW.getTime() + 600_000))).toMatchObject({ sent: 1, failed: 0 });
    expect(state.emails.at(-1)?.html).toContain("/annonce/bien-new");
  });

  it("never tells a buyer of a listing of their own property", async () => {
    state.alerts = [alert("a", "savigny-sur-orge"), alert("b", "epinay-sur-orge")];
    state.own = ["new"];
    expect(await run()).toMatchObject({ sent: 1 });
    expect(state.emails[0]?.subject).toBe("Un nouveau bien correspond à vos alertes");
    expect(state.emails[0]?.html).not.toContain("/annonce/bien-new");
    // Their only new listing is their own: nothing to say, the alert dated all the same.
    state.alerts = [alert("c", "savigny-sur-orge")];
    state.emails = [];
    expect(await run()).toMatchObject({ sent: 0, quiet: 1 });
    expect(state.emails).toEqual([]);
    expect(state.alerts[0]?.lastSentAt).toBe(NOW.toISOString());
  });

  it("a claim that fails dates nothing and sends nothing; the other buyers go on", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    state.alerts = [alert("a", "savigny-sur-orge"), alert("b", "epinay-sur-orge")];
    state.claimError = true;
    expect(await run()).toMatchObject({ sent: 0, failed: 1 });
    expect(state.emails).toEqual([]);
    expect(state.alerts.map((item) => item.lastSentAt)).toEqual([YESTERDAY, YESTERDAY]);
    // The alerts of a buyer are claimed in one call: all or none.
    expect(state.claims).toBe(1);
    expect(logged).toHaveBeenCalled();
  });

  it("alerts changed by another run meanwhile are left to it", async () => {
    state.alerts = [alert("a", "savigny-sur-orge"), alert("b", "epinay-sur-orge")];
    const queue = client.rpc;
    // Another run dates one alert between the reading and the claim.
    vi.spyOn(client, "rpc").mockImplementation(async (name, args) => {
      if (name === "alert_digest_claim") state.alerts[1]!.lastSentAt = "2026-11-21T04:59:59+00:00";
      return queue(name, args);
    });
    expect(await run()).toMatchObject({ sent: 0, postponed: 1, failed: 0 });
    expect(state.emails).toEqual([]);
    expect(state.alerts[0]?.lastSentAt).toBe(YESTERDAY);
  });

  it("a search that fails stops its alert only, which keeps its date", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    state.alerts = [alert("a", "savigny-sur-orge"), alert("broken", "panne")];
    expect(await run()).toMatchObject({ sent: 1, failed: 0 });
    expect(state.emails[0]?.html).toContain("/annonce/bien-new");
    expect(state.alerts.map((item) => item.lastSentAt)).toEqual([NOW.toISOString(), YESTERDAY]);
    // Logged with the type and the alert, no personal data.
    expect(logged).toHaveBeenCalledWith(
      "[alerts] search of an alert failed",
      expect.objectContaining({ type: "alert.match", entity_id: "broken" }),
    );
    expect(JSON.stringify(logged.mock.calls)).not.toContain("exemple.test");
    // Every search of a buyer failing: no email, nothing dated.
    state.alerts = [alert("broken", "panne")];
    state.emails = [];
    expect(await run()).toMatchObject({ sent: 0, failed: 1 });
    expect(state.alerts[0]?.lastSentAt).toBe(YESTERDAY);
  });

  it("the name of a commune that reads as a link stays out of the email", async () => {
    state.alerts = [alert("a", "savigny-sur-orge")];
    state.listings["savigny-sur-orge"] = [
      listing("link", "2026-11-20T12:00:00+00:00", { city: "www.exemple.fr" }),
    ];
    await run();
    expect(state.emails[0]?.html).not.toContain("www.exemple.fr");
  });
});

describe("similar listings after a sale, as they send", () => {
  const sold = {
    listing_id: "sold-1",
    title: "Maison vendue",
    city: "Savigny-sur-Orge",
    price_cents: 30_000_000,
    rooms: 4,
    buyer_id: BUYER_C,
    email: `${BUYER_C}@exemple.test`,
    first_name: "Chloé",
  };

  it("one email per buyer and listing sold, once", async () => {
    state.similarQueue = [sold, { ...sold, buyer_id: BUYER_D, email: `${BUYER_D}@exemple.test` }];
    state.own = [];
    const first = await run();
    expect(first.similar).toEqual({ due: 2, sent: 2, none: 0, failed: 0, postponed: 0 });
    expect(state.emails.map((email) => email.subject)).toEqual([
      "Des biens similaires à Savigny-sur-Orge",
      "Des biens similaires à Savigny-sur-Orge",
    ]);
    expect(state.emails[0]?.idempotencyKey).toBe(`alert-similar/${BUYER_C}/sold-1`);
    expect((await run()).similar).toMatchObject({ due: 0, sent: 0 });
    expect(state.emails).toHaveLength(2);
    // Claimed by another run meanwhile: left to it.
    state.similarQueue = [{ ...sold, listing_id: "sold-2" }];
    state.similarSent.push(`${BUYER_C}/sold-2`);
    const queue = client.rpc;
    vi.spyOn(client, "rpc").mockImplementation(async (name, args) =>
      name === "alert_similar_queue"
        ? { data: state.similarQueue, error: null }
        : queue(name, args),
    );
    expect((await run()).similar).toMatchObject({ due: 1, sent: 0, postponed: 1 });
    expect(state.emails).toHaveLength(2);
  });

  it("nothing similar online: no email, never asked again; a failed send is tried again", async () => {
    state.similarQueue = [{ ...sold, listing_id: "sold-3", city: "Morangis" }];
    expect((await run()).similar).toMatchObject({ due: 1, none: 1, sent: 0 });
    expect(state.emails).toEqual([]);
    expect((await run()).similar.due).toBe(0);

    state.similarQueue = [sold];
    state.delivery = "failed";
    expect((await run()).similar).toMatchObject({ due: 1, failed: 1 });
    expect(state.similarSent).not.toContain(`${BUYER_C}/sold-1`);
    state.delivery = "logged";
    expect((await run()).similar).toMatchObject({ due: 1, sent: 1 });
  });
});
