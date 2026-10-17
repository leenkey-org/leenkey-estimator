import type { AppEnv } from "@/lib/env";

// Where an email goes in each environment (CLAUDE.md section 4): to its
// recipient in production; elsewhere only to EMAIL_TEST_INBOX, the subject
// prefixed with « [PREPROD] » or « [LOCAL] ».

/** Recipient and subject of an email in an environment; null when it must not leave. */
export function routeEmail(
  email: { to: string; subject: string },
  env: AppEnv,
  testInbox: string | undefined,
): { to: string; subject: string } | null {
  if (env === "production") return { to: email.to, subject: email.subject };
  if (!testInbox) return null;
  const prefix = env === "staging" ? "[PREPROD]" : "[LOCAL]";
  return { to: testInbox, subject: `${prefix} ${email.subject}` };
}
