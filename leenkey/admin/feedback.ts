import type { EmailDelivery } from "@/core/notifications/email";
import { fr } from "@/lib/i18n/fr";
import type { AccountDecisionInput } from "@/lib/validations/admin";
import type { AccountDecisionResult } from "./users/actions";

// What the back office says after a decision (listings L1-19, accounts
// L1-30a), as plain values (unit-tested): the outcome, then what became of
// the email to the person concerned.

/** reload: no answer from the server, the page may be out of date. */
export type Feedback = { tone: "success" | "warning" | "danger"; text: string; reload?: boolean };

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
