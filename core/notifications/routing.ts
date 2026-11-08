import type { AppEnv } from "@/lib/env";

// Where an email goes in each environment (CLAUDE.md section 4): to its
// recipient in production; elsewhere only to EMAIL_TEST_INBOX, the subject
// prefixed with « [PREPROD] » or « [LOCAL] ».

/**
 * Recipients and subject of an email in an environment (one recipient or
 * several, as the admins of the team); null when it must not leave.
 */
export function routeEmail(
  email: { to: string | readonly string[]; subject: string },
  env: AppEnv,
  testInbox: string | undefined,
): { to: string[]; subject: string } | null {
  if (env === "production") {
    const to = typeof email.to === "string" ? [email.to] : [...email.to];
    return to.length > 0 ? { to, subject: email.subject } : null;
  }
  if (!testInbox) return null;
  const prefix = env === "staging" ? "[PREPROD]" : "[LOCAL]";
  return { to: [testInbox], subject: `${prefix} ${email.subject}` };
}
