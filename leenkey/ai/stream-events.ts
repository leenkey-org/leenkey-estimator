import { z } from "zod";

// The events of /api/ai/chat as the browser reads them (core/ai/chat.ts
// writes them): checked, whatever arrives.

export const streamEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("conversation"), id: z.string().uuid() }),
  z.object({ type: z.literal("text"), delta: z.string() }),
  z.object({ type: z.literal("tool"), name: z.string() }),
  z.object({
    type: z.literal("confirm"),
    toolCallId: z.string(),
    name: z.string(),
    preview: z.unknown(),
  }),
  z.object({ type: z.literal("done"), reason: z.string() }),
  z.object({ type: z.literal("error"), error: z.string() }),
]);

export type StreamEvent = z.infer<typeof streamEvent>;

/** The events of a chunk of the stream (« data: {…} » blocks); the rest waits for the next chunk. */
export function readEvents(buffer: string): { events: StreamEvent[]; rest: string } {
  const events: StreamEvent[] = [];
  const blocks = buffer.split("\n\n");
  const rest = blocks.pop() ?? "";
  for (const block of blocks) {
    const line = block.split("\n").find((candidate) => candidate.startsWith("data: "));
    if (!line) continue;
    try {
      const parsed = streamEvent.safeParse(JSON.parse(line.slice(6)));
      if (parsed.success) events.push(parsed.data);
    } catch {
      // Not JSON: skipped.
    }
  }
  return { events, rest };
}
