/**
 * The grid of the results, shared with the blocks that stand for the next
 * ones (load-more.tsx), in a module both the server and the client read. Rows further apart than the columns: without a
 * frame, the space tells which text belongs to which photo.
 */
export const RESULTS_GRID =
  "grid gap-x-4 gap-y-7 md:grid-cols-2 lg:gap-x-6 lg:gap-y-8 2xl:grid-cols-3";
