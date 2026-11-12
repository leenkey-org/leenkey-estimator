// The messages of the log of the assistant as the team reads them on
// /admin/assistant (L1-30d). Pure: unit tested.

/** The text of a stored message (core/ai/log.ts), whatever its shape. */
export function entryText(role: string, content: unknown): { text: string; request: boolean } {
  if (!content || typeof content !== "object") return { text: "", request: false };
  const value = content as Record<string, unknown>;
  if (role === "user") {
    return {
      text: typeof value.text === "string" ? value.text : "",
      request: value.type === "request",
    };
  }
  if (role === "assistant") {
    const blocks = Array.isArray(value.blocks) ? value.blocks : [];
    const parts = blocks.flatMap((block: unknown) => {
      if (!block || typeof block !== "object") return [];
      const b = block as Record<string, unknown>;
      if (b.type === "text" && typeof b.text === "string") return [b.text];
      if (b.type === "tool_use" && typeof b.name === "string") return [`→ ${b.name}`];
      return [];
    });
    return { text: parts.join("\n\n"), request: false };
  }
  const name = typeof value.name === "string" ? value.name : "outil";
  const status = typeof value.status === "string" ? value.status : "";
  return { text: [name, status].filter(Boolean).join(" · "), request: false };
}
