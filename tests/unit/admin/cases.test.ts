import { render } from "@react-email/components";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { planEmails, type QueuedNotification } from "@/core/notifications/batch";
import { EMAIL_PLAIN_TEXT } from "@/emails/components/email-layout";
import { UserWarnedEmail, userWarnedSubject } from "@/emails/user-warned";
import { isCheckNote } from "@/leenkey/admin/cases/queries";
import { caseFeedback, reportFeedback } from "@/leenkey/admin/feedback";
import { emailPolicy, renderNotificationEmail } from "@/leenkey/notifications/email-catalog";
import {
  adminCasesHref,
  adminReportsHref,
  caseCommandSchema,
  parseAdminCasesQuery,
  parseAdminReportsQuery,
  reportCommandSchema,
} from "@/lib/validations/admin";

// L1-30c: the cases and the reports of the back office. The SQL is tested in
// supabase/tests/rls_admin_cases_reports.sql, the screens in
// tests/e2e/admin-cases.spec.ts.

const mocks = vi.hoisted(() => ({
  profile: null as { id: string; roles: string[] } | null,
  calls: [] as { fn: string; args: Record<string, unknown> }[],
  rpcData: null as unknown,
  rpcError: null as { code: string } | null,
  emails: [] as { profileId: string; reason: string }[],
  emailResult: "sent" as "sent" | "failed",
  revalidated: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => mocks.revalidated.push(path),
}));
vi.mock("@/core/auth/session", () => ({
  getProfile: async () => mocks.profile,
  requireAdmin: async () => mocks.profile,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      mocks.calls.push({ fn, args });
      return { data: mocks.rpcData, error: mocks.rpcError };
    },
  }),
}));
vi.mock("@/leenkey/admin/reports/emails", () => ({
  emailUserWarned: async (input: { profileId: string; reason: string }) => {
    mocks.emails.push(input);
    return mocks.emailResult;
  },
}));

const caseId = "5eed5000-0000-4000-8000-000000000008";
const taskId = "0d9c7c63-1e4b-4b8e-9a52-6f4a2f2a9f10";
const reportId = "5eed6000-0000-4000-8000-000000000001";
const targetId = "5eed0000-0000-4000-8000-00000000000d";

beforeEach(() => {
  mocks.profile = { id: "admin-id", roles: ["admin"] };
  mocks.calls = [];
  mocks.rpcData = null;
  mocks.rpcError = null;
  mocks.emails = [];
  mocks.emailResult = "sent";
  mocks.revalidated = [];
});

describe("admin cases and reports URL", () => {
  it("reads the filter and the search of the cases, ignores anything else", () => {
    expect(parseAdminCasesQuery({ statut: "en-cours", q: " LK-0001 " })).toEqual({
      status: "in_progress",
      query: "LK-0001",
    });
    expect(parseAdminCasesQuery({ statut: "in_progress", q: "" })).toEqual({
      status: undefined,
      query: undefined,
    });
    expect(parseAdminCasesQuery({ statut: ["clos", "nouveaux"], q: "x".repeat(101) })).toEqual({
      status: "closed",
      query: undefined,
    });
  });

  it("builds the address of the cases back from them", () => {
    expect(adminCasesHref({})).toBe("/admin/dossiers");
    expect(adminCasesHref({ status: "new" })).toBe("/admin/dossiers?statut=nouveaux");
    expect(adminCasesHref({ status: "closed", query: "Juvisy-sur-Orge" })).toBe(
      "/admin/dossiers?statut=clos&q=Juvisy-sur-Orge",
    );
    expect(parseAdminCasesQuery({ statut: "clos", q: "Juvisy-sur-Orge" })).toEqual({
      status: "closed",
      query: "Juvisy-sur-Orge",
    });
  });

  it("reads the closed reports from « clos » only", () => {
    expect(parseAdminReportsQuery({ statut: "clos" })).toEqual({ closed: true });
    expect(parseAdminReportsQuery({ statut: "ouverts" })).toEqual({ closed: false });
    expect(parseAdminReportsQuery({})).toEqual({ closed: false });
    expect(adminReportsHref({ closed: true })).toBe("/admin/signalements?statut=clos");
    expect(adminReportsHref({ closed: false })).toBe("/admin/signalements");
  });
});

