import { z } from "zod";

// A task of a sale ticked (or unticked) by hand by its seller (L1-24): the
// task of the plan of the sale, without event, where the seller acts (RLS).

export const saleTaskSchema = z.object({
  propertyId: z.string().uuid(),
  taskId: z.string().uuid(),
  done: z.boolean(),
});

export type SaleTaskInput = z.infer<typeof saleTaskSchema>;
