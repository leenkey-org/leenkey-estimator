"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { splitFullName } from "@/core/auth/identity";
import { safeNextPath } from "@/core/auth/next-path";
import { getUser, missingAcceptances } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createStatelessClient } from "@/lib/supabase/public";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { allowRequest } from "@/lib/rate-limit";
import { frAuth } from "@/lib/i18n/sections/auth";
import {
  acceptTermsSchema,
  fieldErrors,
  forgotPasswordSchema,
  resendSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations/auth";
import {
  CONFIRM_COOKIE,
  decodeConfirmLink,
  EMAIL_CHANGE_HALF_PATH,
  EXPIRED_LINK_PATH,
  pathAfterEmailLink,
} from "./landing";
import { authErrorMessage, isAddressEmailLimit } from "./errors";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { homePathForRoles } from "./routes";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { auth: frAuth } as const;

const t = fr.auth.errors;

export type FormResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string>;
      /** Values to put back in the form (never the password). */
      values?: Record<string, string>;
      /** Sign-in refused because the email is not confirmed yet: offer to resend. */
      unconfirmed?: boolean;
    };

function formValues(formData: FormData, keys: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

/** Site the links of the emails come back to: NEXT_PUBLIC_SITE_URL, else this request's host. */
async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Malformed variable: fall back to the request.
    }
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : "http://localhost:3000";
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
  // 5 sign-ups an hour per address (L1-38).
  if (!(await allowRequest("signup", await headers()))) {
    return { ok: false, error: t.tooManyRequests, values };
  }
  const input = parsed.data;
  const { firstName, lastName } = splitFullName(input.fullName);
  // SPEC-V2 8.2: a new seller starts with the creation of the property.
  const fallback = input.role === "seller" ? ROUTES.newProperty : homePathForRoles([input.role]);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/confirm`,
      // Read by the signup trigger (profile, role, accepted versions) and
      // once the email is confirmed (where to go).
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
  if (error && !isAddressEmailLimit(error, "signUp")) {
    const message = authErrorMessage(error, "signUp");
    const field = error.code === "weak_password" ? { password: message } : undefined;
    return { ok: false, error: message, fieldErrors: field, values };
  }
  // Email confirmation switched off in the project settings: already signed in.
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
  // Counted with the sign-ups: 5 emails an hour per address (L1-38).
  if (!(await allowRequest("signup", await headers()))) {
    return { ok: false, error: t.tooManyRequests };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm` },
  });
  if (error && !isAddressEmailLimit(error, "resend")) {
    return { ok: false, error: authErrorMessage(error, "resend") };
  }
  return { ok: true, data: undefined };
}

/** « Confirmer » on /confirmation: the token kept by /auth/confirm is used only now. */
export async function confirmEmailLink(): Promise<void> {
  const store = await cookies();
  const link = decodeConfirmLink(store.get(CONFIRM_COOKIE.name)?.value);
  store.delete({ name: CONFIRM_COOKIE.name, path: CONFIRM_COOKIE.options.path });
  if (!link) redirect(EXPIRED_LINK_PATH);
  const { token_hash, type } = link;
  if (type === "email_change") await confirmEmailChange(token_hash);
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) {
    console.error("[auth] verifyOtp failed", { code: error.code, type });
    redirect(EXPIRED_LINK_PATH);
  }
  redirect(await pathAfterEmailLink(supabase, type));
}

/**
 * A link of a change of address (L1-39), verified on a client without
 * cookies: it never signs this browser in, so that a link of someone else's
 * account (sent to trap a person) cannot put them in that account. The
 * first of the two links changes nothing yet; the second changes the
 * address, and its session is closed at once. The person signed in to the
 * account comes back to it; anyone else is told to sign in.
 */
async function confirmEmailChange(tokenHash: string): Promise<never> {
  const verifier = createStatelessClient();
  const { data, error } = await verifier.auth.verifyOtp({
    type: "email_change",
    token_hash: tokenHash,
  });
  if (error) {
    console.error("[auth] verifyOtp failed", { code: error.code, type: "email_change" });
    redirect(EXPIRED_LINK_PATH);
  }
  if (!data.session) redirect(EMAIL_CHANGE_HALF_PATH);
  const { error: signOutError } = await verifier.auth.signOut({ scope: "local" });
  if (signOutError) {
    console.error("[auth] email change session not closed", {
      user_id: data.user?.id,
      code: signOutError.code,
    });
  }
  const current = await getUser();
  redirect(
    current && current.id === data.user?.id
      ? `${ROUTES.account}?modifie=email`
      : `${EMAIL_CHANGE_HALF_PATH}?etat=fait`,
  );
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
  // 20 failed sign-ins a quarter of an hour per address (L1-38): checked
  // first, counted only when the password is refused, so that people behind
  // one address (an office, a mobile network) who sign in do not use it up.
  const requestHeaders = await headers();
  if (!(await allowRequest("signin", requestHeaders, { count: false }))) {
    return { ok: false, error: t.tooManyRequests, values };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    if (error.code === "invalid_credentials") await allowRequest("signin", requestHeaders);
    return {
      ok: false,
      error: authErrorMessage(error, "signIn"),
      values,
      unconfirmed: error.code === "email_not_confirmed",
    };
  }
  redirect(safeNextPath(parsed.data.next, homePathForRoles(await rolesOf(data.user.id))));
}

/** This device only: the other sessions of the account stay open. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
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
  // 5 requests an hour per address (L1-38).
  if (!(await allowRequest("reset", await headers()))) {
    return { ok: false, error: t.tooManyRequests, values };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?type=recovery`,
  });
  // Unknown addresses get the same answer (no enumeration); only the limit
  // per visitor, which does not depend on the address, is worth telling. An
  // email limit (per address or for the project) only applies when an account
  // exists, so it is answered « sent » too.
  if (error?.code === "over_request_rate_limit") {
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
  // New password: the sessions opened elsewhere with the old one are closed.
  const { error: othersError } = await supabase.auth.signOut({ scope: "others" });
  if (othersError) {
    console.error("[auth] signOut others failed", { user_id: user.id, code: othersError.code });
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
