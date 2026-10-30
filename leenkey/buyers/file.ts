import type { BuyerProfile } from "./queries";

// The file of a buyer on their home (L1-25, SPEC-V2 8.9, DESIGN.md 12.10):
// what makes a seller answer them. Lot 1: their project and their financing
// declared; the proof of financing comes with L2-02, its line with it.

export type FileStep = { key: "project" | "financing"; done: boolean };

export type BuyerFile = {
  steps: FileStep[];
  done: number;
  total: number;
  /** All done: the block goes after the useful content, as an edit link. */
  complete: boolean;
};

export function buyerFile(profile: BuyerProfile | null): BuyerFile {
  const steps: FileStep[] = [
    {
      key: "project",
      done: Boolean(profile?.project) && (profile?.targetCities.length ?? 0) > 0,
    },
    { key: "financing", done: profile !== null && profile.financingStatus !== "not_provided" },
  ];
  const done = steps.filter((step) => step.done).length;
  return { steps, done, total: steps.length, complete: done === steps.length };
}
