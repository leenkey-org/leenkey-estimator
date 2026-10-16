"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { fr } from "@/lib/i18n/fr";
import {
  acceptTermsSchema,
  fieldErrors,
  forgotPasswordSchema,
  resendSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations/auth";
import { splitFullName } from "./identity";
import { homePathForRoles, safeNextPath } from "./next-path";
import { getUser, missingAcceptances } from "./session";

const t = fr.auth.errors;

export type FormResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string>;
      /** Values to put back in the form (never the password). */
      values?: Record<string, string>;
    };

function formValues(formData: FormData, keys: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

/** Origin of this request: the confirmation links come back to the same site. */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function authErrorMessage(error: AuthError, action: string): string {
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

async function rolesOf(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("roles").eq("id", userId).maybeSingle();
  return data?.roles ?? [];
}

// --- Sign-up ---------------------------------------------------------------

export async function signUp(
  _previous: FormResult<{ email: string }> | null,
  formData: FormData,
): Promise<FormResult<{ email: string }>> {
  const values = formValues(formData, [
    "role",
    "fullName",
    "email",
    "phone",
    "acceptTerms",
    "next",
  ]);
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return { ok: false, error: t.summary(Object.keys(errors).length), fieldErrors: errors, values };
  }
  const input = parsed.data;
  const { firstName, lastName } = splitFullName(input.fullName);
  const fallback = homePathForRoles([input.role]);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/confirm`,
      // Read by the signup trigger (profile, role, accepted versions) and by
      // /auth/confirm (where to go once the email is confirmed).
      data: {
        role: input.role,
        first_name: firstName,
        last_name: lastName,
        phone: input.phone || null,
        legal: LEGAL_VERSIONS,
        next_path: safeNextPath(input.next, fallback),
      },
    },
  });
  if (error) {
    const message = authErrorMessage(error, "signUp");
    const field = error.code === "weak_password" ? { password: message } : undefined;
    return { ok: false, error: message, fieldErrors: field, values };
  }
  // Email confirmation switched off (local stack): the session already exists.
  if (data.session) redirect(safeNextPath(input.next, fallback));
  // Same answer whether the email was new or already registered (no enumeration).
  return { ok: true, data: { email: input.email } };
}

export async function resendConfirmation(
  _previous: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const parsed = resendSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: t.emailInvalid };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm` },
  });
  if (error) return { ok: false, error: authErrorMessage(error, "resend") };
  return { ok: true, data: undefined };
}

// --- Sign-in and sign-out --------------------------------------------------

export async function signIn(
  _previous: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const values = formValues(formData, ["email", "next"]);
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return { ok: false, error: t.summary(Object.keys(errors).length), fieldErrors: errors, values };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: authErrorMessage(error, "signIn"), values };
  redirect(safeNextPath(parsed.data.next, homePathForRoles(await rolesOf(data.user.id))));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// --- Password --------------------------------------------------------------

export async function requestPasswordReset(
  _previous: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const values = formValues(formData, ["email"]);
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: t.summary(1), fieldErrors: fieldErrors(parsed.error), values };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?type=recovery`,
  });
  // Unknown addresses get the same answer (no enumeration); only the rate
  // limit is worth telling.
  if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
    return { ok: false, error: t.tooManyRequests, values };
  }
  if (error) console.error("[auth] resetPasswordForEmail failed", { code: error.code });
  return { ok: true, data: undefined };
}

export async function updatePassword(
  _previous: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: fr.auth.reset.expired };
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return { ok: false, error: t.summary(Object.keys(errors).length), fieldErrors: errors };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const message = authErrorMessage(error, "updatePassword");
    return { ok: false, error: message, fieldErrors: { password: message } };
  }
  redirect(homePathForRoles(await rolesOf(user.id)));
}

// --- Terms -----------------------------------------------------------------

export async function acceptTerms(
  _previous: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const user = await getUser();
  if (!user) redirect("/connexion");
  const parsed = acceptTermsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, error: t.termsRequired, fieldErrors: fieldErrors(parsed.error) };
  const missing = await missingAcceptances(user.id);
  if (missing.length > 0) {
    const versions = Object.fromEntries(
      missing.map((document) => [document, LEGAL_VERSIONS[document]]),
    );
    const supabase = await createClient();
    const { error } = await supabase.rpc("legal_accept", { p_versions: versions });
    if (error) {
      console.error("[auth] legal_accept failed", { user_id: user.id, code: error.code });
      return { ok: false, error: t.generic };
    }
  }
  redirect(safeNextPath(parsed.data.next, homePathForRoles(await rolesOf(user.id))));
}
