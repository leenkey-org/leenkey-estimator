"use client";

import { useEffect } from "react";
import { markSaleFileSeen } from "../actions";

/**
 * Once the tab « Documents » is shown, its seller has seen the documents to
 * prepare and the diagnostics of their property (L3-07b): the two tasks of
 * the step are ticked. Nothing is shown; a failure changes nothing on the
 * page (the tasks stay to do, ticked the next time).
 */
export function SaleFileSeen({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    void markSaleFileSeen(propertyId);
  }, [propertyId]);
  return null;
}
