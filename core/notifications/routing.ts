import type { AppEnv } from "@/lib/env";

// Where an email goes in each environment (CLAUDE.md section 4): to its
// recipient in production; elsewhere only to EMAIL_TEST_INBOX, the subject
// prefixed with « [PREPROD] » or « [LOCAL] ».

/**
 * Recipients and subject of an email in an environment (one recipient or
 * several, as the admins of the team); null when it must not leave: no
 * recipient, or no test inbox outside production.
 */
export function routeEmail(
  email: { to: string | readonly string[]; subject: string },
  env: AppEnv,
  testInbox: string | undefined,
): { to: string[]; subject: string } | null {
  const to = (typeof email.to === "string" ? [email.to] : [...email.to]).filter(Boolean);
  if (to.length === 0) return null;
  if (env === "production") return { to, subject: email.subject };
  if (!testInbox) return null;
  const prefix = env === "staging" ? "[PREPROD]" : "[LOCAL]";
  return { to: [testInbox], subject: `${prefix} ${email.subject}` };
}
