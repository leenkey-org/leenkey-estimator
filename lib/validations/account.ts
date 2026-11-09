import { z } from "zod";
import { fr } from "@/lib/i18n/fr";
import { emailField, newPasswordField, phoneField } from "./auth";

// « Mon compte » (L1-39, SPEC-V2 8.14): the forms of its pages.

const t = fr.account;

const name = z.string().trim().max(80, t.identity.errors.tooLong);

export const identitySchema = z.object({
  firstName: name.min(1, t.identity.errors.firstNameRequired),
  lastName: name,
  phone: phoneField,
});
export type IdentityInput = z.infer<typeof identitySchema>;

export const emailChangeSchema = z.object({ email: emailField });

export const passwordChangeSchema = z
  .object({
    current: z
      .string({ required_error: t.password.errors.currentRequired })
      .min(1, t.password.errors.currentRequired),
    password: newPasswordField,
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: fr.auth.errors.passwordMismatch,
  })
  .refine((value) => value.password !== value.current, {
    path: ["password"],
    message: fr.auth.errors.passwordSame,
  });

/** The roles a person adds to their account (never « admin »). */
export const addRoleSchema = z.enum(["seller", "buyer"]);
export type AddableRole = z.infer<typeof addRoleSchema>;
