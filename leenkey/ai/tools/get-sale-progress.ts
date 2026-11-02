import "server-only";
import type { AiTool } from "@/core/ai/tools/types";
import { saleProgress } from "@/leenkey/properties/sale";
import { activePlans } from "@/core/billing/plans";
import { PROPERTY_NOT_FOUND, planSummary, sellerPropertyById } from "../seller-data";
import { propertyInput, propertyInputSchema, type PropertyInput } from "./shared";

// get_sale_progress (SPEC-V2 sections 9 and 12): the steps of the sale of a
// property, the current one, the tasks done and to do, and who does each.

const WHO: Record<string, string> = {
  seller: "the seller",
  leenkey: "Leenkey",
  both: "the seller or Leenkey",
};

export const getSaleProgressTool: AiTool<PropertyInput, unknown> = {
  name: "get_sale_progress",
  description:
    "Read the sale of one property of the seller: its plan, every step in order with its tasks " +
    "(done or not, required or not, who does it, ticked by an event or by hand) and the current step.",
  input: propertyInput,
  inputSchema: propertyInputSchema,
  requiresConfirmation: false,
  contexts: ["seller"],
  async execute({ propertyId }, ctx) {
    const found = await sellerPropertyById(ctx.profileId, propertyId);
    if (!found.ok) return { error: "unavailable" };
    if (!found.data) return { error: PROPERTY_NOT_FOUND };
    const [progress, plans] = await Promise.all([saleProgress(propertyId), activePlans()]);
    if (!progress.ok) return { error: "unavailable" };
    if (!progress.data) return { error: "This property has no sale in progress yet." };
    const { steps, currentStepCode, template } = progress.data;
    return {
      plan: planSummary(template, plans),
      currentStep: steps.findIndex((step) => step.code === currentStepCode) + 1,
      totalSteps: steps.length,
      steps: steps.map((step, index) => ({
        position: index + 1,
        title: step.title,
        purpose: step.description,
        current: step.code === currentStepCode,
        tasks: step.tasks.map((task) => ({
          title: task.title,
          done: task.doneAt !== null,
          required: task.required,
          by: WHO[task.owner] ?? task.owner,
          tickedBy: task.autoTrigger ? "an event of the platform" : "hand",
        })),
      })),
    };
  },
};
