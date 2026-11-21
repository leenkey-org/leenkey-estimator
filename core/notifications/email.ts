import "server-only";
import { appEnv } from "@/lib/env";
import { routeEmail } from "./routing";

// Transactional emails (SPEC-V2 section 18, CLAUDE.md section 4), sent with
// the Resend API. Generic: the caller brings the rendered template (emails/).
// Outside production, every email goes to EMAIL_TEST_INBOX only, its subject
// prefixed with « [PREPROD] » (or « [LOCAL] »). Without RESEND_API_KEY,
// nothing leaves: in local, only its subject is written to the server log.

const DEFAULT_FROM = "Leenkey <bonjour@leenkey.fr>";
const RESEND_URL = "https://api.resend.com/emails";

export type OutgoingEmail = {
  /** One recipient, or several (the admins of the team: one email to all of them). */
  to: string | readonly string[];
  subject: string;
  html: string;
  text: string;
  /** Where an answer goes, when not to the sender. */
  replyTo?: string;
  /** Files sent with it (a calendar file): their name and their content in base64. */
  attachments?: readonly EmailAttachment[];
  /**
   * Names this email for Resend (header « Idempotency-Key », kept 24 hours): a
   * request sent again with the same key, after an answer lost on the way,
   * does not leave twice. ASCII, 256 characters at most.
   */
  idempotencyKey?: string;
};

export type EmailAttachment = { filename: string; content: string };

/**
 * sent: handed to Resend for the recipient (production); test: handed to
 * Resend for EMAIL_TEST_INBOX (elsewhere); logged: local only, nothing sent.
 */
export type EmailDelivery = "sent" | "test" | "logged" | "failed";

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
    const recipients = typeof email.to === "string" ? [email.to] : email.to;
    console.error(
      recipients.filter(Boolean).length === 0
        ? "[email] not sent: no recipient"
        : "[email] not sent: EMAIL_TEST_INBOX missing outside production",
      { subject: email.subject },
    );
    return "failed";
  }
  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(email.idempotencyKey ? { "Idempotency-Key": email.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: route.to,
        subject: route.subject,
        html: email.html,
        text: email.text,
        // Outside production, an answer goes back to the test inbox too.
        ...(email.replyTo ? { reply_to: env === "production" ? email.replyTo : route.to[0] } : {}),
        ...(email.attachments?.length
          ? {
              attachments: email.attachments.map(({ filename, content }) => ({
                filename,
                content,
              })),
            }
          : {}),
      }),
      // Short: the caller waits (a decision of the back office).
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      console.error("[email] refused by Resend", {
        status: response.status,
        subject: email.subject,
      });
      return "failed";
    }
    return env === "production" ? "sent" : "test";
  } catch (error) {
    console.error("[email] Resend unreachable", {
      subject: email.subject,
      error: error instanceof Error ? error.message : String(error),
    });
    return "failed";
  }
}
