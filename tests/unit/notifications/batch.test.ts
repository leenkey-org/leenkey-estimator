import { describe, expect, it } from "vitest";
import {
  MAX_AGE_HOURS,
  planEmails,
  toQueuedNotification,
  type EmailPolicy,
  type QueuedNotification,
} from "@/core/notifications/batch";

// L1-22: what the cron sends, in one email per group (SPEC-V2 section 10).

const NOW = new Date("2026-10-24T10:00:00Z");
const minutes = (count: number) => new Date(NOW.getTime() - count * 60_000);

const POLICIES: Record<string, EmailPolicy> = {
  "message.new": { audience: "recipient", preference: "email_messages", throttleMinutes: 15 },
  "listing.pending": { audience: "team", throttleMinutes: 20 },
};
const policyOf = (type: string) => POLICIES[type] ?? null;

let counter = 0;
function row(overrides: Partial<QueuedNotification> = {}): QueuedNotification {
  counter += 1;
  return {
    id: `n-${String(counter).padStart(3, "0")}`,
    profileId: "seller-a",
    type: "message.new",
    data: { conversation_id: "c1" },
    link: "/messages/c1",
    groupKey: "conversation:c1",
    createdAt: minutes(10),
    emailAfter: minutes(5),
    readAt: null,
    email: "seller_a@exemple.test",
    firstName: "Alice",
    prefs: { email_messages: true },
    active: true,
    groupLastSentAt: null,
    ...overrides,
  };
}

