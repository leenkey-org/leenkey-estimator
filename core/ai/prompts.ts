import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { FaqCard } from "./knowledge";
import type { AiContext } from "./tools/types";

// The prompts of the assistant (CLAUDE.md section 8, SPEC-V2 section 12):
// versioned files in core/ai/prompts/, never in a component. base.md for
// every context, then the file of the context. The system prompt ends with
// the FAQ of the audience (Q69, option a): read whole by the model, it misses
// no card. The same bytes at each call while the FAQ does not change: the
// prompt is cached (core/ai/chat.ts).

const DIR = join(process.cwd(), "core", "ai", "prompts");
const files = new Map<string, string>();

/** A prompt file, read once per server instance. */
export function promptFile(name: string): string {
  let text = files.get(name);
  if (text === undefined) {
    text = readFileSync(join(DIR, `${name}.md`), "utf8").trim();
    files.set(name, text);
  }
  return text;
}

/** The FAQ, card after card, in the order of the database (category, question). */
export function faqSection(cards: readonly FaqCard[]): string {
  const lines = [
    "# FAQ de Leenkey",
    "",
    "Fiches rédigées par l'équipe de Leenkey. Chacune a une catégorie et, parfois, l'étape de la vente qu'elle concerne.",
  ];
  for (const card of cards) {
    const step = card.stepCode ? ` etape="${card.stepCode}"` : "";
    lines.push(
      "",
      `<fiche categorie="${card.category}"${step}>`,
      `Question : ${card.question.trim()}`,
      `Réponse : ${card.answer.trim()}`,
      "</fiche>",
    );
  }
  return lines.join("\n");
}

/** The system prompt of a context: its rules, then the FAQ of its audience. */
export function systemPrompt(context: AiContext, cards: readonly FaqCard[]): string {
  return [promptFile("base"), promptFile(context), faqSection(cards)].join("\n\n");
}