describe("caseCommandSchema", () => {
  it("takes a status, a follow-up, a note, a task", () => {
    expect(
      caseCommandSchema.safeParse({ action: "status", caseId, status: "closed" }).success,
    ).toBe(true);
    expect(caseCommandSchema.safeParse({ action: "follow", caseId, follow: false }).success).toBe(
      true,
    );
    expect(
      caseCommandSchema.safeParse({ action: "task", caseId, taskId, done: true }).success,
    ).toBe(true);
    const note = caseCommandSchema.parse({ action: "note", caseId, body: "  Rappelé.  " });
    expect(note).toEqual({ action: "note", caseId, body: "Rappelé." });
  });

  it("refuses an empty or too long note, an unknown status, a case or task that is not one", () => {
    const refused = [
      { action: "note", caseId, body: "   " },
      { action: "note", caseId, body: "a".repeat(4001) },
      { action: "status", caseId, status: "archived" },
      { action: "status", caseId: "LK-0008", status: "closed" },
      { action: "task", caseId, taskId: "task", done: true },
      { action: "task", caseId, taskId, done: "yes" },
      { action: "assign", caseId, assignee: taskId },
    ];
    for (const input of refused) expect(caseCommandSchema.safeParse(input).success).toBe(false);
    expect(
      caseCommandSchema.safeParse({ action: "note", caseId, body: "a".repeat(4000) }).success,
    ).toBe(true);
  });
});

describe("reportCommandSchema", () => {
  it("asks a text of 3 characters at least to warn and to close", () => {
    expect(
      reportCommandSchema.safeParse({ action: "warn", reportId, reason: "Restez courtois." })
        .success,
    ).toBe(true);
    expect(
      reportCommandSchema.safeParse({ action: "resolve", reportId, note: "Sans suite." }).success,
    ).toBe(true);
    for (const input of [
      { action: "warn", reportId, reason: "ok" },
      { action: "resolve", reportId },
      { action: "warn", reportId: "1", reason: "Restez courtois." },
      { action: "suspend", reportId, reason: "Restez courtois." },
    ]) {
      expect(reportCommandSchema.safeParse(input).success).toBe(false);
    }
  });
});

describe("what a change of a case says", () => {
  const status = (to: "new" | "in_progress" | "closed") =>
    ({ action: "status", caseId, status: to }) as const;

  it("takes in hand, closes, reopens", () => {
    expect(caseFeedback(status("in_progress"), { ok: true }, "new").text).toBe(
      "Dossier pris en charge.",
    );
    expect(caseFeedback(status("closed"), { ok: true }, "in_progress").text).toBe("Dossier clos.");
    expect(caseFeedback(status("in_progress"), { ok: true }, "closed").text).toBe(
      "Dossier rouvert.",
    );
  });

  it("keeps the focus on the list after a task, not after the rest", () => {
    const task = caseFeedback({ action: "task", caseId, taskId, done: false }, { ok: true });
    expect(task).toEqual({ tone: "success", text: "Tâche décochée.", keepFocus: true });
    expect(caseFeedback({ action: "note", caseId, body: "Rappelé." }, { ok: true })).toEqual({
      tone: "success",
      text: "Note ajoutée.",
    });
    expect(caseFeedback({ action: "follow", caseId, follow: true }, { ok: true }).text).toBe(
      "Vous suivez ce dossier.",
    );
  });

  it("speaks of the note only for a note refused, asks to reload after no answer", () => {
    const invalid = { ok: false, error: "invalid" } as const;
    expect(caseFeedback({ action: "note", caseId, body: "x" }, invalid).text).toBe(
      "La note doit faire de 1 à 4 000 caractères.",
    );
    expect(caseFeedback(status("closed"), invalid).text).toBe(
      "Cette modification n'est pas possible : rechargez la page.",
    );
    expect(caseFeedback(status("closed"), { ok: false, error: "conflict" }).text).toBe(
      "Ce dossier a déjà changé : rechargez la page.",
    );
    expect(caseFeedback(status("closed"), null)).toMatchObject({ tone: "danger", reload: true });
  });
});

describe("what a decision on a report says", () => {
  it("says the warning and what became of its email", () => {
    expect(reportFeedback("resolve", { ok: true, data: { email: null } })).toEqual({
      tone: "success",
      text: "Signalement clos.",
    });
    expect(reportFeedback("warn", { ok: true, data: { email: "sent" } })).toEqual({
      tone: "success",
      text: "Avertissement enregistré. L'utilisateur est prévenu par email.",
    });
    expect(reportFeedback("warn", { ok: true, data: { email: "failed" } })).toMatchObject({
      tone: "warning",
      text: "Avertissement enregistré. L'email n'a pas pu partir : prévenez l'utilisateur autrement.",
    });
    expect(reportFeedback("warn", { ok: false, error: "conflict" }).text).toBe(
      "Ce signalement est déjà clos, ou personne ne peut être averti : rechargez la page.",
    );
    expect(reportFeedback("resolve", null)).toMatchObject({ tone: "danger", reload: true });
  });
});