describe("planEmails", () => {
  it("the new messages of a conversation in one email, the oldest first", () => {
    const later = row({ createdAt: minutes(6) });
    const first = row({ createdAt: minutes(9) });
    const plan = planEmails([later, first], policyOf, NOW);
    expect(plan.emails).toHaveLength(1);
    expect(plan.emails[0]).toMatchObject({
      audience: "recipient",
      type: "message.new",
      profileId: "seller-a",
      email: "seller_a@exemple.test",
      firstName: "Alice",
    });
    expect(plan.emails[0].items.map((item) => item.id)).toEqual([first.id, later.id]);
    expect(plan.emails[0].ids.sort()).toEqual([first.id, later.id].sort());
    expect(plan.skipped).toEqual([]);
  });

  it("one email per conversation and per recipient", () => {
    const plan = planEmails(
      [
        row(),
        row({ groupKey: "conversation:c2", link: "/messages/c2" }),
        row({ profileId: "buyer-c", email: "buyer_c@exemple.test" }),
      ],
      policyOf,
      NOW,
    );
    expect(plan.emails).toHaveLength(3);
  });

  it("at most one email per conversation every 15 minutes: the next ones wait", () => {
    const plan = planEmails([row({ groupLastSentAt: minutes(5) })], policyOf, NOW);
    expect(plan.emails).toEqual([]);
    expect(plan.postponed).toEqual([{ ids: [expect.any(String)], until: minutes(-10) }]);
    // 15 minutes after the last one, they leave.
    expect(planEmails([row({ groupLastSentAt: minutes(15) })], policyOf, NOW).emails).toHaveLength(
      1,
    );
  });

  it("none once read, nor when the preference is off, the account closed, the address missing", () => {
    const read = row({ readAt: minutes(2) });
    const off = row({ prefs: { email_messages: false } });
    const closed = row({ active: false });
    const nowhere = row({ email: null });
    const plan = planEmails([read, off, closed, nowhere], policyOf, NOW);
    expect(plan.emails).toEqual([]);
    expect(plan.skipped).toEqual([
      { id: read.id, reason: "read" },
      { id: off.id, reason: "disabled" },
      { id: closed.id, reason: "inactive" },
      { id: nowhere.id, reason: "no_address" },
    ]);
    // A preference missing is on (default of SPEC 4).
    expect(planEmails([row({ prefs: {} })], policyOf, NOW).emails).toHaveLength(1);
  });

  it("never for an event more than a day old, nor for a type without email", () => {
    const old = row({ createdAt: minutes(MAX_AGE_HOURS * 60 + 1), emailAfter: minutes(1) });
    const other = row({ type: "listing.published", groupKey: null });
    const plan = planEmails([old, other], policyOf, NOW);
    expect(plan.emails).toEqual([]);
    expect(plan.skipped).toEqual([
      { id: old.id, reason: "stale" },
      { id: other.id, reason: "no_email" },
    ]);
  });

  describe("the team (listing.pending)", () => {
    const pending = (listing: string, admin: string, overrides: Partial<QueuedNotification> = {}) =>
      row({
        type: "listing.pending",
        profileId: admin,
        email: null,
        firstName: null,
        prefs: {},
        groupKey: "listings:review",
        link: `/admin/annonces/${listing}`,
        data: { entity_id: listing, reference: `LK-${listing}` },
        ...overrides,
      });

    it("one email for the team, one line per listing, whatever the number of admins", () => {
      const plan = planEmails(
        [
          pending("0001", "admin-1", { createdAt: minutes(8) }),
          pending("0001", "admin-2", { createdAt: minutes(8) }),
          pending("0002", "admin-1", { createdAt: minutes(4) }),
          pending("0002", "admin-2", { createdAt: minutes(4) }),
        ],
        policyOf,
        NOW,
      );
      expect(plan.emails).toHaveLength(1);
      expect(plan.emails[0]).toMatchObject({ audience: "team", profileId: null, email: null });
      expect(plan.emails[0].items.map((item) => item.data.entity_id)).toEqual(["0001", "0002"]);
      // Every row is covered: none of them leaves again.
      expect(plan.emails[0].ids).toHaveLength(4);
    });

    it("an admin account closed or without address changes nothing: the team address gets it", () => {
      const plan = planEmails([pending("0003", "admin-1", { active: false })], policyOf, NOW);
      expect(plan.emails).toHaveLength(1);
    });

    it("a listing already opened by one admin sends nothing", () => {
      const plan = planEmails(
        [
          pending("0004", "admin-1", { readAt: minutes(1) }),
          pending("0004", "admin-2"),
          pending("0005", "admin-1"),
        ],
        policyOf,
        NOW,
      );
      expect(plan.emails).toHaveLength(1);
      expect(plan.emails[0].items.map((item) => item.data.entity_id)).toEqual(["0005"]);
      expect(plan.skipped.map((skip) => skip.reason)).toEqual(["read", "read"]);
    });

    it("never more than 3 emails an hour: the listings of the next 20 minutes go together", () => {
      const plan = planEmails(
        [
          pending("0006", "admin-1", { groupLastSentAt: minutes(12) }),
          pending("0007", "admin-1", { groupLastSentAt: minutes(12) }),
        ],
        policyOf,
        NOW,
      );
      expect(plan.emails).toEqual([]);
      expect(plan.postponed).toEqual([
        { ids: [expect.any(String), expect.any(String)], until: minutes(-8) },
      ]);
    });
  });

  it("reads a row of the queue as PostgREST gives it", () => {
    expect(
      toQueuedNotification({
        id: "n1",
        profile_id: "p1",
        type: "message.new",
        data: { excerpt: "Bonjour" },
        link: "/messages/c1",
        group_key: "conversation:c1",
        created_at: "2026-10-24T09:50:00+00:00",
        email_after: "2026-10-24T09:55:00+00:00",
        read_at: null,
        email: "a@exemple.test",
        first_name: "Alice",
        prefs: ["not", "an", "object"],
        active: true,
        group_last_sent_at: null,
      }),
    ).toMatchObject({
      profileId: "p1",
      groupKey: "conversation:c1",
      createdAt: new Date("2026-10-24T09:50:00Z"),
      emailAfter: new Date("2026-10-24T09:55:00Z"),
      prefs: {},
      groupLastSentAt: null,
    });
  });
});
