"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/core/auth/session";
import type { FormResult } from "@/leenkey/auth/actions";
import { authErrorMessage } from "@/leenkey/auth/errors";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { frAccount } from "@/lib/i18n/sections/account";
import { frAuth } from "@/lib/i18n/sections/auth";
import { allowRequest } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createStatelessClient } from "@/lib/supabase/public";
import {
  addRoleSchema,
  emailChangeSchema,
  identitySchema,
  passwordChangeSchema,
} from "@/lib/validations/account";
import { fieldErrors } from "@/lib/validations/auth";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { account: frAccount, auth: frAuth } as const;

// « Mon compte » (L1-39, SPEC-V2 8.14): each change with the session of the
// person (RLS, column grants of profiles, Supabase Auth), never the service
// role.

const t = fr.account;
const errors = fr.auth.errors;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function invalid(error: Parameters<typeof fieldErrors>[0]) {
  const found = fieldErrors(error);
  return { error: errors.summary(Object.keys(found).length), fieldErrors: found };
}

/** First name, last name and phone (profiles: columns granted to their owner). */
export async function updateIdentity(
  _previous: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const values = {
    firstName: text(formData, "firstName"),
    lastName: text(formData, "lastName"),
    phone: text(formData, "phone"),
  };
  const user = await getUser();
  if (!user) return { ok: false, error: t.errors.session, values };
  const parsed = identitySchema.safeParse(values);
  if (!parsed.success) return { ok: false, ...invalid(parsed.error), values };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName || null,
      phone: parsed.data.phone || null,
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("[account] identity update failed", { user_id: user.id, code: error?.code });
    return { ok: false, error: errors.generic, values };
  }
  // The first name is in the menus of every page (initial of the avatar).
  revalidatePath("/", "layout");
  redirect(`${ROUTES.account}?modifie=informations`);
}

/**
 * A new address: Supabase Auth sends a link to the current address and one
 * to the new one (secure email change); the address changes once both are
 * opened (/confirmation, type email_change).
 */
export async function changeEmail(
  _previous: FormResult<{ current: string; next: string }> | null,
  formData: FormData,
): Promise<FormResult<{ current: string; next: string }>> {
  const values = { email: text(formData, "email") };
  const user = await getUser();
  if (!user?.email) return { ok: false, error: t.errors.session, values };
  const parsed = emailChangeSchema.safeParse(values);
  if (!parsed.success) return { ok: false, ...invalid(parsed.error), values };
  const next = parsed.data.email;
  if (next === user.email.toLowerCase()) {
    return {
      ok: false,
      error: errors.summary(1),
      fieldErrors: { email: t.email.errors.same },
      values,
    };
  }
  // Each request sends two emails, one to any address: counted with the
  // password resets of the address (L1-38), 5 an hour.
  if (!(await allowRequest("reset", await headers()))) {
    return { ok: false, error: errors.tooManyRequests, values };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: next });
  if (error?.code === "email_exists" || error?.code === "user_already_exists") {
    return {
      ok: false,
      error: errors.summary(1),
      fieldErrors: { email: t.email.errors.taken },
      values,
    };
  }
  if (error) return { ok: false, error: authErrorMessage(error, "changeEmail"), values };
  revalidatePath(ROUTES.account);
  return { ok: true, data: { current: user.email, next } };
}

/**
 * A new password, the current one checked first, on a client without
 * cookies whose session is closed at once; a wrong one is counted with the
 * failed sign-ins of the address (L1-38). Then every other session is
 * closed. The check holds for this page only: Supabase Auth changes a
 * password with the access token alone (DECISIONS 2026-11-09, SECURITE).
 */
export async function changePassword(
  _previous: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const user = await getUser();
  if (!user?.email) return { ok: false, error: t.errors.session };
  const parsed = passwordChangeSchema.safeParse({
    current: text(formData, "current"),
    password: text(formData, "password"),
    confirm: text(formData, "confirm"),
  });
  if (!parsed.success) return { ok: false, ...invalid(parsed.error) };

  const requestHeaders = await headers();
  if (!(await allowRequest("signin", requestHeaders, { count: false }))) {
    return { ok: false, error: errors.tooManyRequests };
  }
  const verifier = createStatelessClient();
  const check = await verifier.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  // The session of the check is closed at once, whatever comes next.
  if (!check.error) await verifier.auth.signOut({ scope: "local" });
  if (check.error) {
    if (check.error.code === "invalid_credentials") {
      await allowRequest("signin", requestHeaders);
      return {
        ok: false,
        error: errors.summary(1),
        fieldErrors: { current: t.password.errors.currentWrong },
      };
    }
    return { ok: false, error: authErrorMessage(check.error, "changePassword check") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const message = authErrorMessage(error, "changePassword");
    return { ok: false, error: message, fieldErrors: { password: message } };
  }
  const { error: othersError } = await supabase.auth.signOut({ scope: "others" });
  if (othersError) {
    console.error("[account] signOut others failed", { user_id: user.id, code: othersError.code });
  }
  redirect(`${ROUTES.account}?modifie=mot-de-passe`);
}

export type AddRoleResult = { ok: true; data: { roles: string[] } } | { ok: false; error: string };

/** « Je vends » or « J'achète » added (profile_add_role, never « admin »). */
export async function addRole(role: unknown): Promise<AddRoleResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: t.errors.session };
  const parsed = addRoleSchema.safeParse(role);
  if (!parsed.success) return { ok: false, error: t.roles.error };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("profile_add_role", { p_role: parsed.data });
  if (error || !data) {
    console.error("[account] add role failed", { user_id: user.id, code: error?.code });
    return { ok: false, error: t.roles.error };
  }
  // The tabs and menus of every page follow the roles.
  revalidatePath("/", "layout");
  return { ok: true, data: { roles: data } };
}
