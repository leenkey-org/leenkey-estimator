import type { z } from "zod";

// A tool of the assistant (CLAUDE.md section 8, SPEC-V2 section 12): its
// schema, its description for the model, its contexts, whether the person
// confirms it first (every tool that writes), and its execution, always with
// the session of the person (lib/supabase/server: RLS), never the service
// role.

export type AiContext = "seller" | "buyer" | "admin";

export type ToolContext = {
  profileId: string;
  context: AiContext;
  /** The step of the sale being talked about, when there is one. */
  stepCode: string | null;
};

export type AiTool<Input, Output> = {
  name: string;
  description: string;
  input: z.ZodType<Input>;
  requiresConfirmation: boolean;
  contexts: readonly AiContext[];
  execute(input: Input, ctx: ToolContext): Promise<Output>;
};
