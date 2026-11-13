import "server-only";
import type { FinancingStatus } from "@/components/shared/financing-badge";
import { createClient } from "@/lib/supabase/server";
import type { BuyerProject, FinancingDocumentType } from "@/lib/validations/buyer";

// The buying project of the signed-in buyer (L1-25, SPEC-V2 8.9), with their
// session: RLS shows them their own row only (buyer_profiles_select_self_or_admin).
// A seller never reads this table: buyer_summary_for_seller() gives them the
// status and the project, never the amounts.

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

/** The proof of financing in force (L2-02): never its file, read by its own route. */
export type FinancingDocumentView = {
  id: string;
  type: FinancingDocumentType;
  /** The date written on the document, YYYY-MM-DD. */
  documentDate: string;
  isPdf: boolean;
  createdAt: string;
};

export type BuyerProfile = {
  project: BuyerProject | null;
  targetCities: string[];
  budgetMaxEuros: number | null;
  downPaymentEuros: number | null;
  loanNeeded: boolean | null;
  loanAmountEuros: number | null;
  situationNote: string;
  financingStatus: FinancingStatus;
  /** The document in force, null without one. */
  financingDocument: FinancingDocumentView | null;
  /** When Leenkey checked it (« Contrôlé par Leenkey le … »). */
  financingCheckedAt: string | null;
};

const euros = (cents: number | null) => (cents === null ? null : Math.round(cents / 100));

/** Their buying project; null for an account that never bought (no row yet). */
export async function buyerProfile(profileId: string): Promise<QueryResult<BuyerProfile | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("buyer_profiles")
    .select(
      "project, target_cities, budget_max_cents, down_payment_cents, loan_needed, loan_amount_cents, situation_note, financing_status, financing_checked_at, document:financing_documents!buyer_profiles_current_doc_fk(id, type, document_date, mime_type, created_at, deleted_at)",
    )
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) {
    console.error("[buyers] profile read failed", { user_id: profileId, code: error.code });
    return { ok: false, error: "unavailable" };
  }
  if (!data) return { ok: true, data: null };
  const document = data.document && !data.document.deleted_at ? data.document : null;
  return {
    ok: true,
    data: {
      project: data.project,
      targetCities: data.target_cities ?? [],
      budgetMaxEuros: euros(data.budget_max_cents),
      downPaymentEuros: euros(data.down_payment_cents),
      loanNeeded: data.loan_needed,
      loanAmountEuros: euros(data.loan_amount_cents),
      situationNote: data.situation_note ?? "",
      financingStatus: data.financing_status,
      financingDocument: document
        ? {
            id: document.id,
            type: document.type,
            documentDate: document.document_date,
            isPdf: document.mime_type === "application/pdf",
            createdAt: document.created_at,
          }
        : null,
      financingCheckedAt: data.financing_checked_at,
    },
  };
}
