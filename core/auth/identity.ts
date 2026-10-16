// Pure helpers of the signup form (no network, testable).

/**
 * The signup form has one "Prénom et nom" field (docs/DESIGN.md 12.1): the
 * first word is the first name (shown to the other party), the rest the last
 * name. Both stay editable in the account settings.
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string | null } {
  const [firstName = "", ...rest] = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstName, lastName: rest.length > 0 ? rest.join(" ") : null };
}

export type PasswordStrength = "weak" | "fair" | "strong";

/** Discreet indicator under the password field (SPEC 8.2). */
export function passwordStrength(password: string): PasswordStrength | null {
  if (!password) return null;
  if (password.length < 8) return "weak";
  const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((kind) =>
    kind.test(password),
  ).length;
  if (password.length >= 12 && kinds >= 3) return "strong";
  if (password.length >= 12 || kinds >= 3) return "fair";
  return "weak";
}
