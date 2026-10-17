import "server-only";
import { appEnv } from "@/lib/env";
import { routeEmail } from "./routing";

// Transactional emails (SPEC-V2 section 18, CLAUDE.md section 4), sent with
// the Resend API. Generic: the caller brings the rendered template (emails/).
// Outside production, every email goes to EMAIL_TEST_INBOX only, its subject
// prefixed with « [PREPROD] » (or « [LOCAL] »). Without RESEND_API_KEY,
// nothing leaves: in local the email is only written to the server log.

const DEFAULT_FROM = "Leenkey <bonjour@leenkey.fr>";
const RESEND_URL = "https://api.resend.com/emails";

export type OutgoingEmail = { to: string; subject: string; html: string; text: string };

/** sent: handed to Resend; logged: local only, written to the log. */
export type EmailDelivery = "sent" | "logged" | "failed";

export async function sendEmail(email: OutgoingEmail): Promise<EmailDelivery> {
  const env = appEnv();
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (env === "local") {
      console.info("[email] not sent: local, no RESEND_API_KEY", { subject: email.subject });
      return "logged";
    }
    console.error("[email] not sent: RESEND_API_KEY missing", { subject: email.subject });
    return "failed";
  }
  const route = routeEmail(email, env, process.env.EMAIL_TEST_INBOX);
  if (!route) {
    console.error("[email] not sent: EMAIL_TEST_INBOX missing outside production", {
      subject: email.subject,
    });
    return "failed";
  }
  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: [route.to],
        subject: route.subject,
        html: email.html,
        text: email.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error("[email] refused by Resend", {
        status: response.status,
        subject: email.subject,
      });
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("[email] Resend unreachable", {
      subject: email.subject,
      error: error instanceof Error ? error.message : String(error),
    });
    return "failed";
  }
}