describe("changeCase", () => {
  const change = async (input: unknown) => {
    const { changeCase } = await import("@/leenkey/admin/cases/actions");
    return changeCase(input);
  };

  it("is refused to anyone but an admin, before any call", async () => {
    mocks.profile = { id: "seller-id", roles: ["seller"] };
    expect(await change({ action: "status", caseId, status: "closed" })).toEqual({
      ok: false,
      error: "forbidden",
    });
    mocks.profile = null;
    expect((await change({ action: "status", caseId, status: "closed" })).ok).toBe(false);
    expect(mocks.calls).toEqual([]);
  });

  it("sends each change to its SQL function, then reads the pages again", async () => {
    expect(await change({ action: "status", caseId, status: "in_progress" })).toEqual({ ok: true });
    await change({ action: "follow", caseId, follow: true });
    await change({ action: "follow", caseId, follow: false });
    await change({ action: "note", caseId, body: " Rappelé. " });
    await change({ action: "task", caseId, taskId, done: true });
    expect(mocks.calls).toEqual([
      { fn: "admin_case_set_status", args: { p_case: caseId, p_status: "in_progress" } },
      // Only one's own name, or nobody.
      { fn: "admin_case_assign", args: { p_case: caseId, p_assignee: "admin-id" } },
      { fn: "admin_case_assign", args: { p_case: caseId, p_assignee: undefined } },
      { fn: "admin_case_add_note", args: { p_case: caseId, p_body: "Rappelé." } },
      { fn: "admin_case_task_set", args: { p_case: caseId, p_task: taskId, p_done: true } },
    ]);
    expect(mocks.revalidated).toEqual(
      expect.arrayContaining(["/admin/dossiers", `/admin/dossiers/${caseId}`, "/admin"]),
    );
  });

  it("says a change refused by the database, reads nothing again", async () => {
    mocks.rpcError = { code: "22023" };
    expect(await change({ action: "status", caseId, status: "closed" })).toEqual({
      ok: false,
      error: "conflict",
    });
    mocks.rpcError = { code: "P0002" };
    expect(await change({ action: "status", caseId, status: "closed" })).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(mocks.revalidated).toEqual([]);
  });

  it("refuses an invalid input before any call", async () => {
    expect(await change({ action: "note", caseId, body: "" })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(mocks.calls).toEqual([]);
  });
});

describe("decideReport", () => {
  const decide = async (input: unknown) => {
    const { decideReport } = await import("@/leenkey/admin/reports/actions");
    return decideReport(input);
  };

  it("is refused to anyone but an admin, before any call", async () => {
    mocks.profile = { id: "buyer-id", roles: ["buyer"] };
    expect(await decide({ action: "resolve", reportId, note: "Sans suite." })).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(mocks.calls).toEqual([]);
  });

  it("warns the account the database names, by email with the message", async () => {
    mocks.rpcData = targetId;
    const result = await decide({ action: "warn", reportId, reason: "Restez courtois." });
    expect(result).toEqual({ ok: true, data: { email: "sent" } });
    expect(mocks.calls).toEqual([
      { fn: "admin_report_warn", args: { p_report: reportId, p_reason: "Restez courtois." } },
    ]);
    expect(mocks.emails).toEqual([{ profileId: targetId, reason: "Restez courtois." }]);
    expect(mocks.revalidated).toContain(`/admin/signalements/${reportId}`);
  });

  it("keeps the warning when its email fails, and says so", async () => {
    mocks.rpcData = targetId;
    mocks.emailResult = "failed";
    expect(await decide({ action: "warn", reportId, reason: "Restez courtois." })).toEqual({
      ok: true,
      data: { email: "failed" },
    });
  });

  it("closes without an email; sends nothing when the database refuses", async () => {
    expect(await decide({ action: "resolve", reportId, note: "Sans suite." })).toEqual({
      ok: true,
      data: { email: null },
    });
    expect(mocks.calls).toEqual([
      { fn: "admin_report_resolve", args: { p_report: reportId, p_note: "Sans suite." } },
    ]);
    mocks.rpcError = { code: "22023" };
    expect(await decide({ action: "warn", reportId, reason: "Restez courtois." })).toEqual({
      ok: false,
      error: "conflict",
    });
    expect(mocks.emails).toEqual([]);
  });
});

describe("warning email", () => {
  const props = {
    firstName: "David",
    reason: "Merci de rester courtois dans vos échanges.",
    contactEmail: "contact.leenkey@gmail.com",
    siteUrl: "https://leenkey.fr",
  };

  it("gives the message as written, what a new breach brings, where to contest", async () => {
    const text = await render(UserWarnedEmail(props), EMAIL_PLAIN_TEXT);
    expect(userWarnedSubject()).toBe("Un message de l'équipe Leenkey");
    expect(text).toContain("Bonjour David,");
    expect(text).toContain(props.reason);
    expect(text).toContain("votre compte pourra être suspendu");
    expect(text).toContain(props.contactEmail);
    expect(text).toContain("sous 48\u00A0h, 7\u00A0j/7");
    // A buyer may be warned: never « parce que vous vendez un bien ».
    expect(text).toContain("parce que vous avez un compte sur Leenkey");
    expect(text).not.toMatch(/\bon\b/i);
    const html = await render(UserWarnedEmail({ ...props, firstName: null }));
    expect(html).toContain("Bonjour,");
    expect(html).toContain(`href="mailto:${props.contactEmail}"`);
  });
});

describe("« Conversation signalée » for the team", () => {
  const NOW = new Date("2026-11-04T10:00:00Z");
  const row = (
    id: string,
    admin: string,
    report: string,
    excerpt: string,
    reference: string | null = "LK-0001",
  ): QueuedNotification => ({
    id,
    profileId: admin,
    type: "report.created",
    data: { entity_id: report, report_id: report, reference, excerpt, truncated: false },
    link: `/admin/signalements/${report}`,
    groupKey: "reports:review",
    createdAt: new Date("2026-11-04T09:50:00Z"),
    emailAfter: new Date("2026-11-04T09:50:00Z"),
    readAt: null,
    email: null,
    firstName: null,
    prefs: {},
    active: true,
    groupLastSentAt: null,
  });

  it("speaks once of a report every admin was told of", () => {
    const plan = planEmails(
      [
        row("n1", "admin-1", reportId, "Messages insistants."),
        row("n2", "admin-2", reportId, "Messages insistants."),
      ],
      emailPolicy,
      NOW,
    );
    expect(plan.emails).toHaveLength(1);
    expect(plan.emails[0].items).toHaveLength(1);
    expect(plan.emails[0].ids).toEqual(["n1", "n2"]);
  });

  it("quotes the reason, never a link written by a user, leads to the report", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://leenkey-v2.vercel.app";
    const [email] = planEmails(
      [row("n1", "admin-1", reportId, "Messages insistants.")],
      emailPolicy,
      NOW,
    ).emails;
    const one = await renderNotificationEmail(email);
    expect(one?.subject).toBe("Conversation signalée (LK-0001)");
    expect(one?.text).toContain("Un utilisateur a signalé une conversation.");
    expect(one?.text).toContain("Messages insistants.");
    expect(one?.text).toContain(`https://leenkey-v2.vercel.app/admin/signalements/${reportId}`);

    const other = "5eed6000-0000-4000-8000-000000000002";
    const [many] = planEmails(
      [
        row("n1", "admin-1", reportId, "Messages insistants."),
        row("n2", "admin-1", other, "Écrivez-moi sur www.exemple.test", null),
      ],
      emailPolicy,
      NOW,
    ).emails;
    const two = await renderNotificationEmail(many);
    expect(two?.subject).toBe("2 conversations signalées");
    expect(two?.text).toContain("2 conversations ont été signalées.");
    expect(two?.text).not.toContain("exemple.test");
  });
});

describe("a payment to check", () => {
  it("is a note of Leenkey itself that starts with « À vérifier », as in SQL", () => {
    const body = "À vérifier : une formule égale ou supérieure était déjà active.";
    expect(isCheckNote({ automatic: true, body })).toBe(true);
    expect(isCheckNote({ automatic: true, body: `Remboursement partiel. ${body}` })).toBe(true);
    expect(isCheckNote({ automatic: false, body })).toBe(false);
    expect(isCheckNote({ automatic: true, body: "Paiement reçu, formule activée." })).toBe(false);
  });
});
