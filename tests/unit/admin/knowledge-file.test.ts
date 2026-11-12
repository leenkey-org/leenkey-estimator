import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { knowledgeFileName, parseKnowledgeFile } from "@/leenkey/admin/assistant/knowledge-file";

describe("parseKnowledgeFile", () => {
  it("reads the cards as the seed script does", () => {
    const result = parseKnowledgeFile(
      [
        "# FAQ",
        "",
        "## Comment fixer mon prix ?",
        "<!-- audience: seller | category: Prix | step_code: price -->",
        "Partez de l'analyse de valeur.",
        "",
        "Puis ajustez.",
        "## Puis-je visiter ?\r",
        "<!-- audience: buyer | category: Visites -->",
        "Oui, sur invitation.",
      ].join("\n"),
    );
    expect(result).toEqual({
      ok: true,
      cards: [
        {
          audience: "seller",
          category: "Prix",
          step_code: "price",
          question: "Comment fixer mon prix ?",
          answer: "Partez de l'analyse de valeur.\n\nPuis ajustez.",
        },
        {
          audience: "buyer",
          category: "Visites",
          step_code: null,
          question: "Puis-je visiter ?",
          answer: "Oui, sur invitation.",
        },
      ],
    });
  });

  it("a card without its metadata, or a file without a card, is refused", () => {
    expect(parseKnowledgeFile("## Question ?\nRéponse.")).toEqual({
      ok: false,
      error: "metadata",
      question: "Question ?",
    });
    expect(parseKnowledgeFile("Rien ici.")).toEqual({ ok: false, error: "empty" });
  });

  it("the FAQ of the client reads whole", () => {
    const result = parseKnowledgeFile(
      readFileSync("supabase/seed/knowledge/faq-cedric-v2.md", "utf8"),
    );
    expect(result.ok && result.cards.length).toBe(73);
  });
});

describe("knowledgeFileName", () => {
  it("a name the base accepts", () => {
    expect(knowledgeFileName("FAQ Cédric v2.md")).toBe("faq-cedric-v2.md");
    expect(knowledgeFileName("../../etc/passwd")).toBe("etc-passwd.md");
    expect(knowledgeFileName("***.md")).toBeNull();
  });
});
