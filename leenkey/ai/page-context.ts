import type { AssistantContext } from "@/lib/validations/assistant";

// Which assistant the page /assistant opens (L2-06): the buyer's when the
// address asks for it (a listing being read, « ?contexte=acquereur ») and
// the account buys; otherwise the seller's for an account that sells, the
// buyer's for one that only buys. Null: the account has neither role.

export function assistantPageContext(
  roles: readonly string[],
  asked: { listing: boolean; buyer: boolean },
): AssistantContext | null {
  const sells = roles.includes("seller");
  const buys = roles.includes("buyer");
  if (buys && (asked.listing || asked.buyer || !sells)) return "buyer";
  return sells ? "seller" : null;
}
