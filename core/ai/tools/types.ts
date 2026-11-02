import type { z } from "zod";

// A tool of the assistant (CLAUDE.md section 8, SPEC-V2 section 12): its
// schema, its description for the model, its contexts, whether the person
// confirms it first (every tool that writes), and its execution, always with
// the session of the person (lib/supabase/server: RLS), never the service
// role.

export type AiContext = "seller" | "buyer" | "admin";

export type ToolContext = {
  profileId: string;
  /** The roles of the person (a tool that calls the model counts it against their daily limit). */
  roles: readonly string[];
  context: AiContext;
  /** The step of the sale being talked about, when there is one. */
  stepCode: string | null;
  /**
   * The call the person confirmed (a tool that writes, run by the action of
   * confirmation): the tool writes its result in the log with its change, in
   * one transaction, so that a call is answered once. Absent: nothing written.
   */
  call?: { conversationId: string; toolUseId: string; name: string };
};

/**
 * The input as the model sees it (JSON Schema, strict: every property
 * required, nothing else). Written next to the Zod schema, which stays the
 * check before any execution (tests/unit/ai: both name the same fields).
 */
export type ToolInputSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
};

/** What a tool to confirm will do, shown before the person confirms (ConfirmActionCard). */
export type ToolPreview<Preview> = { ok: true; data: Preview } | { ok: false; error: string };

export type AiTool<Input, Output, Preview = never> = {
  name: string;
  description: string;
  input: z.ZodType<Input>;
  /** Absent: the tool is not offered to the model (search_knowledge, Q69). */
  inputSchema?: ToolInputSchema;
  requiresConfirmation: boolean;
  contexts: readonly AiContext[];
  /** Tools to confirm: the change, before and after, read with the session of the person. */
  preview?(input: Input, ctx: ToolContext): Promise<ToolPreview<Preview>>;
  execute(input: Input, ctx: ToolContext): Promise<Output>;
};

/**
 * Any tool of a registry (methods take their parameters bivariantly): the
 * loop gives execute only what the Zod schema of the tool accepted.
 */
export type AnyAiTool = AiTool<unknown, unknown, unknown>;
