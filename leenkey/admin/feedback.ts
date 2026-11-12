import type { EmailDelivery } from "@/core/notifications/email";
import { frAdminCases } from "@/lib/i18n/sections/adminCases";
import { frAdminListings } from "@/lib/i18n/sections/adminListings";
import { frAdminReports } from "@/lib/i18n/sections/adminReports";
import { frAdminUsers } from "@/lib/i18n/sections/adminUsers";
import type { AccountDecisionInput, CaseCommand, ReportCommand } from "@/lib/validations/admin";
import type { Database } from "@/types/database";
import type { CaseCommandResult } from "./cases/actions";
import type { ReportCommandResult } from "./reports/actions";
import type { AccountDecisionResult } from "./users/actions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = {
  adminCases: frAdminCases,
  adminListings: frAdminListings,
  adminReports: frAdminReports,
  adminUsers: frAdminUsers,
} as const;

// What the back office says after a decision (listings L1-19, accounts
// L1-30a, cases and reports L1-30c), as plain values (unit-tested): the
// outcome, then what became of the email to the person concerned.

/**
 * reload: no answer from the server, the page may be out of date. keepFocus:
 * the outcome is read out without taking the focus (a task ticked: the
 * keyboard stays on the list).
 */
export type Feedback = {
  tone: "success" | "warning" | "danger";
  text: string;
  reload?: boolean;
  keepFocus?: boolean;
};

/** The email of a decision, said for its recipient (the seller, the holder of the account). */
export type EmailNotes = { sent: string; failed: string };

/** What a decision done says of the email it sent (null: none sent). */
export function withEmailNote(
  done: string,
  email: EmailDelivery | null,
  notes: EmailNotes,
): Feedback {
  if (email === null) return { tone: "success", text: done };
  if (email === "failed") return { tone: "warning", text: `${done} ${notes.failed}` };
  const note = {
    sent: notes.sent,
    test: fr.adminListings.result.emailTest,
    logged: fr.adminListings.result.emailLogged,
  }[email];
  return { tone: "success", text: `${done} ${note}` };
}

const u = fr.adminUsers;

const ACCOUNT_ERROR = {
  invalid: u.errors.invalid,
  forbidden: u.errors.forbidden,
  not_found: u.errors.notFound,
  conflict: u.errors.conflict,
  unavailable: u.errors.unavailable,
} as const;

/** The outcome of a decision on an account; null: no answer from the server. */
export function accountFeedback(
  action: AccountDecisionInput["action"],
  result: AccountDecisionResult | null,
): Feedback {
  if (!result) return { tone: "danger", text: u.errors.network, reload: true };
  if (!result.ok) return { tone: "danger", text: ACCOUNT_ERROR[result.error] };
  const done = action === "suspend" ? u.result.suspended : u.result.unsuspended;
  return withEmailNote(done, result.data.email, {
    sent: u.result.emailSent,
    failed: u.result.emailFailed,
  });
}

const c = fr.adminCases;

const CASE_ERROR = {
  invalid: c.errors.invalid,
  forbidden: c.errors.forbidden,
  not_found: c.errors.notFound,
  conflict: c.errors.conflict,
  unavailable: c.errors.unavailable,
} as const;

type CaseStatus = Database["public"]["Enums"]["case_status"];

/**
 * What a change of a case says (L1-30c); null: no answer from the server.
 * from: the status of the case before the change (« Dossier rouvert. »).
 */
export function caseFeedback(
  command: CaseCommand,
  result: CaseCommandResult | null,
  from?: CaseStatus,
): Feedback {
  if (!result) return { tone: "danger", text: c.errors.network, reload: true };
  if (!result.ok) {
    // Only a note can be refused for its length: any other change, the page.
    const text =
      result.error === "invalid" && command.action !== "note"
        ? c.errors.invalidChange
        : CASE_ERROR[result.error];
    return { tone: "danger", text };
  }
  switch (command.action) {
    case "status":
      return {
        tone: "success",
        text:
          command.status === "closed"
            ? c.result.closed
            : from === "closed"
              ? c.result.reopened
              : c.result.started,
      };
    case "follow":
      return { tone: "success", text: command.follow ? c.result.followed : c.result.unfollowed };
    case "note":
      return { tone: "success", text: c.result.noted };
    case "task":
      return {
        tone: "success",
        text: command.done ? c.result.taskDone : c.result.taskUndone,
        keepFocus: true,
      };
  }
}

const r = fr.adminReports;

const REPORT_ERROR = {
  invalid: r.errors.invalid,
  forbidden: r.errors.forbidden,
  not_found: r.errors.notFound,
  conflict: r.errors.conflict,
  unavailable: r.errors.unavailable,
} as const;

/** What a decision on a report says (L1-30c); null: no answer from the server. */
export function reportFeedback(
  action: ReportCommand["action"],
  result: ReportCommandResult | null,
): Feedback {
  if (!result) return { tone: "danger", text: r.errors.network, reload: true };
  if (!result.ok) return { tone: "danger", text: REPORT_ERROR[result.error] };
  if (action === "resolve") return { tone: "success", text: r.result.resolved };
  return withEmailNote(r.result.warned, result.data.email, {
    sent: r.result.emailSent,
    failed: r.result.emailFailed,
  });
}
