import { z } from "zod";
import { splitFullName } from "@/core/auth/identity";
import { fr } from "@/lib/i18n/fr";

const t = fr.auth.errors;

export const PASSWORD_MIN = 8;
// Supabase Auth hashes with bcrypt, which ignores everything beyond 72 bytes.
export const PASSWORD_MAX = 72;

const email = z
  .string({ required_error: t.emailRequired })
  .trim()
  .toLowerCase()
  .min(1, t.emailRequired)
  .max(254, t.emailInvalid)
  .email(t.emailInvalid);

const newPassword = z
  .string({ required_error: t.passwordRequired })
  .min(PASSWORD_MIN, t.passwordTooShort)
  // Bytes, not characters: « é » takes two.
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX, t.passwordTooLong);

/** Destination after the form (validated again by safeNextPath); never blocks it. */
const next = z.string().max(512).optional().catch(undefined);

/** Ticked HTML checkbox: FormData gives "on", nothing when unticked. */
const accepted = z.literal("on", { errorMap: () => ({ message: t.termsRequired }) });

export const signUpSchema = z.object({
  role: z.enum(["seller", "buyer"], { errorMap: () => ({ message: t.roleRequired }) }),
  fullName: z
    .string({ required_error: t.nameRequired })
    .trim()
    .min(2, t.nameRequired)
    .max(160, t.nameTooLong)
    .refine((value) => {
      const { firstName, lastName } = splitFullName(value);
      return firstName.length <= 80 && (lastName ?? "").length <= 80;
    }, t.nameTooLong),
  email,
  phone: z
    .string()
    .trim()
    .max(30, t.phoneInvalid)
    .regex(/^$|^\+?[0-9][0-9 .()-]{5,28}$/, t.phoneInvalid)
    .optional(),
  password: newPassword,
  acceptTerms: accepted,
  next,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email,
  password: z.string({ required_error: t.passwordRequired }).min(1, t.passwordRequired),
  next,
});

export const forgotPasswordSchema = z.object({ email });

export const resendSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: t.passwordMismatch,
  });

export const acceptTermsSchema = z.object({ acceptTerms: accepted, next });

/** Hidden fields of /confirmation, copied from the link of the email. */
export const confirmLinkSchema = z.object({
  token_hash: z.string().regex(/^[A-Za-z0-9_-]{1,512}$/),
  type: z.enum(["email", "signup", "recovery", "email_change"]),
});

/** First message of each invalid field, keyed by field name. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}
