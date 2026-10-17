// Errors of the decisions of the back office (L1-19), from the SQLSTATE
// raised by the status functions of L1-04 (listing_publish, listing_reject,
// listing_suspend, listing_unsuspend).

export type ModerationError = "invalid" | "forbidden" | "not_found" | "conflict" | "unavailable";

export function moderationError(code: string | undefined): ModerationError {
  if (code === "42501") return "forbidden";
  if (code === "P0002") return "not_found";
  // 22023: a transition refused, so the listing changed status since the page
  // was shown. Also a motive too short, which Zod refuses before (reasonLength).
  if (code === "22023") return "conflict";
  return "unavailable";
}
