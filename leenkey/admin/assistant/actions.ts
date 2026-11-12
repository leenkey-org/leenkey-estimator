"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { searchKnowledge, type KnowledgeCard } from "@/core/ai/knowledge";
import { createClient } from "@/lib/supabase/server";
import { knowledgeImportSchema, knowledgeSearchSchema } from "@/lib/validations/admin-assistant";
import { knowledgeFileName, parseKnowledgeFile } from "./knowledge-file";

// Server actions of /admin/assistant (L1-30d, SPEC-V2 17): the test search
// of the FAQ, the import of a file of the FAQ (SQL admin_knowledge_import,
// security definer: is_admin(), audit_log) and the embeddings of the cards
// that have none (Edge Function `embed`, with the admin's session, as
// scripts/kb-embed.mjs does it). No service role.

type ActionError = "auth" | "invalid" | "unavailable";

export type KnowledgeSearchResult =
  | { ok: true; data: KnowledgeCard[] }
  | { ok: false; error: ActionError };

export async function testKnowledgeSearch(input: unknown): Promise<KnowledgeSearchResult> {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "auth" };
  const parsed = knowledgeSearchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const result = await searchKnowledge({
    query: parsed.data.query,
    audience: parsed.data.audience,
  });
  return result.ok ? result : { ok: false, error: result.error };
}

/** The embeddings computed and those still missing (a later call goes on). */
export type EmbedProgress = { embedded: number; remaining: boolean };

/**
 * One call of `embed` computes 8 cards; the model loads on the first one (up
 * to a minute when the function is cold). Calls follow each other for 40 s at
 * most: the page says what remains, the team asks again.
 */
async function embedMissing(): Promise<EmbedProgress | null> {
  const supabase = await createClient();
  const started = Date.now();
  let embedded = 0;
  for (;;) {
    const { data, error } = await supabase.functions.invoke<{
      updated?: number;
      remaining?: boolean;
    }>("embed", { body: { reindex: true }, timeout: 90_000 });
    if (error || typeof data?.updated !== "number") {
      console.error("[admin] knowledge embedding failed", { error: error?.name ?? "response" });
      return embedded > 0 ? { embedded, remaining: true } : null;
    }
    embedded += data.updated;
    if (!data.remaining) return { embedded, remaining: false };
    if (data.updated === 0 || Date.now() - started > 40_000) return { embedded, remaining: true };
  }
}

export type KnowledgeImportResult =
  | {
      ok: true;
      data: {
        fileName: string;
        inserted: number;
        updated: number;
        removed: number;
        unchanged: number;
        /** null: the embeddings could not be computed now. */
        embedding: EmbedProgress | null;
      };
    }
  | { ok: false; error: ActionError | "empty" | "metadata" | "fileName"; question?: string };

export async function importKnowledgeFile(input: unknown): Promise<KnowledgeImportResult> {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "auth" };
  const parsed = knowledgeImportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const fileName = knowledgeFileName(parsed.data.fileName);
  if (!fileName) return { ok: false, error: "fileName" };
  const file = parseKnowledgeFile(parsed.data.content);
  if (!file.ok) return { ok: false, error: file.error, question: file.question };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_knowledge_import", {
    p_source_file: fileName,
    p_cards: file.cards,
  });
  if (error || !data[0]) {
    console.error("[admin] knowledge import failed", {
      user_id: profile.id,
      code: error?.code,
    });
    // 22023: a card the base refuses (too long, an unknown audience, twice).
    return { ok: false, error: error?.code === "22023" ? "invalid" : "unavailable" };
  }
  const counts = data[0];
  const embedding = await embedMissing();
  revalidatePath("/admin/assistant");
  return {
    ok: true,
    data: {
      fileName,
      inserted: counts.inserted,
      updated: counts.updated,
      removed: counts.removed,
      unchanged: counts.unchanged,
      embedding,
    },
  };
}

export type EmbedResult = { ok: true; data: EmbedProgress } | { ok: false; error: ActionError };

/** « Calculer les embeddings manquants »: what an import left to do. */
export async function embedKnowledge(): Promise<EmbedResult> {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "auth" };
  const progress = await embedMissing();
  revalidatePath("/admin/assistant");
  return progress ? { ok: true, data: progress } : { ok: false, error: "unavailable" };
}
