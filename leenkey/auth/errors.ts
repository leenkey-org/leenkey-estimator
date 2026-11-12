import "server-only";
import type { AuthError } from "@supabase/supabase-js";
import { frAuth } from "@/lib/i18n/sections/auth";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { auth: frAuth } as const;

// The errors of Supabase Auth told to the person (sign-up, sign-in, reset,
// account page): a message of fr.auth.errors, the code logged otherwise.

const t = fr.auth.errors;

/**
 * Supabase Auth refuses a second email to the same address within a minute
 * (« For security purposes… »). It only happens for an address that has an
 * account: telling it would reveal which addresses are registered, so the
 * answer stays « sent ». The quota of the whole project shares the error code
 * with another message: that one is told (« Trop de tentatives »).
 */
export function isAddressEmailLimit(error: AuthError | null, action: string): boolean {
  if (error?.code !== "over_email_send_rate_limit") return false;
  if (!/security purposes/i.test(error.message)) return false;
  console.warn(`[auth] ${action}: email not sent, limit per address`);
  return true;
}

export function authErrorMessage(error: AuthError, action: string): string {
  switch (error.code) {
    case "invalid_credentials":
      return t.invalidCredentials;
    case "email_not_confirmed":
      return t.emailNotConfirmed;
    case "user_already_exists":
    case "email_exists":
      return t.alreadyRegistered;
    case "weak_password":
      return t.passwordWeak;
    case "same_password":
      return t.passwordSame;
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return t.tooManyRequests;
    default:
      console.error(`[auth] ${action} failed`, { code: error.code, status: error.status });
      return t.generic;
  }
}
