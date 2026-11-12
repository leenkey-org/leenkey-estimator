// A file of the FAQ as the team imports it from /admin/assistant (L1-30d),
// in the format of supabase/seed/knowledge/*.md read by
// scripts/seed-knowledge.mjs: a card is « ## <question> », then
// « <!-- audience: x | category: y | step_code: z --> » on the next line,
// then its answer until the next « ## ». Pure: unit tested; the base checks
// the cards again (admin_knowledge_import).

export type KnowledgeFileCard = {
  audience: string;
  category: string;
  step_code: string | null;
  question: string;
  answer: string;
};

export type KnowledgeFileResult =
  | { ok: true; cards: KnowledgeFileCard[] }
  | { ok: false; error: "empty" | "metadata"; question?: string };

export function parseKnowledgeFile(text: string): KnowledgeFileResult {
  const cards: { question: string; meta: Record<string, string> | null; body: string[] }[] = [];
  let current: (typeof cards)[number] | null = null;
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (line.startsWith("## ")) {
      current = { question: line.slice(3).trim(), meta: null, body: [] };
      cards.push(current);
    } else if (current && current.meta === null && line.trim().startsWith("<!--")) {
      const meta: Record<string, string> = {};
      for (const part of line.replace(/<!--|-->/g, "").split("|")) {
        const [key, ...rest] = part.split(":");
        if (key && rest.length) meta[key.trim()] = rest.join(":").trim();
      }
      current.meta = meta;
    } else if (current) {
      current.body.push(line);
    }
  }
  if (cards.length === 0) return { ok: false, error: "empty" };
  const result: KnowledgeFileCard[] = [];
  for (const card of cards) {
    if (!card.meta?.audience || !card.meta.category) {
      return { ok: false, error: "metadata", question: card.question };
    }
    result.push({
      audience: card.meta.audience,
      category: card.meta.category,
      step_code: card.meta.step_code || null,
      question: card.question,
      answer: card.body.join("\n").trim(),
    });
  }
  return { ok: true, cards: result };
}

/** « FAQ Cédric v2.md » → « faq-cedric-v2.md »: the name the base accepts. */
export function knowledgeFileName(name: string): string | null {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\.md$/, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, 78);
  return base ? `${base}.md` : null;
}
