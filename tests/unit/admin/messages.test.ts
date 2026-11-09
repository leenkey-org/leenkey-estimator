import { describe, expect, it, vi } from "vitest";
import { adminMessagesHref, parseAdminMessagesQuery } from "@/lib/validations/admin";

// L1-34: the shared inbox of the advisor conversations (SPEC-V2 section 17):
// its filter by plan, and the seller waiting for more than 24 h (in orange).
// The SQL in supabase/tests/rls_advisor_conversation.sql.

vi.mock("server-only", () => ({}));

const { awaitingAnswer } = await import("@/leenkey/admin/messages/queries");

const NOW = new Date("2026-11-09T12:00:00Z");

describe("the shared inbox of the advisor conversations", () => {
  it("filters by a paid plan, any other value shows them all", () => {
    expect(parseAdminMessagesQuery({ formule: "accompagne" })).toEqual({ plan: "accompagne" });
    expect(parseAdminMessagesQuery({ formule: ["serenite", "x"] })).toEqual({ plan: "serenite" });
    expect(parseAdminMessagesQuery({ formule: "autonomie" })).toEqual({ plan: null });
    expect(parseAdminMessagesQuery({})).toEqual({ plan: null });
    expect(adminMessagesHref({ plan: "serenite" })).toBe("/admin/messages?formule=serenite");
    expect(adminMessagesHref({ plan: null })).toBe("/admin/messages");
  });

  it("a seller waiting for more than 24 h, never once the team answered or closed", () => {
    const waiting = { lastFromSeller: true, closed: false, lastMessageAt: "2026-11-08T11:00:00Z" };
    expect(awaitingAnswer(waiting, NOW)).toBe(true);
    expect(awaitingAnswer({ ...waiting, lastMessageAt: "2026-11-08T13:00:00Z" }, NOW)).toBe(false);
    expect(awaitingAnswer({ ...waiting, lastFromSeller: false }, NOW)).toBe(false);
    expect(awaitingAnswer({ ...waiting, closed: true }, NOW)).toBe(false);
  });
});
