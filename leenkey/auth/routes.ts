// Leenkey's signed-in areas (SPEC section 3, « Routes applicatives »): where
// each role lands, and which paths need a session. core/auth stays generic.

/** Home of a signed-in user, by role (an account can be seller and buyer). */
export function homePathForRoles(roles: readonly string[] | null | undefined): string {
  if (!roles) return "/";
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("seller")) return "/vendeur";
  if (roles.includes("buyer")) return "/acquereur";
  return "/";
}

/** Routes reserved to signed-in users. */
export const PROTECTED_PREFIXES = [
  "/vendeur",
  "/acquereur",
  "/messages",
  "/offres",
  "/visites",
  "/assistant",
  "/compte",
  "/admin",
  "/conditions",
];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
